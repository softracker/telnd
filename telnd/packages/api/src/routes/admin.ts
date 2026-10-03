import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@telnd/database';
import { authMiddleware, roleGuard, requireAdmin, requirePermission, requireAnyPermission } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { rateLimit } from '../middleware/rateLimit';
import { featureFlagSchema, maintenanceModeSchema, reportSchema, adminRoleSchema, suspendUserSchema, createAdminSchema, updateAdminSchema } from '@telnd/validation';
import { sendAdminInviteEmail, sendPasswordResetEmail, sendTwoFactorNoticeEmail } from '../lib/email';
import { issuePasswordToken, discardPasswordToken, adminUrl, portalUrl } from '../lib/passwordTokens';
import { deleteRecoveryCodes } from '../lib/recoveryCodes';
import { clearTrustedDevices } from '../lib/trustedDevices';
import { clearOtp } from '../lib/twoFactor';
import { clearPinAttempts, requirePinApproval } from '../lib/securityPin';
import { notifyTwoFactorRequired, notifyTwoFactorRequiredForAll, notifyPinRequired, notifyPinRequiredForAll, actorNameOf } from '../lib/requirementNotices';
import { ACTIVITY_TYPES, activityCategory, activityWhere, isActivityType } from '../lib/activityFeed';
import { getIp } from '../lib/getIp';

type AdminEnv = {
  Variables: {
    user: any;
    userId: string;
    admin: any;
    validatedData: any;
  };
};

const admin = new Hono<AdminEnv>();

// All admin routes require auth + admin role + an AdminUser row with the
// matching permission (see requirePermission in middleware/auth).
admin.use('*', authMiddleware, roleGuard('ADMIN'));

function clampLimit(value: string | undefined, max = 100): number {
  const parsed = parseInt(value || '20');
  if (isNaN(parsed) || parsed < 1) return 20;
  return Math.min(parsed, max);
}

function clampPage(value: string | undefined): number {
  const parsed = parseInt(value || '1');
  if (isNaN(parsed) || parsed < 1) return 1;
  return parsed;
}

// Super admin = the "*" wildcard in a role's permission list. A super admin
// is invisible to anyone who isn't one: the Admins list filters them out,
// and the direct-ID routes below answer 404 as if the account didn't exist
// — only a super admin may see, edit, suspend or delete one.
const isSuper = (permissions: unknown): boolean =>
  Array.isArray(permissions) && permissions.includes('*');

// Escalation guard for role grants and role assignments (#4, #5): holding
// roles.create/roles.edit or admins.create says you may operate on the
// entity, not that you may hand out power you don't have. Two rules: the
// "*" wildcard (super) only ever moves between super admins, and a
// non-super actor may only grant permissions their own role already holds —
// otherwise a limited admin could mint (or assign) a stronger role and
// walk out of their own permission set. Returns the denial message when the
// grant is NOT allowed, null when it is; super passes everything.
const grantDenied = (actorPermissions: unknown, granted: unknown): string | null => {
  const actorPerms: unknown[] = Array.isArray(actorPermissions) ? actorPermissions : [];
  if (isSuper(actorPerms)) return null;
  const grantedPerms: unknown[] = Array.isArray(granted) ? granted : [];
  if (grantedPerms.includes('*')) {
    return 'Only a super admin can grant or assign the "*" (super admin) permission.';
  }
  const missing = grantedPerms.filter((p) => !actorPerms.includes(p));
  return missing.length > 0 ? `You cannot grant permissions you do not hold: ${missing.join(', ')}` : null;
};

// Log admin action
const logAction = async (adminId: string, action: string, targetType: string, targetId?: string, details?: any, c?: any) => {
  await prisma.adminAction.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
      // Same trust model as rate limiting (#28): the client-written
      // forwarding headers are not evidence of anything — record the
      // peer address (or the stamped one when TRUST_PROXY is set).
      ipAddress: c && getIp(c) !== 'unknown' ? getIp(c) : undefined,
      userAgent: c?.req.header('user-agent'),
    },
  });
};

// Which account a row's target was. The activity log must answer "which
// admin, which account" from the details alone — even for DELETE_ADMIN,
// where the account row is gone by the time anyone reads the log. Email
// plus display name; a nameless account falls back to its address.
const targetIdentity = (
  u: { email?: string | null; firstName?: string | null; lastName?: string | null } | null | undefined,
) => {
  if (!u?.email) return {};
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return { email: u.email, name: name || u.email };
};

// ============================================
// Dashboard
// ============================================
admin.get('/dashboard', requireAdmin, requirePermission('dashboard.view'), async (c) => {
  const [totalUsers, activeUsers, newUsersToday, totalJobs, activeJobs, totalCompanies, totalMerchants, pendingReports, openTickets] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.job.count(),
    prisma.job.count({ where: { status: 'PUBLISHED' } }),
    prisma.company.count(),
    prisma.merchant.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
  ]);

  return c.json({
    totalUsers,
    activeUsers,
    newUsersToday,
    totalJobs,
    activeJobs,
    totalCompanies,
    totalMerchants,
    pendingReports,
    openTickets,
  });
});

// ============================================
// Send statistics (§14.60) — Settings → Sending analytics
// ============================================
// Daily SMS/email outcomes for the graphs: sent / failed / blocked
// (destination budget or daily cap — split so the tiles can show how much
// was abuse vs. provider trouble). Rows carry no destination, so this is
// counts only. Days are bucketed in SERVER-LOCAL calendar days (the
// operator's "today"), zero-filled across the window so the chart's x-axis
// is continuous. The query window carries one day of slack for the
// timezone edge; rows outside the zero-filled days are ignored.
type SendCounts = { sent: number; failed: number; blockedDestination: number; blockedDaily: number };
const emptySendCounts = (): SendCounts => ({ sent: 0, failed: 0, blockedDestination: 0, blockedDaily: 0 });

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function bumpSendCounts(counts: SendCounts, outcome: string): void {
  if (outcome === 'SENT') counts.sent++;
  else if (outcome === 'FAILED') counts.failed++;
  else if (outcome === 'BLOCKED_DESTINATION') counts.blockedDestination++;
  else if (outcome === 'BLOCKED_DAILY') counts.blockedDaily++;
}

