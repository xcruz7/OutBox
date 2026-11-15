import nodemailer from 'nodemailer';
import { ENV } from './env.js';

let transporterInstance: nodemailer.Transporter | null = null;
let senderUser: string | null = null;
let isRealSMTP = false;

export async function getEmailTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  user: string;
  isRealSMTP: boolean;
}> {
  if (transporterInstance && senderUser) {
    return { transporter: transporterInstance, user: senderUser, isRealSMTP };
  }

  // 1. Check if user configured real SMTP (e.g. Gmail)
  if (ENV.SMTP_USER && ENV.SMTP_PASS) {
    const cleanPass = ENV.SMTP_PASS.replace(/\s+/g, '');
    console.log('[Email] Configured with REAL SMTP provider:', ENV.SMTP_SERVICE || ENV.SMTP_HOST || 'custom');
    isRealSMTP = true;
    senderUser = ENV.SMTP_USER;

    if (ENV.SMTP_SERVICE?.toLowerCase() === 'gmail') {
      transporterInstance = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: ENV.SMTP_USER.trim(),
          pass: cleanPass,
        },
      });
    } else {
      transporterInstance = nodemailer.createTransport({
        host: ENV.SMTP_HOST || 'smtp.gmail.com',
        port: ENV.SMTP_PORT || 587,
        secure: ENV.SMTP_PORT === 465,
        auth: {
          user: ENV.SMTP_USER.trim(),
          pass: cleanPass,
        },
      });
    }

    if (ENV.NODE_ENV === 'production') {
      await transporterInstance.verify();
    }

    return { transporter: transporterInstance, user: senderUser, isRealSMTP: true };
  }

  // 2. Fallback to Ethereal Email (Assignment Requirement for safe testing)
  let user = ENV.ETHEREAL_USER;
  let pass = ENV.ETHEREAL_PASS;

  if (!user || !pass) {
    if (ENV.NODE_ENV === 'production') {
      throw new Error('SMTP_USER and SMTP_PASS are required for production email delivery.');
    }
    console.log('[Email] No SMTP credentials provided. Creating an Ethereal test sandbox account...');
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    console.log(`[Email] Generated Ethereal credentials: user=${user}`);
  }

  senderUser = user;
  isRealSMTP = false;

  transporterInstance = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  return { transporter: transporterInstance, user, isRealSMTP: false };
}

export function getSenderAddress(user: string): string {
  return ENV.SMTP_FROM || `"Outbox Scheduler" <${user}>`;
}

export function getEmailPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
