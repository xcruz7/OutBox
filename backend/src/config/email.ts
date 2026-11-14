import nodemailer from 'nodemailer';
import { ENV } from './env.js';

let transporterInstance: nodemailer.Transporter | null = null;
let etherealCredentials: { user: string; pass: string } | null = null;

export async function getEmailTransporter(): Promise<{
  transporter: nodemailer.Transporter;
  user: string;
}> {
  if (transporterInstance && etherealCredentials) {
    return { transporter: transporterInstance, user: etherealCredentials.user };
  }

  let user = ENV.ETHEREAL_USER;
  let pass = ENV.ETHEREAL_PASS;

  if (!user || !pass) {
    console.log('[Email] No Ethereal credentials found in env. Creating a test account...');
    const testAccount = await nodemailer.createTestAccount();
    user = testAccount.user;
    pass = testAccount.pass;
    console.log(`[Email] Generated Ethereal test credentials:`);
    console.log(`[Email]   User: ${user}`);
    console.log(`[Email]   Pass: ${pass}`);
  }

  etherealCredentials = { user, pass };

  transporterInstance = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  return { transporter: transporterInstance, user };
}

export function getEmailPreviewUrl(info: nodemailer.SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