admin.get('/send-stats', requireAdmin, requirePermission('dashboard.view'), async (c) => {
  const requested = parseInt(c.req.query('days') ?? '30', 10);
  const days = Number.isFinite(requested) ? Math.min(120, Math.max(1, requested)) : 30;

  const since = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000);
  const rows = await prisma.sendEvent.findMany({
    select: { createdAt: true, channel: true, outcome: true },
    where: { createdAt: { gte: since } },
    // The store is bounded by the daily caps (~600/day at defaults) and
    // pruned past 400 days; the take is pure belt-and-braces against a
    // pathological cap raise so one admin view can never pull a table.
    take: 100000,
  });

  const byDay = new Map<string, { sms: SendCounts; email: SendCounts }>();
  const dayKeys: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const key = localDayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i));
    dayKeys.push(key);
    byDay.set(key, { sms: emptySendCounts(), email: emptySendCounts() });
  }

  const totals = { sms: emptySendCounts(), email: emptySendCounts() };
  for (const row of rows) {
    const day = byDay.get(localDayKey(row.createdAt));
    if (!day) continue;
    const bucket = row.channel === 'SMS' ? day.sms : day.email;
    bumpSendCounts(bucket, row.outcome);
    bumpSendCounts(row.channel === 'SMS' ? totals.sms : totals.email, row.outcome);
  }

  return c.json({
    success: true,
    data: {
      days: dayKeys.map((date) => {
        const d = byDay.get(date)!;
        return { date, sms: d.sms, email: d.email };
      }),
      totals,
      rangeDays: days,
    },
  });
});

// ============================================
// Users Management (portal accounts — the panel's own accounts are the
// separate /admins door below; nothing here ever touches role ADMIN)
// ============================================

// The portal side of the UserRole enum: every value except ADMIN. Used by
// both the always-on two-door filter and the list's role dropdown.
const PORTAL_USER_ROLES = ['CANDIDATE', 'EMPLOYER', 'CREATOR', 'FREELANCER', 'AGENCY'] as const;

admin.get('/users', requireAdmin, requirePermission('users.view'), async (c) => {
  const search = String(c.req.query('search') ?? '').trim().toLowerCase();
  const roleFilter = String(c.req.query('role') ?? '').trim().toUpperCase();
  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '10', 10) || 10));
  const page = clampPage(c.req.query('page'));

  // Two-door rule: the Admins list lives under /admins — role ADMIN is
  // never part of this list, whatever the filters say.
  const base: any = { role: { not: 'ADMIN' } };
  if (roleFilter) {
    // The old handler fed `role` straight into a Prisma capability filter
    // (wrong enum, crash on a bad value) — the filter is on UserRole now,
    // and an unknown value is an honest 400 instead of a 500.
    if (!(PORTAL_USER_ROLES as readonly string[]).includes(roleFilter)) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown role filter.' } }, 400);
    }
    base.role = roleFilter;
  }

  const where: any = { ...base };
  if (search) {
    const or: any[] = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
    // Same searchable words the Admins list offers: status and role name.
    if (search === 'active') or.push({ isActive: true });
    if (search === 'suspended') or.push({ isActive: false });
    const asRole = search.toUpperCase();
    if ((PORTAL_USER_ROLES as readonly string[]).includes(asRole)) or.push({ role: asRole as never });
    where.OR = or;
  }

  const [filteredTotal, total] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: base }),
  ]);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
  // Clamp so an out-of-range page (e.g. after a delete) returns the last page.
  const safePage = Math.min(page, totalPages);

  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (safePage - 1) * pageSize,
    take: pageSize,
    // Selected, never mapped-and-stripped: credential material
    // (passwordHash, twoFactorSecret) is never fetched in the first place.
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      twoFactorEnforced: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  const items = rows.map(({ twoFactorEnforced, ...u }) => ({
    ...u,
    // "Required" means a super admin demands setup at next sign-in — the
    // same row vocabulary the Admins list uses.
    twoFactorRequired: twoFactorEnforced,
  }));

  // DataTables-style envelope, byte-for-byte the shape GET /admins answers.
  return c.json({ items, page: safePage, pageSize, totalPages, filteredTotal, total });
});

admin.get('/users/:id', requireAdmin, requirePermission('users.view'), async (c) => {
  const id = c.req.param('id');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { capabilities: true },
  });
  if (!user) return c.json({ error: 'User not found' }, 404);

  // The modal's "logged in devices" + "trusted devices" sections (§14.62):
  // every live session and trust grant for this account, newest first.
  // Selected by hand — Session.token and TrustedDevice.tokenHash are
  // secrets and never leave the server; the row spread below drops
  // passwordHash + twoFactorSecret the same way (#3).
  const [sessions, trustedDevices] = await Promise.all([
    prisma.session.findMany({
      where: { userId: id },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        location: true,
        countryCode: true,
        lockedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trustedDevice.findMany({
      where: { userId: id },
      select: { id: true, label: true, userAgent: true, createdAt: true, lastUsedAt: true },
      orderBy: { lastUsedAt: 'desc' },
    }),
  ]);

  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return c.json({ ...safeUser, sessions, trustedDevices });
});

admin.patch('/users/:id/suspend', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), validate(suspendUserSchema), rateLimit('admin.write'), async (c) => {
  // Suspension revokes a live account — a sensitive action like delete,
  // so it carries the same PIN approval (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const reason = body.reason;
  const adminUser = c.get('admin');

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  // A super admin doesn't exist for a non-super caller — not in the lists,
  // and a direct suspend gets the same 404.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  // Revoke all active sessions for the suspended user — and every trusted-
  // device grant with them: a suspended account that is later reactivated
  // must re-prove its second factor instead of riding in on a stale
  // telnd_trusted cookie (§14.62).
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });
  await prisma.trustedDevice.deleteMany({ where: { userId: id } });

  await logAction(adminUser.userId, 'SUSPEND_USER', 'user', id, { reason, ...targetIdentity(user) }, c);
  // Never echo the full row: it carries passwordHash + twoFactorSecret (#3).
  const { passwordHash, twoFactorSecret, ...safeUser } = updated;
  return c.json(safeUser);
});

admin.patch('/users/:id/activate', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), rateLimit('admin.write'), async (c) => {
  // Restoring access is the mirror sensitive action (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const existing = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  // Same invisibility rule as suspend: a super admin is not reachable by a
  // non-super caller.
  if (isSuper(existing.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: true },
  });

  await logAction(adminUser.userId, 'ACTIVATE_USER', 'user', id, { ...targetIdentity(user) }, c);
  // Never echo the full row: it carries passwordHash + twoFactorSecret (#3).
  const { passwordHash, twoFactorSecret, ...safeUser } = user;
  return c.json(safeUser);
});

