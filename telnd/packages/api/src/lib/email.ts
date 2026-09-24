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

/**
 * Sender display name for outgoing mail: the application name from the
 * general settings, so clients show "TELND <address>" instead of falling
 * back to the bare mailbox (which renders as its initial, e.g. "hq").
 * Undefined when unset — callers then use the plain address.
 */
async function getApplicationName(): Promise<string | undefined> {
  try {
    const { prisma } = await import('@telnd/database');
    const row = await prisma.setting.findUnique({ where: { key: 'general' } });
    const name = (row?.value as any)?.applicationName;
    if (typeof name !== 'string') return undefined;
    const clean = name.replace(/[\r\n\t]+/g, ' ').trim();
    return clean || undefined;
  } catch {
    return undefined;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const config = await getSmtpConfig();
    const transporter = await getTransporter();
    const appName = await getApplicationName();

    await transporter.sendMail({
      // Nodemailer encodes the name (RFC 2047) — mail clients then show
      // "TELND <address>" instead of the bare mailbox's initial.
      from: appName ? { name: appName, address: config.from } : config.from,
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

interface AdminInviteParams {
  to: string;
  firstName: string;
  lastName: string;
  tempPassword: string;
  loginUrl: string;
  roleName: string;
  /** 'invite' (default): a new account was created. 'reset': an existing
   *  account's password was regenerated — subject/greeting adapt. */
  kind?: 'invite' | 'reset';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Invitation email for a newly created admin: login URL, the generated
 * temporary password, and a *recommendation* (never a requirement) to change
 * it after the first sign-in.
 */
export async function sendAdminInviteEmail(params: AdminInviteParams): Promise<boolean> {
  const { to, firstName, lastName, tempPassword, loginUrl, roleName, kind } = params;
  const displayName = escapeHtml(`${firstName} ${lastName}`.trim());
  const safeLoginUrl = escapeHtml(loginUrl);
  const appName = (await getApplicationName()) || 'TELND';
  const isReset = kind === 'reset';
  const subject = isReset
    ? `Your ${appName} Admin password has been reset`
    : `Your ${appName} Admin account has been created`;
  const intro = isReset
    ? `Hi ${displayName}, a new temporary password has been generated for your account &mdash; your previous password no longer works.`
    : `Hi ${displayName}, an admin account has been created for you.`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Your ${escapeHtml(appName)} Admin account</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${intro}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <tr><td style="padding:14px 16px;font-size:14px;color:#374151;line-height:1.8;">
              <div><strong>Login page:</strong> <a href="${safeLoginUrl}" style="color:#2563eb;">${safeLoginUrl}</a></div>
              <div><strong>Email:</strong> ${escapeHtml(to)}</div>
              <div><strong>Password:</strong> <span style="font-family:monospace;font-size:13px;background-color:#eef2ff;color:#1e1b4b;padding:2px 6px;border-radius:4px;">${escapeHtml(tempPassword)}</span></div>
              <div><strong>Role:</strong> ${escapeHtml(roleName)}</div>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;">
            <a href="${safeLoginUrl}" style="display:inline-block;background-color:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Sign in to ${escapeHtml(appName)} Admin</a>
          </p>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#374151;"><strong>Recommended:</strong> after your first sign-in, change your password. This is optional &mdash; nothing will require you to change it.</p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If you were not expecting this account, please ignore this email or contact your administrator.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
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
