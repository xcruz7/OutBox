import { Worker, Job } from 'bullmq';
import { prisma, connectDB } from '../config/database.js';
import { redisConnectionOptions } from '../config/redis.js';
import { getEmailTransporter, getEmailPreviewUrl } from '../config/email.js';
import { ENV } from '../config/env.js';
import { EMAIL_QUEUE_NAME } from '../queues/emailQueue.js';
import { SendEmailJobData } from '../types/index.js';

console.log('----------------------------------------------------');
console.log('   Outbox Labs Email Worker Process Starting');
console.log(`   Worker Concurrency : ${ENV.WORKER_CONCURRENCY}`);
console.log(`   Rate Limiter Max   : ${ENV.EMAIL_RATE_LIMIT_MAX} emails / ${ENV.EMAIL_RATE_LIMIT_DURATION_MS}ms`);
console.log('----------------------------------------------------');

async function processEmailJob(job: Job<SendEmailJobData>): Promise<void> {
  const { emailId } = job.data;
  const startedAt = Date.now();
  console.log(`[Worker] Picked up Job ID ${job.id} for Email ID ${emailId} at ${new Date().toISOString()}`);

  // Step 1: Atomic Idempotency Check & Claim
  // Only transition if status is still SCHEDULED or PENDING
  const updateResult = await prisma.email.updateMany({
    where: {
      id: emailId,
      status: { in: ['SCHEDULED', 'PENDING'] },
    },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
    },
  });

  if (updateResult.count === 0) {
    console.warn(`[Worker] Email ${emailId} already claimed, sent, or cancelled. Skipping.`);
    return;
  }

  // Step 2: Fetch Email Details
  const email = await prisma.email.findUnique({
    where: { id: emailId },
  });

  if (!email) {
    console.error(`[Worker] Email record not found for ID ${emailId}`);
    return;
  }

  try {
    // Step 3: Dispatch via Nodemailer (Ethereal Transport)
    const { transporter, user } = await getEmailTransporter();

    const info = await transporter.sendMail({
      from: `"Outbox Labs Scheduler" <${user}>`,
      to: email.recipient,
      subject: email.subject,
      text: email.body,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">${email.subject}</h2>
          <div style="color: #334155; line-height: 1.6; white-space: pre-wrap;">${email.body}</div>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">
            Sent by Outbox Labs Email Scheduler &bull; Message ID: ${email.id} &bull; Processed in ${Date.now() - startedAt}ms
          </p>
        </div>
      `,
    });

    const previewUrl = getEmailPreviewUrl(info);

    console.log(`[Worker] Email ${emailId} successfully sent!`);
    console.log(`[Worker] Message ID: ${info.messageId}`);
    if (previewUrl) {
      console.log(`[Worker] Ethereal Preview URL: ${previewUrl}`);
    }

    // Step 4: Update MySQL State to SENT
    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        errorMessage: null,
        etherealMessageId: info.messageId,
        etherealPreviewUrl: previewUrl ? String(previewUrl) : null,
      },
    });
  } catch (error: any) {
    console.error(`[Worker] Failed to dispatch email ${emailId}:`, error);

    const isLastAttempt = (job.attemptsMade + 1) >= (email.maxAttempts || 3);

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: isLastAttempt ? 'FAILED' : 'SCHEDULED', // reset to SCHEDULED if BullMQ will retry
        errorMessage: error?.message || 'SMTP transmission failure',
      },
    });

    throw error; // Re-throw so BullMQ initiates backoff retry
  }
}

export const emailWorker = new Worker<SendEmailJobData>(
  EMAIL_QUEUE_NAME,
  processEmailJob,
  {
    connection: redisConnectionOptions,
    concurrency: ENV.WORKER_CONCURRENCY,
    limiter: {
      max: ENV.EMAIL_RATE_LIMIT_MAX,
      duration: ENV.EMAIL_RATE_LIMIT_DURATION_MS,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Worker Event] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Event] Job ${job?.id} failed with error: ${err.message}`);
});

emailWorker.on('error', (err) => {
  console.error('[Worker Event] Worker encountered an error:', err);
});

// Initialize DB and Ethereal connection
async function startWorker() {
  try {
    await connectDB();
    await getEmailTransporter();
    console.log('[Worker] Worker process is listening for scheduled email jobs...');
  } catch (err) {
    console.error('[Worker] Fatal error starting worker:', err);
    process.exit(1);
  }
}

startWorker();

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`[Worker] Received ${signal}. Closing worker gracefully...`);
  try {
    await emailWorker.close();
    await prisma.$disconnect();
    console.log('[Worker] Graceful shutdown completed.');
    process.exit(0);
  } catch (err) {
    console.error('[Worker] Error during shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