// Sign this user out everywhere — the security reset for "their device may
// be compromised": every live session, its refresh lineage and every
// trusted-device grant go at once, while the account itself stays fully
// active. Deliberately NOT suspend→activate: suspend is a moderation state
// (the account stops working, two steps, two audit rows) and until this
// section it left trusted-device grants behind, so a reactivated account
// could ride back in without its second factor. One action, one row — the
// next sign-in needs the password and the factor again, and no stale
// telnd_trusted cookie can skip it.
admin.post('/users/:id/revoke-access', requireAdmin, requireAnyPermission('users.edit', 'admins.edit'), rateLimit('admin.write'), async (c) => {
  // Kicking a signed-in user out of their account is as sensitive as
  // suspending it — same PIN approval (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const user = await prisma.user.findUnique({ where: { id } });
  // Two-door like delete: panel accounts live under /admins and answer
  // 404 here, exactly like an unknown id.
  if (!user || user.role === 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const sessions = await prisma.session.deleteMany({ where: { userId: id } });
  const refreshes = await prisma.refreshToken.deleteMany({ where: { userId: id } });
  const devices = await prisma.trustedDevice.deleteMany({ where: { userId: id } });

  await logAction(
    adminUser.userId,
    'REVOKE_USER_ACCESS',
    'user',
    id,
    {
      ...targetIdentity(user),
      revokedSessions: sessions.count,
      revokedRefreshTokens: refreshes.count,
      revokedTrustedDevices: devices.count,
    },
    c,
  );

  // isActive is deliberately untouched — this is a sign-out, not a
  // suspension, so the toast can report exactly what went away.
  return c.json({
    success: true,
    data: { sessions: sessions.count, refreshTokens: refreshes.count, trustedDevices: devices.count },
  });
});

// Require (or release) two-factor authentication for one portal user —
// the Users page's per-account version of the Settings → Security switch.
// Requiring doesn't provision anything: an unenrolled account is forced
// through setup at its next sign-in, an enrolled one starts challenging
// and can no longer switch 2FA off by itself. Releasing only lifts the
// demand — deliberately unlike the Admins list's release, which wipes the
// enrollment: the portal user keeps the factor they set up (the users
// policy lift doesn't wipe one either, §14.61). No notice email rides
// along: the requirement-notice template speaks the admin panel's
// language ("admin account", Settings → Security) and these recipients
// are portal users — a correctly-worded variant is a follow-up.
admin.patch('/users/:id/two-factor', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage two-factor authentication.' },
    }, 403);
  }

  const id = c.req.param('id');
  const { required } = c.get('validatedData') as { required: boolean };

  // Sensitive only in the release direction — requiring adds protection
  // and needs no approval (same gate as the Admins list's toggle).
  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  // Two-door: an ADMIN account is managed under /admins and answers 404
  // here, exactly like an unknown id.
  if (!user || user.role === 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { twoFactorEnforced: required },
  });

  // OFF→ON for an account with nothing enrolled revokes its live access
  // now, so the change can't be ridden out unchallenged (mirrors the
  // Admins list's require and the users policy flip, §14.61).
  if (required && !user.twoFactorEnabled) {
    await prisma.session.deleteMany({ where: { userId: id } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR_USER' : 'RELEASE_TWO_FACTOR_USER', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({
    success: true,
    data: { twoFactorRequired: updated.twoFactorEnforced, twoFactorEnabled: updated.twoFactorEnabled },
  });
});

// Turn two-factor OFF for one portal user — the enrollment wiped exactly
// the way the holder would wipe it themselves from Security (§14.61),
// minus their proof of the factor: super admin + PIN is the authority
// here. Secret, method, recovery codes and trusted-device grants all die
// with the factor (a trust exists only to skip a factor that is now off),
// and a code stamped for the dying challenge must not linger. The per-user
// requirement is deliberately left alone — require / stop-requiring stays
// its own switch, so each button controls exactly one thing: with the
// demand up, the next sign-in walks straight into a fresh setup instead
// of a silent re-enable. The holder is emailed whenever an enrollment
// actually went away, so a covert removal cannot go unnoticed.
admin.post('/users/:id/two-factor/disable', requireAdmin, rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage two-factor authentication.' },
    }, 403);
  }

  // Turning 2FA OFF removes protection — the same approval the Admins
  // list's release direction carries (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const user = await prisma.user.findUnique({ where: { id } });
  // Two-door: an ADMIN account is managed under /admins and answers 404
  // here, exactly like an unknown id.
  if (!user || user.role === 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  // Remember the enrollment before the wipe — the notice below only makes
  // sense when something actually went away.
  const wasEnrolled = user.twoFactorEnabled;
  const targetEmail = user.email;
  const updated = await prisma.user.update({
    where: { id },
    data: { twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null },
  });
  // A code stamped for the dying challenge must not linger either.
  clearOtp(user.id);
  // Recovery codes are part of the factor they belong to — they die with it.
  await deleteRecoveryCodes(user.id);
  // §14.61 — and so are this account's trusted devices: a trust exists only
  // to skip a factor that is now off; with 2FA re-enrolled later, no stale
  // cookie may ride in on the old grant.
  const revokedDevices = await clearTrustedDevices(user.id);

  if (wasEnrolled && targetEmail) {
    // The owner did not turn this off themselves: tell them, so a covert
    // removal cannot go unnoticed — same notice as the Admins list's
    // release, fire-and-forget so a slow or dead mail server never stalls
    // or fails the administrative action.
    void actorNameOf(actor.userId)
      .then((actorName) => sendTwoFactorNoticeEmail(targetEmail, actorName))
      .catch(() => {
        // Deliberately swallowed — see above.
      });
  }

  await logAction(actor.userId, 'DISABLE_TWO_FACTOR', 'user', id, {
    ...targetIdentity(user),
    revokedTrustedDevices: revokedDevices,
  }, c);

  // The requirement flag is echoed untouched — proof that the wipe left
  // the require/stop-requiring switch exactly as it found it.
  return c.json({
    success: true,
    data: {
      twoFactorEnabled: updated.twoFactorEnabled,
      twoFactorMethod: updated.twoFactorMethod,
      twoFactorRequired: updated.twoFactorEnforced,
    },
  });
});

// Email this portal user a single-use password-reset link — the Users
// page's counterpart of the Admins list's regenerate action, issued from
// the admin side rather than the public forgot-password door. Nothing
// about the account changes until the link is used: only a SHA-256 of the
// token is stored, one live link per account (a re-send invalidates the
// previous mail), 60 minutes, and a failed send discards the token so a
// link nobody received never stays live.
admin.post('/users/:id/reset-password', requireAdmin, rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to send password reset links.' },
    }, 403);
  }
  // Recovery mail hands over the account's front door — approve with PIN
  // (after the super check, same order as the Admins list's route).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }
  if (!user.email) {
    return c.json({
      success: false,
      error: { code: 'NO_EMAIL', message: 'This account has no email address, so a reset link cannot be delivered.' },
    }, 400);
  }

  const raw = await issuePasswordToken(user.id, 'reset');
  const emailed = await sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    resetUrl: portalUrl(`/auth/reset-password?token=${raw}`),
    expiresLabel: '60 minutes',
  });

  if (!emailed) {
    // Email-first: a link nobody received must not stay live.
    await discardPasswordToken(user.id, 'reset');
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The reset link could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await logAction(actor.userId, 'REGENERATE_USER_PASSWORD', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { email: user.email } });
});

