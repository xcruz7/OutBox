import { prisma } from '../config/database.js';
import { enqueueEmailJob, removeEmailJob } from '../queues/emailQueue.js';
import { ScheduleEmailInput } from '../types/index.js';

export async function scheduleEmail(userId: string, input: ScheduleEmailInput) {
  const { recipient, subject, body, scheduledAt } = input;

  const targetDate = new Date(scheduledAt);
  const now = new Date();

  if (isNaN(targetDate.getTime())) {
    const error = new Error('Invalid scheduledAt timestamp.');
    (error as any).statusCode = 400;
    throw error;
  }

  // Must be in the future (minimum 5 seconds buffer to account for network latency)
  if (targetDate.getTime() <= now.getTime()) {
    const error = new Error('Scheduled time must be in the future.');
    (error as any).statusCode = 400;
    throw error;
  }

  const delayMs = targetDate.getTime() - now.getTime();

  // 1. Database-first persistence (ACID source of truth)
  const email = await prisma.email.create({
    data: {
      userId,
      recipient: recipient.trim().toLowerCase(),
      subject: subject.trim(),
      body,
      scheduledAt: targetDate,
      status: 'SCHEDULED',
    },
  });

  // 2. Submit delayed job to BullMQ queue
  try {
    const jobId = await enqueueEmailJob(email.id, userId, delayMs);

    // Update with confirmed BullMQ jobId
    const updatedEmail = await prisma.email.update({
      where: { id: email.id },
      data: { jobId },
    });

    return updatedEmail;
  } catch (queueError) {
    console.error(`[EmailService] Failed to enqueue job for email ${email.id}:`, queueError);
    // Mark as PENDING so startup recovery can re-enqueue
    await prisma.email.update({
      where: { id: email.id },
      data: { status: 'PENDING' },
    });
    throw new Error('Email saved, but queue dispatch failed. Scheduled recovery will retry.');
  }
}

export async function getScheduledEmails(userId: string) {
  return prisma.email.findMany({
    where: {
      userId,
      status: {
        in: ['SCHEDULED', 'PENDING'],
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });
}

export async function getSentEmails(userId: string) {
  return prisma.email.findMany({
    where: {
      userId,
      status: 'SENT',
    },
    orderBy: {
      sentAt: 'desc',
    },
  });
}

export async function getEmailById(userId: string, emailId: string) {
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      userId,
    },
  });

  if (!email) {
    const error = new Error('Email not found.');
    (error as any).statusCode = 404;
    throw error;
  }

  return email;
}

export async function cancelScheduledEmail(userId: string, emailId: string) {
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      userId,
    },
  });

  if (!email) {
    const error = new Error('Email not found.');
    (error as any).statusCode = 404;
    throw error;
  }

  if (email.status !== 'SCHEDULED' && email.status !== 'PENDING') {
    const error = new Error(`Cannot cancel an email that is already ${email.status}.`);
    (error as any).statusCode = 400;
    throw error;
  }

  // Remove from BullMQ if jobId exists
  if (email.jobId) {
    await removeEmailJob(email.jobId);
  }

  return prisma.email.update({
    where: { id: emailId },
    data: {
      status: 'CANCELLED',
    },
  });
}

export async function getDashboardMetrics(userId: string) {
  const [total, scheduled, sent, failed, cancelled] = await Promise.all([
    prisma.email.count({ where: { userId } }),
    prisma.email.count({ where: { userId, status: { in: ['SCHEDULED', 'PENDING'] } } }),
    prisma.email.count({ where: { userId, status: 'SENT' } }),
    prisma.email.count({ where: { userId, status: 'FAILED' } }),
    prisma.email.count({ where: { userId, status: 'CANCELLED' } }),
  ]);

  const recentActivity = await prisma.email.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    total,
    scheduled,
    sent,
    failed,
    cancelled,
    recentActivity,
  };
}
