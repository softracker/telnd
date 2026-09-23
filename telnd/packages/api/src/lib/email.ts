import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

let cachedTransporter: Transporter | null = null;
let cachedConfigHash: string | null = null;

function configHash(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.secure}:${config.user || ''}:${config.pass || ''}`;
}

async function getSmtpConfigFromDb(): Promise<SmtpConfig | null> {
  try {
    const { prisma } = await import('@telnd/database');
    const row = await prisma.setting.findUnique({ where: { key: 'smtp' } });
    if (!row) return null;
    const val = row.value as any;
    if (!val?.host || !val?.port) return null;
    return {
      host: val.host,
      port: val.port,
      secure: val.secure ?? true,
      user: val.user || undefined,
      pass: val.pass || undefined,
      from: val.from || 'noreply@telnd.com',
    };
  } catch {
    return null;
  }
}

function getConfigFromEnv(): SmtpConfig {
  return {
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.EMAIL_FROM || 'noreply@telnd.com',
  };
}

async function getSmtpConfig(): Promise<SmtpConfig> {
  const dbConfig = await getSmtpConfigFromDb();
  return dbConfig || getConfigFromEnv();
}

async function getTransporter(): Promise<Transporter> {
  const config = await getSmtpConfig();
  const hash = configHash(config);

  if (cachedTransporter && cachedConfigHash === hash) {
    return cachedTransporter;
  }

  const transportOptions: any = {
    host: config.host,
    port: config.port,
    secure: config.secure,
  };

  if (config.user && config.pass) {
    transportOptions.auth = { user: config.user, pass: config.pass };
  }

  cachedTransporter = nodemailer.createTransport(transportOptions);
  cachedConfigHash = hash;
  return cachedTransporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    const transporter = await getTransporter();

    await transporter.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}

export async function testSmtpConnection(config: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transportOptions: any = {
      host: config.host,
      port: config.port,
      secure: config.secure,
      connectionTimeout: 10000,
      greetingTimeout: 5000,
    };

    if (config.user && config.pass) {
      transportOptions.auth = { user: config.user, pass: config.pass };
    }

    const testTransporter = nodemailer.createTransport(transportOptions);
    await testTransporter.verify();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' };
  }
}