// Delete a portal user. Two-door for real: an ADMIN account (panel
// people) answers 404 here — removing one goes through DELETE /admins/:id
// with its own admins.delete grant. Session material is revoked before
// the row goes; every other per-user relation (password tokens, trusted
// devices, recovery codes, capabilities, …) cascades, and a relation that
// doesn't (an application, a report, …) fails honestly with 409 IN_USE —
// suspend it instead.
admin.delete('/users/:id', requireAdmin, requirePermission('users.delete'), rateLimit('admin.write'), async (c) => {
  // Deleting revokes an account outright — a sensitive action, so it
  // carries the same PIN approval as suspend (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const actor = c.get('admin');

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role === 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
  }

  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003' || err?.code === 'P2002') {
      return c.json({
        success: false,
        error: { code: 'IN_USE', message: 'This account has linked records and cannot be deleted. Suspend it instead.' },
      }, 409);
    }
    throw err;
  }

  await logAction(actor.userId, 'DELETE_USER', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true });
});

// ============================================
// Admin Accounts (the people who can log into this panel)
// ============================================
admin.get('/admins', requireAdmin, requirePermission('admins.view'), async (c) => {
  const search = String(c.req.query('search') ?? '').trim().toLowerCase();
  const roleFilter = String(c.req.query('role') ?? '').trim();
  // With any query param it switches to DataTables-style paging (server-side
  // search + role filter + slice); bare GET keeps the legacy full-list shape.
  const wantsPaging =
    search.length > 0 ||
    roleFilter.length > 0 ||
    c.req.query('page') !== undefined ||
    c.req.query('pageSize') !== undefined;

  // Your own account lives in the My Account card above this list — the
  // Admins list deliberately never includes the viewer themselves, so the
  // same row isn't shown twice. (Self password reset moves to a future
  // Security tab; other admins' regenerate action is unaffected.)
  const selfId = c.get('user')?.id;
  const actorIsSuper = isSuper(c.get('admin')?.role?.permissions);

  const users = await prisma.user.findMany({
    where: { role: 'ADMIN', ...(selfId ? { NOT: { id: selfId } } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { adminUser: { include: { role: true } } },
  });

  const all = users
    .map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      isActive: u.isActive,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      roleId: u.adminUser?.roleId ?? null,
      roleName: u.adminUser?.role?.name ?? null,
      permissions: (u.adminUser?.role?.permissions as unknown as string[] | null) ?? [],
      isSelf: u.id === selfId,
      // 2FA state for the Admins list: "required" means a super admin
      // demands setup at next sign-in; "enabled" means it's actually on.
      twoFactorEnabled: u.twoFactorEnabled,
      twoFactorMethod: u.twoFactorMethod,
      twoFactorRequired: u.twoFactorEnforced,
      // Security PIN state for the row controls: whether one is on file
      // (never the hash) and whether a super admin demands one.
      securityPinSet: Boolean(u.adminUser?.pinHash),
      securityPinRequired: u.adminUser?.pinRequired ?? false,
    }))
    // Super admins appear only for a super admin. Filtering before paging
    // keeps totals honest for everyone else.
    .filter((u) => actorIsSuper || !u.permissions.includes('*'));

  if (!wantsPaging) {
    return c.json({ admins: all, total: all.length });
  }

  let filtered = roleFilter ? all.filter((u) => u.roleId === roleFilter) : all;
  if (search) {
    filtered = filtered.filter((u) =>
      [
        `${u.firstName} ${u.lastName}`.trim(),
        u.email ?? '',
        u.roleName ?? '',
        u.isActive ? 'active' : 'suspended',
      ].some((v) => v.toLowerCase().includes(search)),
    );
  }

  const pageSize = Math.min(100, Math.max(1, parseInt(c.req.query('pageSize') ?? '5', 10) || 5));
  const page = Math.max(1, parseInt(c.req.query('page') ?? '1', 10) || 1);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Clamp so an out-of-range page (e.g. after a delete) returns the last page.
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return c.json({
    items: filtered.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalPages,
    filteredTotal: filtered.length,
    total: all.length,
  });
});

admin.post('/admins', requireAdmin, requirePermission('admins.create'), validate(createAdminSchema), rateLimit('admin.sensitive'), async (c) => {
  // Sensitive: creating an admin grants panel access — approve with PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' } }, 409);
  }
  const role = await prisma.adminRole.findUnique({ where: { id: body.roleId } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  // Assigning a role hands over everything it holds, so the target role's
  // permissions must pass the same escalation guard as a grant (#5): the
  // "*" role only goes to a super admin, and a non-super creator can only
  // assign roles made of permissions they already hold themselves.
  const deniedGrant = grantDenied(adminUser?.role?.permissions, role.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }

  // Nobody types a password: the account is created WITHOUT one and a
  // single-use invite link (72-hour expiry, stored only as a hash) is
  // emailed to the confirmed address — the new admin chooses their own
  // password through it, so no credential ever appears in email. Login is
  // impossible until the link is used (a null hash is rejected at login).
  const user = await prisma.user.create({
    data: {
      email: body.email,
      firstName: body.firstName,
      lastName: body.lastName,
      role: 'ADMIN',
      isEmailVerified: true,
      adminUser: { create: { roleId: body.roleId } },
    },
    include: { adminUser: { include: { role: true } } },
  });

  const inviteToken = await issuePasswordToken(user.id, 'invite');
  const loginUrl = adminUrl('/login');
  const emailed = await sendAdminInviteEmail({
    to: body.email,
    firstName: body.firstName,
    lastName: body.lastName,
    setPasswordUrl: adminUrl(`/reset-password?token=${inviteToken}`),
    loginUrl,
    roleName: role.name,
    expiresLabel: '72 hours',
  });

  if (!emailed) {
    // Roll back: an admin nobody can log in as is worse than no admin at
    // all. The unused invite token cascades away with the user row.
    try {
      await prisma.$transaction([
        prisma.adminUser.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
    } catch (rollbackErr) {
      console.error('Rollback after failed invite email failed:', rollbackErr);
    }
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The invitation email could not be sent, so the admin was not created. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await logAction(adminUser.userId, 'CREATE_ADMIN', 'user', user.id, { roleId: body.roleId, ...targetIdentity(user) }, c);
  return c.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isActive: user.isActive,
    roleId: user.adminUser?.roleId ?? null,
    roleName: user.adminUser?.role?.name ?? null,
    permissions: user.adminUser?.role?.permissions ?? [],
  }, 201);
});

admin.patch('/admins/:id', requireAdmin, requirePermission('admins.edit'), validate(updateAdminSchema), rateLimit('admin.write'), async (c) => {
  // Editing an admin — including a role change — is escalation-adjacent:
  // approve with PIN like the delete beside it (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId && body.roleId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot change your own role' } }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Super admins are absent from a non-super viewer's list — a direct call
  // must look the same, and only a super admin may edit one.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  if (body.email && body.email !== user.email) {
    const duplicate = await prisma.user.findUnique({ where: { email: body.email } });
    if (duplicate) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'An account with this email already exists' } }, 409);
    }
  }
  if (body.roleId) {
    const role = await prisma.adminRole.findUnique({ where: { id: body.roleId } });
    if (!role) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
    }
    // Reassigning a role hands over everything it holds — same escalation
    // guard as create (#5): the "*" role only goes to a super admin, and a
    // non-super actor can only assign roles made of permissions they hold
    // themselves. (Changing your own role is already blocked above.)
    const deniedGrant = grantDenied(adminUser?.role?.permissions, role.permissions);
    if (deniedGrant) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
    }
  }

  const data: Record<string, unknown> = {};
  if (body.email !== undefined) data.email = body.email;
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  if (body.roleId !== undefined) {
    data.adminUser = {
      upsert: {
        where: { userId: id },
        update: { roleId: body.roleId },
        create: { roleId: body.roleId },
      },
    };
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { adminUser: { include: { role: true } } },
  });

  await logAction(adminUser.userId, 'UPDATE_ADMIN', 'user', id, { ...body, ...targetIdentity(updated) }, c);
  return c.json({
    id: updated.id,
    email: updated.email,
    firstName: updated.firstName,
    lastName: updated.lastName,
    isActive: updated.isActive,
    roleId: updated.adminUser?.roleId ?? null,
    roleName: updated.adminUser?.role?.name ?? null,
    permissions: updated.adminUser?.role?.permissions ?? [],
  });
});

