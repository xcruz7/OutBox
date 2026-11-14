import { prisma } from '../config/database.js';
import { emailQueue, enqueueEmailJob } from '../queues/emailQueue.js';

export async function reconcileScheduledJobs(): Promise<{
  totalChecked: number;
  reEnqueued: number;
  alreadyPresent: number;
  overdueProcessed: number;
}> {
  console.log('[Recovery] Starting BullMQ & MySQL startup reconciliation...');

  const pendingEmails = await prisma.email.findMany({
    where: {
      status: { in: ['SCHEDULED', 'PENDING'] },
    },
  });

  let reEnqueued = 0;
  let alreadyPresent = 0;
  let overdueProcessed = 0;

  const now = Date.now();

  for (const email of pendingEmails) {
    const expectedJobId = `email-job-${email.id}`;

    try {
      const existingJob = await emailQueue.getJob(expectedJobId);

      if (existingJob) {
        const state = await existingJob.getState();

        if (state === 'completed') {
          // Job finished but DB wasn't updated
          await prisma.email.update({
            where: { id: email.id },
            data: { status: 'SENT', sentAt: new Date(existingJob.finishedOn || now) },
          });
          continue;
        }

        if (state === 'delayed' || state === 'waiting' || state === 'active') {
          alreadyPresent++;
          continue;
        }
      }

      // Job is not in queue (or failed/missing from Redis)
      const targetTime = email.scheduledAt.getTime();
      const delayMs = targetTime - now;

      if (delayMs <= 0) {
        // Overdue during downtime - queue immediately
        console.log(`[Recovery] Email ${email.id} scheduled for ${email.scheduledAt.toISOString()} is overdue. Dispatching immediately.`);
        overdueProcessed++;
        await enqueueEmailJob(email.id, email.userId, 0);
      } else {
        // Still in future - restore delayed job
        console.log(`[Recovery] Restoring missing queue job for email ${email.id} (remaining delay: ${Math.round(delayMs / 1000)}s)`);
        reEnqueued++;
        await enqueueEmailJob(email.id, email.userId, delayMs);
      }

      // Ensure DB status is set to SCHEDULED with confirmed jobId
      await prisma.email.update({
        where: { id: email.id },
        data: {
          status: 'SCHEDULED',
          jobId: expectedJobId,
        },
      });
    } catch (err) {
      console.error(`[Recovery] Error reconciling email ${email.id}:`, err);
    }
  }

  const summary = {
    totalChecked: pendingEmails.length,
    reEnqueued,
    alreadyPresent,
    overdueProcessed,
  };

  console.log(`[Recovery] Reconciliation finished:`, summary);
  return summary;
}
