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

/**
 * The org footer every outgoing mail ends with: organization name, phone
 * number, address and website link in small grey text under a hairline
 * (user request). Straight from Settings -> Organization ('organization'
 * setting); fields that are not configured are simply left out, and the
 * name falls back to the application name so the footer never loses its
 * heading. Returns the closing <tr> block to append as the last row of
 * the white card in each template. Exported so the markup can be checked
 * without SMTP — same reason as twoFactorEmailLead.
 */
export async function emailFooterRow(): Promise<string> {
  let org: Record<string, unknown> = {};
  try {
    const { prisma } = await import('@telnd/database');
    const row = await prisma.setting.findUnique({ where: { key: 'organization' } });
    if (row?.value && typeof row.value === 'object') org = row.value as Record<string, unknown>;
  } catch {
    // No settings row / unreachable DB: fall through to the defaults.
  }
  // One line of text, never a line break — an injected newline in a
  // subject-style field must not be able to split the footer markup.
  const pick = (v: unknown): string => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim() : '');
  const name = pick(org.name) || (await getApplicationName()) || 'TELND';
  const phone = pick(org.phone);
  const address = pick(org.address);
  const website = pick(org.website);
  const href = /^https?:\/\//i.test(website) ? website : website ? `https://${website}` : '';

  const lines: string[] = [`<div style="font-weight:600;color:#6b7280;">${escapeHtml(name)}</div>`];
  if (phone) lines.push(`<div>Phone: ${escapeHtml(phone)}</div>`);
  if (address) lines.push(`<div>${escapeHtml(address)}</div>`);
  if (website) {
    lines.push(`<div><a href="${escapeHtml(href)}" style="color:#6b7280;text-decoration:underline;">${escapeHtml(website)}</a></div>`);
  }
  return (
    '        <tr><td style="padding:14px 28px 20px;border-top:1px solid #e5e7eb;' +
    'font-size:11px;line-height:1.7;color:#9ca3af;text-align:center;">' +
    lines.join('') +
    '</td></tr>'
  );
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
    void logDelivery(to, subject, true);
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    void logDelivery(to, subject, false, err);
    return false;
  }
}

/**
 * Activity-feed row for the SMTP section (§ Activity Logs → SMTP Activity)
 * — one row per delivery attempt with its outcome, so the section can show
 * how many sends succeeded and how many failed. Actor is null on purpose
 * (the mail system is not an account) and the row renders as "System".
 * Fire-and-forget with a swallowed catch: logging must never change the
 * caller's boolean, let alone fail the request behind the send.
 */
async function logDelivery(to: string, subject: string, ok: boolean, err?: unknown): Promise<void> {
  try {
    const { prisma } = await import('@telnd/database');
    await prisma.adminAction.create({
      data: {
        adminId: null,
        action: ok ? 'EMAIL_SENT' : 'EMAIL_FAILED',
        targetType: 'smtp',
        details: {
          to,
          subject,
          ...(ok ? {} : { error: String((err as Error)?.message ?? err).slice(0, 500) }),
        },
      },
    });
  } catch {
    // Deliberately swallowed — see above.
  }
}

/**
 * True when outgoing mail has somewhere to go — a stored SMTP setup or an
 * environment-provided server. Mirrors exactly what sendEmail falls back
 * to, so the two-factor UI can offer email codes only when a send would
 * actually be attempted (and say so when it wouldn't).
 */
export async function isSmtpConfigured(): Promise<boolean> {
  const dbConfig = await getSmtpConfigFromDb();
  if (dbConfig) return true;
  return Boolean(process.env.SMTP_HOST);
}

/**
 * The lead sentence of the OTP email depends on why the code was sent —
 * a sign-in challenge, an enrollment from the Security page or the login
 * gate, a phone-number sign-in, or a neutral fallback. Pure so it can be
 * checked without SMTP.
 */
export type OtpEmailContext = 'signin' | 'setup' | 'verify' | 'login';