admin.delete('/admins/:id', requireAdmin, requirePermission('admins.delete'), async (c) => {
  // Sensitive: removing an admin revokes their access — approve with PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');
  const selfId = c.get('user')?.id;

  if (id === selfId) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'You cannot delete your own account' } }, 400);
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN') {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Only a super admin can delete a super admin — everyone else gets the
  // same 404 their list implies, permission to delete or not.
  if (isSuper(user.adminUser?.role?.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // Revoke panel access and sessions first, then remove the account.
  await prisma.adminUser.deleteMany({ where: { userId: id } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.refreshToken.deleteMany({ where: { userId: id } });

  try {
    await prisma.user.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code === 'P2003') {
      return c.json({
        success: false,
        error: { code: 'IN_USE', message: 'This account has linked records and cannot be deleted. Suspend it instead.' },
      }, 409);
    }
    throw err;
  }

  await logAction(adminUser.userId, 'DELETE_ADMIN', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true });
});

// Regenerate an admin's password: issues a fresh single-use reset link and
// emails it to that admin's address (the UI has no password field — this
// email is the only way a new credential ever reaches an account). Super
// admin only, since it starts sign-in recovery for any account. The link is
// emailed first; a failed send discards it, so a failed request leaves the
// current password untouched. Nothing changes until the link is used.
admin.post('/admins/:id/regenerate-password', requireAdmin, rateLimit('admin.sensitive'), async (c) => {
  const id = c.req.param('id');
  const actor = c.get('admin');
  const actorPerms: unknown[] = Array.isArray(actor?.role?.permissions) ? actor.role.permissions : [];
  if (!actorPerms.includes('*')) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to regenerate passwords.' },
    }, 403);
  }

  // Starting sign-in recovery for another account is sensitive — approve
  // with PIN (#9). After the super check on purpose: a non-super caller
  // gets its403 without a pointless PIN prompt.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  if (!user.email) {
    return c.json({
      success: false,
      error: { code: 'NO_EMAIL', message: 'This admin has no email address, so a reset link cannot be delivered.' },
    }, 400);
  }

  const resetToken = await issuePasswordToken(user.id, 'reset');
  const loginUrl = adminUrl('/login');
  const emailed = await sendAdminInviteEmail({
    to: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    setPasswordUrl: adminUrl(`/reset-password?token=${resetToken}`),
    loginUrl,
    roleName: user.adminUser.role?.name ?? '',
    kind: 'reset',
    expiresLabel: '60 minutes',
  });

  if (!emailed) {
    // Email-first: a link nobody received must not stay live — and the
    // current password was never touched either way.
    await discardPasswordToken(user.id, 'reset');
    return c.json({
      success: false,
      error: {
        code: 'EMAIL_FAILED',
        message: 'The reset link could not be emailed, so the current password was left unchanged. Check the SMTP settings and try again.',
      },
    }, 502);
  }

  await logAction(actor.userId, 'REGENERATE_ADMIN_PASSWORD', 'user', user.id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { email: user.email } });
});

// ============================================
// Two-factor administration (super admin only)
// ============================================

// Require (or release) 2FA for one admin from the Admins list. Requiring
// doesn't provision anything for them — an unenrolled account blocks on the
// setup screen at its next sign-in; an enrolled one starts challenging
// immediately and can no longer be self-disabled. Releasing wipes the
// enrollment entirely (fresh secret when it's turned back on).
admin.patch('/admins/:id/two-factor', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage two-factor authentication.' },
    }, 403);
  }

  const id = c.req.param('id');
  const { required } = c.get('validatedData') as { required: boolean };

  // Sensitive only in the release direction: turning 2FA OFF removes
  // protection (requiring it adds protection and needs no approval).
  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // The wipe below only means something when the account was actually
  // enrolled — remember that before the update for the notice.
  const wasEnrolled = user.twoFactorEnabled;
  const data = required
    ? { twoFactorEnforced: true }
    : { twoFactorEnforced: false, twoFactorEnabled: false, twoFactorMethod: null, twoFactorSecret: null };
  const updated = await prisma.user.update({ where: { id }, data });
  // A code sent for the released enrollment must not linger either.
  clearOtp(user.id);

  if (required && !user.twoFactorEnabled) {
    // The requirement went up for an account that has not enrolled: its
    // already-issued session would keep running for up to 7 days with no
    // challenge at all (#17). Revoke sessions + refresh lineage so the
    // next sign-in walks straight into the enrollment gate.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
  }

  if (!required) {
    // Recovery codes are part of the factor they belong to — they die with it.
    await deleteRecoveryCodes(user.id);
    const targetEmail = user.email;
    if (wasEnrolled && targetEmail) {
      // The owner did not turn this off themselves: tell them, so a
      // covert removal cannot go unnoticed. Resolve who acted — by
      // account NAME, matching the requirement notices — fire-and-forget
      // so a slow or dead mail server never stalls or fails the
      // administrative action.
      void actorNameOf(actor.userId)
        .then((actorName) => sendTwoFactorNoticeEmail(targetEmail, actorName))
        .catch(() => {
          // Deliberately swallowed — see above.
        });
    }
  } else if (!user.twoFactorEnforced && user.email) {
    // The requirement went UP for this account: tell the holder (on the
    // transition only). Queued through the batched notice queue — never
    // inline — so it cannot stall or fail the update above.
    notifyTwoFactorRequired({ email: user.email, enrolled: user.twoFactorEnabled }, actor.userId);
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR' : 'DISABLE_TWO_FACTOR', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({
    success: true,
    data: {
      twoFactorEnabled: updated.twoFactorEnabled,
      twoFactorMethod: updated.twoFactorMethod,
      twoFactorRequired: updated.twoFactorEnforced,
    },
  });
});

