// Permission catalog for the role-based admin system.
//
// A permission is a flat "resource.action" string (e.g. "admins.delete") or
// the wildcard "*" (super admin, bypasses every check). Resources and their
// meaningful actions are listed here; the API enforces each grant on the
// matching route (see packages/api/src/middleware/auth.ts and routes).

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionResource {
  key: string;
  /** Translation key for the resource label (must exist in translations.ts). */
  labelKey:
    | 'permRes.dashboard'
    | 'permRes.users'
    | 'permRes.admins'
    | 'permRes.roles'
    | 'permRes.content'
    | 'permRes.team'
    | 'permRes.support'
    | 'permRes.reports'
    | 'permRes.audit'
    | 'permRes.maintenance'
    | 'permRes.general'
    | 'permRes.storage'
    | 'permRes.email'
    | 'permRes.captcha'
    | 'permRes.security'
    | 'permRes.loginProviders'
    | 'permRes.offices'
    | 'permRes.organization'
    | 'permRes.payment'
    | 'permRes.gateway';
  actions: PermissionAction[];
}

export const ALL_ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

export const PERMISSION_RESOURCES: PermissionResource[] = [
  { key: 'dashboard', labelKey: 'permRes.dashboard', actions: ['view'] },
  { key: 'users', labelKey: 'permRes.users', actions: ['view', 'edit'] },
  { key: 'admins', labelKey: 'permRes.admins', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'roles', labelKey: 'permRes.roles', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'content', labelKey: 'permRes.content', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'team', labelKey: 'permRes.team', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'support', labelKey: 'permRes.support', actions: ['view', 'edit'] },
  { key: 'reports', labelKey: 'permRes.reports', actions: ['view', 'edit'] },
  { key: 'audit', labelKey: 'permRes.audit', actions: ['view'] },
  { key: 'maintenance', labelKey: 'permRes.maintenance', actions: ['view', 'edit'] },
  { key: 'general', labelKey: 'permRes.general', actions: ['view', 'edit'] },
  { key: 'storage', labelKey: 'permRes.storage', actions: ['view', 'edit'] },
  { key: 'email', labelKey: 'permRes.email', actions: ['view', 'edit'] },
  { key: 'captcha', labelKey: 'permRes.captcha', actions: ['view', 'edit'] },
  { key: 'security', labelKey: 'permRes.security', actions: ['view', 'edit'] },
  { key: 'loginProviders', labelKey: 'permRes.loginProviders', actions: ['view', 'edit'] },
  { key: 'offices', labelKey: 'permRes.offices', actions: ['view', 'edit'] },
  { key: 'organization', labelKey: 'permRes.organization', actions: ['view', 'edit'] },
  { key: 'payment', labelKey: 'permRes.payment', actions: ['view', 'edit'] },
  { key: 'gateway', labelKey: 'permRes.gateway', actions: ['view', 'edit'] },
];

export function can(permissions: string[] | null | undefined, permission: string): boolean {
  if (!permissions) return false;
  return permissions.includes('*') || permissions.includes(permission);
}

export function isFullAccess(permissions: string[] | null | undefined): boolean {
  return !!permissions && permissions.includes('*');
}