export function twoFactorEmailLead(context: OtpEmailContext, appName: string): string {
  const name = escapeHtml(appName);
  if (context === 'signin') return `Enter this code to finish signing in to ${name}:`;
  if (context === 'setup') return `Enter this code to finish setting up two-factor authentication for ${name}:`;
  if (context === 'login') return `Enter this code to sign in to ${name}:`;
  return `Enter this code to continue in ${name}:`;
}

/**
 * One-time code for two-factor authentication, delivered by email. Short
 * lived, single use — the same rules as the SMS body, worded for an inbox.
 */
export async function sendTwoFactorCodeEmail(
  to: string,
  code: string,
  context: OtpEmailContext = 'verify',
): Promise<boolean> {
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const subject = `${appName} verification code`;
  const lead = twoFactorEmailLead(context, appName);
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Your verification code</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">${lead}</p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px;color:#111827;font-family:monospace;">${escapeHtml(code)}</div>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">The code expires in 5 minutes and can be used once. If you did not request this code, you can safely ignore this email.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
}

interface AdminInviteParams {
  to: string;
  firstName: string;
  lastName: string;
  /** Single-use link where the recipient chooses their own password —
   *  no credential ever appears in the email itself. */
  setPasswordUrl: string;
  loginUrl: string;
  roleName: string;
  /** 'invite' (default): a new account was created. 'reset': an existing
   *  account asked for a new password link — subject/greeting adapt. */
  kind?: 'invite' | 'reset';
  /** Human-readable link lifetime shown in the email ('72 hours', '60 minutes'). */
  expiresLabel: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Invitation / regeneration email for an admin: login URL, role, and a
 * single-use link where the recipient picks their own password. The link
 * is the only secret delivered — it expires after `expiresLabel`.
 */
export async function sendAdminInviteEmail(params: AdminInviteParams): Promise<boolean> {
  const { to, firstName, lastName, setPasswordUrl, loginUrl, roleName, kind, expiresLabel } = params;
  const displayName = escapeHtml(`${firstName} ${lastName}`.trim());
  const safeLoginUrl = escapeHtml(loginUrl);
  const safeSetUrl = escapeHtml(setPasswordUrl);
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const isReset = kind === 'reset';
  const subject = isReset
    ? `Set a new ${appName} Admin password`
    : `Your ${appName} Admin account has been created`;
  const intro = isReset
    ? `Hi ${displayName}, a request was made to set a new password for your account. Use the link below to choose one &mdash; your current password keeps working until the link is used.`
    : `Hi ${displayName}, an admin account has been created for you. Use the link below to choose your password &mdash; the account cannot be signed into until you do.`;
  const cta = isReset ? 'Set a new password' : 'Choose your password';
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
              <div><strong>Role:</strong> ${escapeHtml(roleName)}</div>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;">
            <a href="${safeSetUrl}" style="display:inline-block;background-color:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">${cta}</a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">This link expires in <strong>${escapeHtml(expiresLabel)}</strong> and can only be used once. Requesting another one invalidates it.</p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If you were not expecting this email, please ignore it or contact your administrator.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
}

interface PasswordResetParams {
  to: string;
  firstName: string;
  lastName: string;
  /** Single-use, short-lived link to the panel's set-password page. */
  resetUrl: string;
  /** Human-readable link lifetime ('60 minutes'). */
  expiresLabel: string;
}

/**
 * Self-service recovery email (forgot password / "email me a reset link").
 * Carries only the expiring link — the password itself never transits email,
 * and nothing about the account changes until the link is used.
 */
export async function sendPasswordResetEmail(params: PasswordResetParams): Promise<boolean> {
  const { to, firstName, lastName, resetUrl, expiresLabel } = params;
  const displayName = escapeHtml(`${firstName} ${lastName}`.trim());
  const safeResetUrl = escapeHtml(resetUrl);
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const subject = `Set a new ${appName} password`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Password reset</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">Hi ${displayName}, a request was made to set a new password for your ${escapeHtml(appName)} account. Use the link below to choose one &mdash; nothing changes until you do.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <tr><td style="padding:14px 16px;font-size:14px;color:#374151;line-height:1.8;">
              <div><strong>Account:</strong> ${escapeHtml(to)}</div>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;">
            <a href="${safeResetUrl}" style="display:inline-block;background-color:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Set a new password</a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">This link expires in <strong>${escapeHtml(expiresLabel)}</strong> and can only be used once. When it is used, all existing sign-ins are ended and the new password is required.</p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If you did not request this, you can safely ignore this email &mdash; your password will not change.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
}

/**
 * Magic sign-in link for the portal's "Send me a login link" method (the
 * email login-link login provider). Clicking the link spends the single-use
 * token and drops the recipient straight into a signed-in session — nothing
 * is typed, no password ever leaves the mailbox's owner.
 */
export async function sendLoginLinkEmail(params: {
  to: string;
  firstName: string;
  lastName: string;
  /** Single-use, short-lived link that signs the recipient in. */
  loginUrl: string;
  /** Human-readable link lifetime ('15 minutes'). */
  expiresLabel: string;
}): Promise<boolean> {
  const { to, firstName, lastName, loginUrl, expiresLabel } = params;
  const displayName = escapeHtml(`${firstName} ${lastName}`.trim());
  const safeLoginUrl = escapeHtml(loginUrl);
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const subject = `Your ${appName} sign-in link`;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Sign in to ${escapeHtml(appName)}</h1>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">Hi ${displayName}, use the link below to sign in &mdash; no password needed. It works once and expires in <strong>${escapeHtml(expiresLabel)}</strong>.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 8px;background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
            <tr><td style="padding:14px 16px;font-size:14px;color:#374151;line-height:1.8;">
              <div><strong>Account:</strong> ${escapeHtml(to)}</div>
            </td></tr>
          </table>
          <p style="margin:0 0 16px;">
            <a href="${safeLoginUrl}" style="display:inline-block;background-color:#0f766e;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:14px;font-weight:600;">Sign in now</a>
          </p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">This link can only be used once, and only by the person with access to this inbox. Requesting another one invalidates it.</p>
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9ca3af;">If you did not request this, you can safely ignore this email &mdash; you will not be signed in.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>`;
  return sendEmail(to, subject, html);
}

/**
 * Security notice sent to the account owner when a super admin turns their
 * two-factor authentication off (release or turn-off from the Admins list).
 * The account holder never did this themselves, so the mail says exactly
 * that and tells them who to contact — a covert reset must not be able to
 * go unnoticed. Fire-and-forget at the call site: a mail hiccup never
 * fails the administrative action.
 */
export async function sendTwoFactorNoticeEmail(to: string, adminName: string | null): Promise<boolean> {
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const subject = `${appName} two-factor authentication was turned off`;
  const actor = adminName ? `by <strong>${escapeHtml(adminName)}</strong>` : 'by an administrator';
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">Two-factor authentication turned off</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Two-factor authentication on your ${escapeHtml(appName)} account was turned off ${actor}. Your authenticator app, SMS and email codes, and your recovery codes all stopped working — the next sign-in will only ask for your password.</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">You can set two-factor authentication up again from <strong>Settings &rarr; Security</strong>.</p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">If this wasn't you, contact your administrator immediately — someone else may have accessed your account.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
}

/**
 * New-device sign-in alert: fired the first time an account is opened
 * from a given device (see lib/loginAlerts). Carries every detail of the
 * sign-in that is known — when, where, from what, and from which address —
 * because the whole point is letting the owner judge whether it was them.
 */
export async function sendNewDeviceLoginEmail(params: {
  to: string;
  firstName: string;
  /** Family label, e.g. "Chrome on Windows". */
  device: string;
  ip: string | null;
  location: string | null;
  signedInAt: Date;
}): Promise<boolean> {
  const { to, firstName, device, ip, location, signedInAt } = params;
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const subject = `New sign-in to your ${appName} account`;
  // Accounts created without a name still read as a sentence.
  const displayName = escapeHtml((firstName || '').trim() || 'there');
  const when = escapeHtml(`${signedInAt.toUTCString()} (UTC)`);
  const deviceCell = escapeHtml(device);
  const ipCell = escapeHtml(ip ?? 'Not available');
  const locationCell = escapeHtml(location ?? 'Not available');
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">New sign-in to your account</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Hi ${displayName}, a device you have not signed in from before just accessed your ${escapeHtml(appName)} account:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;">
            <tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;width:40%;">When</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${when}</td></tr>
            <tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">Device</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${deviceCell}</td></tr>
            <tr><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#6b7280;">IP address</td><td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;color:#111827;">${ipCell}</td></tr>
            <tr><td style="padding:10px 14px;color:#6b7280;">Location</td><td style="padding:10px 14px;color:#111827;">${locationCell}</td></tr>
          </table>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">If this was you, there is nothing to do — we will recognize this device from now on. If you do not recognize this sign-in, secure your account right away: change your password and contact support if you need help.</p>
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">We only send this email the first time a device signs in, not on every visit.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(to, subject, html);
}

export interface RequirementNoticeParams {
  to: string;
  /** Which requirement the notice is about. */
  kind: 'two-factor' | 'pin';
  /**
   * 'account' = one admin was made to comply specifically;
   * 'all'    = the whole-admins policy flipped, recipient still not set up.
   */
  scope: 'account' | 'all';
  /** Who made the change — their account NAME, not the address (null → "an administrator"). */
  adminName: string | null;
  /** Does the recipient already satisfy the requirement? */
  alreadySet: boolean;
}

/**
 * "2FA / security PIN is now required" notice. Covers all four events —
 * per-admin require and require-for-all, for either feature — with the
 * action paragraph chosen from (kind, scope, alreadySet): the copy only
 * ever asks for the work the recipient actually has left. Delivered
 * through lib/noticeQueue (batched), never called inline from a handler.
 */
export async function sendRequirementNoticeEmail(params: RequirementNoticeParams): Promise<boolean> {
  const { kind, scope, adminName, alreadySet } = params;
  const appName = (await getApplicationName()) || 'TELND';
  const footer = await emailFooterRow();
  const feature = kind === 'two-factor' ? 'two-factor authentication' : 'security PIN';
  const featureTitle = kind === 'two-factor' ? 'Two-factor authentication' : 'Security PIN';
  const subject =
    scope === 'all'
      ? `${appName} ${feature} is now required for all admins`
      : `${appName} ${feature} is now required`;
  const actor = adminName ? `by <strong>${escapeHtml(adminName)}</strong>` : 'by an administrator';
  const lead =
    scope === 'all'
      ? `${featureTitle} is now required for every ${escapeHtml(appName)} admin account &mdash; the policy was changed ${actor}.`
      : `${featureTitle} on your ${escapeHtml(appName)} admin account was made required ${actor}.`;

  let action: string;
  if (kind === 'two-factor' && !alreadySet) {
    action =
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">You do not have it set up yet. Pick a method (authenticator app, SMS, or email code) from <strong>Settings &rarr; Security</strong>. While the requirement stands, your next sign-in will not finish until two-factor authentication is set up &mdash; you will be taken straight to the setup screen.</p>` +
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">If you already have it turned on, nothing is left to do.</p>`;
  } else if (kind === 'two-factor') {
    action = `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Your account already has it set up, so there is nothing to do. While the requirement stands it stays on and can no longer be turned off.</p>`;
  } else if (!alreadySet) {
    action =
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">You do not have a PIN yet. Create your 4-digit PIN from <strong>Settings &rarr; Security</strong> &mdash; or straight from the lock screen the next time it appears. Until you do, the screen lock and your first sensitive action will each ask you to create one.</p>` +
      `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">If your PIN is already set, nothing is left to do.</p>`;
  } else {
    action = `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">Your account already has a PIN set, so there is nothing to do. While the requirement stands it can no longer be disabled.</p>`;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:10px;border:1px solid #e5e7eb;">
        <tr><td style="padding:28px 28px 24px;">
          <h1 style="margin:0 0 12px;font-size:18px;color:#111827;">${featureTitle} is now required${scope === 'all' ? ' for all admins' : ''}</h1>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#374151;">${lead}</p>
          ${action}
          <p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">If you think this requirement was made in error, contact the administrator named above.</p>
        </td></tr>
${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  return sendEmail(params.to, subject, html);
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