// "Require two-factor for all admins" — the switch on the Security page.
// Stored under a Setting key that is deliberately NOT in KEY_PERMISSIONS,
// so the generic settings PUT can never flip it: unknown keys resolve to
// the "*" (super) permission on both read and write.
admin.post('/two-factor-policy', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to change the two-factor policy.' },
    }, 403);
  }

  const { required } = c.get('validatedData') as { required: boolean };

  // Sensitive only when the policy is being dropped — requiring 2FA for
  // everyone adds protection and needs no approval.
  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  // Only the OFF->ON transition notifies: re-issuing a policy that is
  // already standing would re-spam every non-compliant admin.
  const previousPolicy = await prisma.setting.findUnique({ where: { key: 'twoFactorPolicy' } });
  const wasRequired = Boolean((previousPolicy?.value as any)?.requireTwoFactor);

  await prisma.setting.upsert({
    where: { key: 'twoFactorPolicy' },
    update: { value: { requireTwoFactor: required } as any },
    create: { key: 'twoFactorPolicy', value: { requireTwoFactor: required } as any },
  });

  if (required && !wasRequired) {
    // Email every admin still without 2FA — and only those (the enrolled
    // have nothing to do). The recipient query runs after the write
    // above, detached and batched through the notice queue.
    notifyTwoFactorRequiredForAll(actor.userId);

    // Sessions of admins that have not enrolled would otherwise run up to
    // 7 days unchallenged under the new policy (#17) — revoke those
    // sessions and their refresh lineage so everyone re-signs in: the
    // unenrolled meet the enrollment gate, the enrolled (whose sessions
    // already passed a challenge) are left alone.
    const unenrolled = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true, twoFactorEnabled: false },
      select: { id: true },
    });
    if (unenrolled.length > 0) {
      const ids = unenrolled.map((u) => u.id);
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    }
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR_ALL' : 'CLEAR_TWO_FACTOR_POLICY', 'setting', undefined, { required }, c);
  return c.json({ success: true, data: { required } });
});

// §14.61 — the same demand, for USER accounts. One switch per side: this
// never touches `twoFactorPolicy`, the admins' switch never touches this,
// and auth reads each by the signer's role. Super admin only, and PIN-
// approved to lift — dropping a standing protection is the sensitive
// half (the UI arms the button in two clicks like every hard toggle).
admin.post('/users-two-factor-policy', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to change the user two-factor policy.' },
    }, 403);
  }

  const { required } = c.get('validatedData') as { required: boolean };

  if (!required) {
    const pinGate = await requirePinApproval(c);
    if (pinGate) return pinGate;
  }

  const previousPolicy = await prisma.setting.findUnique({ where: { key: 'usersTwoFactorPolicy' } });
  const wasRequired = Boolean((previousPolicy?.value as any)?.requireTwoFactor);

  await prisma.setting.upsert({
    where: { key: 'usersTwoFactorPolicy' },
    update: { value: { requireTwoFactor: required } as any },
    create: { key: 'usersTwoFactorPolicy', value: { requireTwoFactor: required } as any },
  });

  if (required && !wasRequired) {
    // Same #17 reasoning as the admins' switch: sessions of users who
    // have not enrolled would otherwise run on unchallenged; they meet
    // the enrollment gate at their next sign-in instead. Deliberately no
    // notice email here — the requirement-notice template speaks the
    // panel's language ("admin account", Settings → Security) and this
    // side's recipients are portal users; a correctly-worded variant can
    // ride along when the Users section lands.
    const unenrolled = await prisma.user.findMany({
      // Every non-admin row — the enum has CANDIDATE/EMPLOYER/… as roles,
      // so "user accounts" here is "not the panel".
      where: { role: { not: 'ADMIN' }, isActive: true, twoFactorEnabled: false },
      select: { id: true },
    });
    if (unenrolled.length > 0) {
      const ids = unenrolled.map((u) => u.id);
      await prisma.session.deleteMany({ where: { userId: { in: ids } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    }
  }

  await logAction(actor.userId, required ? 'REQUIRE_TWO_FACTOR_USERS' : 'CLEAR_TWO_FACTOR_USERS_POLICY', 'setting', undefined, { required }, c);
  return c.json({ success: true, data: { required } });
});

// ============================================
// Security PIN administration (§14.44)
// ============================================

// Reset an admin's security PIN — the only way a forgotten PIN leaves an
// account (there is no self-service removal: the PIN itself approves, so
// a lost one needs a permission-enabled admin to clear it here). The
// requirement survives the reset, so a demanded account must immediately
// choose a fresh one at its next PIN challenge.
admin.post('/admins/:id/pin-reset', requireAdmin, requirePermission('admins.edit'), rateLimit('admin.sensitive'), async (c) => {
  // Approving a PIN change with the PIN being changed would defeat it —
  // this gate checks the ACTING admin's own PIN.
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const actor = c.get('admin');
  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: { include: { role: true } } },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }
  // Same invisibility rule as delete: a super admin is managed only by a
  // super admin — everyone else gets the 404 their list implies.
  if (isSuper(user.adminUser.role?.permissions) && !isSuper(actor?.role?.permissions)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  await prisma.adminUser.update({
    where: { id: user.adminUser.id },
    data: { pinHash: null, pinSetAt: null, pinAttempts: 0, pinWindowStart: null },
  });
  // The cleared PIN must not inherit the old one's lockout either.
  await clearPinAttempts(user.id);

  await logAction(actor.userId, 'SECURITY_PIN_RESET', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { pinSet: false } });
});

// Super admin: demand (or release) a security PIN for one admin. Demanding
// provisions nothing — the account must set a PIN at its next PIN
// challenge (lock screen or first sensitive action) and can no longer
// leave the panel without one.
admin.patch('/admins/:id/pin-required', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to manage security PINs.' },
    }, 403);
  }

  const id = c.req.param('id');
  const { required } = c.get('validatedData') as { required: boolean };

  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { adminUser: true },
  });
  if (!user || user.role !== 'ADMIN' || !user.adminUser) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Admin not found' } }, 404);
  }

  // Only the OFF->ON transition notifies — re-issuing an already-standing
  // requirement says nothing new. Queued + batched, never inline.
  const wasRequired = user.adminUser.pinRequired;
  await prisma.adminUser.update({ where: { id: user.adminUser.id }, data: { pinRequired: required } });
  if (required && !wasRequired && user.email) {
    notifyPinRequired({ email: user.email, pinSet: Boolean(user.adminUser.pinHash) }, actor.userId);
  }
  await logAction(actor.userId, required ? 'REQUIRE_SECURITY_PIN' : 'CLEAR_SECURITY_PIN_REQUIREMENT', 'user', id, { ...targetIdentity(user) }, c);
  return c.json({ success: true, data: { required } });
});

