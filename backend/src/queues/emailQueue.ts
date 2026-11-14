import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../config/redis.js';
import { SendEmailJobData } from '../types/index.js';

export const EMAIL_QUEUE_NAME = 'email-dispatch-queue';

export const emailQueue = new Queue<SendEmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s, 10s, 20s
    },
    removeOnComplete: {
      age: 24 * 3600, // keep completed jobs for 24h
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed jobs for 7 days
    },
  },
});

export async function enqueueEmailJob(
  emailId: string,
  userId: string,
  delayMs: number
): Promise<string> {
  const deterministicJobId = `email-job-${emailId}`;

  const job = await emailQueue.add(
    'sendEmail',
    { emailId, userId },
    {
      jobId: deterministicJobId,
      delay: Math.max(0, delayMs),
    }
  );

  return job.id || deterministicJobId;
}

export async function removeEmailJob(jobId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Queue] Failed to remove job ${jobId}:`, error);
    return false;
  }
}
