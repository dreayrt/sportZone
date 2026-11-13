/**
 * Chỉ cho phép redirect nội bộ (chống open-redirect).
 * Trả về path an toàn hoặc null.
 */
export function getSafeRedirect(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
}

export function getDashboardByRole(role: string): string {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'owner') return '/dashboard/owner';
  return '/dashboard/customer';
}

export type DashboardRole = 'customer' | 'owner' | 'admin';

/** Role sở hữu một path /dashboard/*, null nếu path không thuộc khu vực nào. */
export function getRequiredRoleForPath(path: string): DashboardRole | null {
  const section = path.split('?')[0].split('/')[2] ?? '';
  if (section === 'customer' || section === 'owner' || section === 'admin') {
    return section;
  }
  return null;
}

const PENDING_REDIRECT_KEY = 'sz_post_login_redirect';

export function savePendingRedirect(path: string | null): void {
  if (typeof window === 'undefined') return;
  if (path) sessionStorage.setItem(PENDING_REDIRECT_KEY, path);
}

export function consumePendingRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  const value = sessionStorage.getItem(PENDING_REDIRECT_KEY);
  sessionStorage.removeItem(PENDING_REDIRECT_KEY);
  return getSafeRedirect(value);
}