// "Require security PIN for all admins" — the sibling of the two-factor
// policy, stored the same reserved way (Setting key `pinPolicy`: not in
// KEY_PERMISSIONS, so only super '*' can touch it through the generic
// settings routes).
//
// Unlike the 2FA policy, turning this ON deliberately revokes no
// sessions: the PIN is not a sign-in factor, so there is no "unchallenged
// session" gap to close (#17) — every sensitive call re-reads the policy
// server-side through requirePinApproval, which applies to sessions
// issued months ago exactly as it does to new ones (and fails closed).
admin.post('/pin-policy', requireAdmin, validate(z.object({ required: z.boolean() })), rateLimit('admin.sensitive'), async (c) => {
  const actor = c.get('admin');
  if (!isSuper(actor?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Super admin access is required to change the security PIN policy.' },
    }, 403);
  }

  const { required } = c.get('validatedData') as { required: boolean };

  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  // Only the OFF->ON transition notifies (see the two-factor policy).
  const previousPolicy = await prisma.setting.findUnique({ where: { key: 'pinPolicy' } });
  const wasRequired = Boolean((previousPolicy?.value as any)?.requirePin);

  await prisma.setting.upsert({
    where: { key: 'pinPolicy' },
    update: { value: { requirePin: required } as any },
    create: { key: 'pinPolicy', value: { requirePin: required } as any },
  });

  if (required && !wasRequired) {
    // Email every admin still without a PIN — and only those. Recipient
    // query after the write above, detached and batched.
    notifyPinRequiredForAll(actor.userId);
  }

  await logAction(actor.userId, required ? 'REQUIRE_SECURITY_PIN_ALL' : 'CLEAR_SECURITY_PIN_POLICY', 'setting', undefined, { required }, c);
  return c.json({ success: true, data: { required } });
});

// ============================================
// Feature Flags
// ============================================
admin.get('/features', requireAdmin, requirePermission('maintenance.view'), async (c) => {
  const features = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
  return c.json(features);
});

admin.post('/features', requireAdmin, requirePermission('maintenance.edit'), validate(featureFlagSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.create({ data: body });
  await logAction(adminUser.userId, 'CREATE_FEATURE', 'feature', feature.id, body, c);
  return c.json(feature, 201);
});

admin.patch('/features/:id', requireAdmin, requirePermission('maintenance.edit'), validate(featureFlagSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const feature = await prisma.featureFlag.update({ where: { id }, data: body });
  await logAction(adminUser.userId, 'UPDATE_FEATURE', 'feature', id, body, c);
  return c.json(feature);
});

admin.delete('/features/:id', requireAdmin, requirePermission('maintenance.edit'), async (c) => {
  const id = c.req.param('id');
  const adminUser = c.get('admin');

  await prisma.featureFlag.delete({ where: { id } });
  await logAction(adminUser.userId, 'DELETE_FEATURE', 'feature', id, {}, c);
  return c.json({ success: true });
});

// ============================================
// Maintenance Mode
// ============================================
admin.get('/maintenance', requireAdmin, requirePermission('maintenance.view'), async (c) => {
  const mode = await prisma.maintenanceMode.findFirst({ where: { isActive: true } });
  return c.json(mode || { isActive: false });
});

admin.post('/maintenance', requireAdmin, requirePermission('maintenance.edit'), validate(maintenanceModeSchema), async (c) => {
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  // Deactivate any existing maintenance
  await prisma.maintenanceMode.updateMany({ where: { isActive: true }, data: { isActive: false } });

  const mode = await prisma.maintenanceMode.create({
    data: { ...body, createdBy: adminUser.userId },
  });
  await logAction(adminUser.userId, 'SET_MAINTENANCE', 'maintenance', mode.id, body, c);
  return c.json(mode);
});

// ============================================
// Reports
// ============================================
admin.get('/reports', requireAdmin, requirePermission('reports.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'));
  const status = c.req.query('status');

  const where: any = {};
  if (status) where.status = status;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // Only identity fields the reports list shows. A raw `reporter: true`
      // would hand a reports.view admin every user's full row, including
      // passwordHash + twoFactorSecret (#3).
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return c.json({ reports, total, page, limit, totalPages: Math.ceil(total / limit) });
});

admin.patch('/reports/:id', requireAdmin, requirePermission('reports.edit'), validate(reportSchema.partial()), async (c) => {
  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const report = await prisma.report.update({
    where: { id },
    data: { ...body, reviewedBy: adminUser.userId, reviewedAt: new Date() },
  });

  await logAction(adminUser.userId, 'REVIEW_REPORT', 'report', id, body, c);
  return c.json(report);
});

// ============================================
// Activity feed — typed view over the action log (the /activity-logs page)
// ============================================
admin.get('/activity', requireAdmin, requirePermission('audit.view'), async (c) => {
  const page = clampPage(c.req.query('page'));
  const limit = clampLimit(c.req.query('limit'), 25);
  const type = c.req.query('type') || 'all';

  if (!isActivityType(type)) {
    return c.json({
      success: false,
      error: { code: 'INVALID_TYPE', message: `Unknown activity type. Valid: ${ACTIVITY_TYPES.join(', ')}` },
    }, 400);
  }

  // Server-side search + date range (the /activity-logs filter bar).
  // Every word of `q` must match somewhere (AND over tokens) and any
  // searchable field can satisfy it (OR inside) — so "E2E Activity"
  // finds a row whose actor is E2E Activity even though the name is
  // stored in two columns. Plain columns match case-insensitively;
  // `details` is JSON, where Prisma's string_contains is case-sensitive
  // AND needs an explicit path (without one it only matches a
  // top-level JSON string, never our object) — the paths below are the
  // very fields the row card displays, plus the query's lowercase form
  // so a caps-typed email still hits its lowercase stored copy.
  // Both filters fold into the SAME `where` that drives the items, the
  // count and the summary, so pagination stays correct server-side.
  const q = (c.req.query('q') ?? '').trim().slice(0, 200);
  const from = c.req.query('from') ?? '';
  const to = c.req.query('to') ?? '';
  const dayOnly = /^\d{4}-\d{2}-\d{2}$/;
  // Bounds come in two shapes: `YYYY-MM-DD` — a whole UTC day, the
  // simple API form — or a full ISO instant, which is what the filter
  // bar sends. Rows DISPLAY with toLocaleString() in the admin's
  // browser, so the day boundaries have to be built in that same
  // timezone (local midnight → instant) or the selected range
  // disagrees with the dates on screen by the whole UTC offset.
  const parseBound = (raw: string, edge: 'start' | 'end'): Date | null | 'invalid' => {
    if (!raw) return null;
    let d: Date;
    if (dayOnly.test(raw)) {
      d = new Date(edge === 'start' ? `${raw}T00:00:00.000Z` : `${raw}T23:59:59.999Z`);
    } else if (raw.includes('T')) {
      d = new Date(raw);
    } else {
      return 'invalid';
    }
    return Number.isNaN(d.getTime()) ? 'invalid' : d;
  };
  const fromD = parseBound(from, 'start');
  const toD = parseBound(to, 'end');
  if (fromD === 'invalid' || toD === 'invalid') {
    return c.json({
      success: false,
      error: { code: 'INVALID_DATE', message: "from/to must be '2026-10-01' or an ISO instant" },
    }, 400);
  }

  const filters: Record<string, unknown>[] = [];
  if (q) {
    const tokens = q.split(/\s+/).filter(Boolean).slice(0, 10);
    const detailKeys = ['name', 'email', 'device', 'title', 'company', 'subject', 'to', 'reason', 'method', 'error', 'provider', 'phone', 'theme', 'language', 'label'];
    filters.push({
      AND: tokens.map((tok) => ({
        OR: [
          { action: { contains: tok, mode: 'insensitive' } },
          { targetType: { contains: tok, mode: 'insensitive' } },
          { ipAddress: { contains: tok, mode: 'insensitive' } },
          { userAgent: { contains: tok, mode: 'insensitive' } },
          {
            admin: {
              OR: [
                { email: { contains: tok, mode: 'insensitive' } },
                { firstName: { contains: tok, mode: 'insensitive' } },
                { lastName: { contains: tok, mode: 'insensitive' } },
              ],
            },
          },
          ...detailKeys.map((key) => ({ details: { path: [key], string_contains: tok } })),
          ...(tok.toLowerCase() === tok
            ? []
            : detailKeys.map((key) => ({ details: { path: [key], string_contains: tok.toLowerCase() } }))),
        ],
      })),
    });
  }
  // Day-granular bounds: an ISO instant is used verbatim, a bare date
  // becomes a UTC day (start/end edge respectively).
  if (fromD) filters.push({ createdAt: { gte: fromD } });
  if (toD) filters.push({ createdAt: { lte: toD } });

  const where = filters.length ? { AND: [activityWhere(type), ...filters] } : activityWhere(type);
  const [items, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      // The actor: for LOGIN rows that is the account that signed in; for
      // CREATE_JOB rows the employer's account (AdminAction.adminId is a
      // plain User FK, so non-admin actors are legal); null for system
      // rows (SMTP deliveries) — rendered as "System". The adminUser
      // presence is what splits admin activity from web-app user
      // activity, so the join carries it.
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            adminUser: { select: { id: true } },
          },
        },
      },
    }),
    prisma.adminAction.count({ where }),
  ]);

  // The SMTP section doubles as the delivery counter: how many sends
  // succeeded and how many failed — over the SAME search/date filters
  // as the list, so the chips always describe the rows below them.
  let summary: { sent: number; failed: number } | null = null;
  if (type === 'smtp') {
    const [sent, failed] = await Promise.all([
      prisma.adminAction.count({ where: { AND: [where, { action: 'EMAIL_SENT' }] } }),
      prisma.adminAction.count({ where: { AND: [where, { action: 'EMAIL_FAILED' }] } }),
    ]);
    summary = { sent, failed };
  }

  return c.json({
    success: true,
    data: {
      type,
      // Per-row section, so the All view can badge each entry without
      // re-deriving the partition on the client.
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        category: activityCategory(item.action, item.targetType, item.admin),
        targetType: item.targetType,
        targetId: item.targetId,
        details: item.details,
        ipAddress: item.ipAddress,
        userAgent: item.userAgent,
        createdAt: item.createdAt,
        actor: item.admin
          ? {
              id: item.admin.id,
              email: item.admin.email,
              name: [item.admin.firstName, item.admin.lastName].filter(Boolean).join(' ') || item.admin.email,
            }
          : null,
      })),
      summary,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// ============================================
// Roles (permission sets for the role-based system)
// ============================================
admin.get('/roles', requireAdmin, requirePermission('roles.view'), async (c) => {
  const roles = await prisma.adminRole.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  return c.json(roles);
});

admin.post('/roles', requireAdmin, requirePermission('roles.create'), validate(adminRoleSchema), rateLimit('admin.roles'), async (c) => {
  // Creating a role can mint "*" — approval with PIN before anything else
  // (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  // Escalation guard beyond roles.create (#4): minting a "*" role is
  // super-only, and every permission in the new role must already be held
  // by the actor — checked before anything else so a rejected grant never
  // reaches the duplicate check or the write.
  const deniedGrant = grantDenied(adminUser?.role?.permissions, body.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }

  const duplicate = await prisma.adminRole.findUnique({ where: { name: body.name } });
  if (duplicate) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'A role with this name already exists' } }, 409);
  }

  const role = await prisma.adminRole.create({
    data: body,
    include: { _count: { select: { users: true } } },
  });
  await logAction(adminUser.userId, 'CREATE_ROLE', 'role', role.id, body, c);
  return c.json(role, 201);
});

admin.put('/roles/:id', requireAdmin, requirePermission('roles.edit'), validate(adminRoleSchema), rateLimit('admin.roles'), async (c) => {
  // Editing a role's grants is the classic escalation path — approve with
  // PIN first (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const body = c.get('validatedData');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  // Escalation guards beyond roles.edit (#4): touching a role that
  // CURRENTLY holds "*" is super-only (even a downgrade of it), and the
  // incoming permission list obeys the same "cannot grant beyond what you
  // hold" rule as create. Checked before the duplicate lookup or write, so
  // a rejected grant never mutates anything.
  if (isSuper(role.permissions) && !isSuper(adminUser?.role?.permissions)) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Only a super admin can edit a role with the "*" (super admin) permission.' },
    }, 403);
  }
  const deniedGrant = grantDenied(adminUser?.role?.permissions, body.permissions);
  if (deniedGrant) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: deniedGrant } }, 403);
  }
  if (role.name !== body.name) {
    const duplicate = await prisma.adminRole.findUnique({ where: { name: body.name } });
    if (duplicate) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'A role with this name already exists' } }, 409);
    }
  }

  const updated = await prisma.adminRole.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description ?? null,
      permissions: body.permissions,
    },
    include: { _count: { select: { users: true } } },
  });

  await logAction(adminUser.userId, 'UPDATE_ROLE', 'role', id, { name: updated.name }, c);
  return c.json(updated);
});

admin.delete('/roles/:id', requireAdmin, requirePermission('roles.delete'), rateLimit('admin.roles'), async (c) => {
  // Removing a role is destructive like every other delete here (#9).
  const pinGate = await requirePinApproval(c);
  if (pinGate) return pinGate;

  const id = c.req.param('id');
  const adminUser = c.get('admin');

  const role = await prisma.adminRole.findUnique({ where: { id } });
  if (!role) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Role not found' } }, 404);
  }
  if (role.isSystem) {
    return c.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'The system role cannot be deleted' } }, 400);
  }
  const assigned = await prisma.adminUser.count({ where: { roleId: id } });
  if (assigned > 0) {
    return c.json({ success: false, error: { code: 'IN_USE', message: `Role is assigned to ${assigned} admin(s)` } }, 409);
  }

  await prisma.adminRole.delete({ where: { id } });
  await logAction(adminUser.userId, 'DELETE_ROLE', 'role', id, { name: role.name }, c);
  return c.json({ success: true });
});

export default admin;
