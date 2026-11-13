'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { useAuth } from '@/context/AuthContext';
import { getDashboardByRole } from '@/lib/auth-redirect';

const SECTION_ROLE: Record<string, 'customer' | 'owner' | 'admin'> = {
  customer: 'customer',
  owner: 'owner',
  admin: 'admin',
};

function GuardScreen({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="w-full max-w-md space-y-3 rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-neutral-500 dark:text-neutral-400">{description}</p>}
        {children}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const section = pathname.split('/')[2] ?? '';
  const requiredRole = SECTION_ROLE[section];
  const isWrongRole = !!user && !!requiredRole && user.role !== requiredRole && user.role !== 'admin';

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (requiredRole) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    if (isWrongRole) {
      router.replace(getDashboardByRole(user.role));
    }
  }, [isLoading, user, requiredRole, isWrongRole, pathname, router]);

  if (isLoading) {
    return <GuardScreen title="Đang kiểm tra quyền truy cập…" />;
  }

  if (!user) {
    return <GuardScreen title="Đang chuyển đến trang đăng nhập…" />;
  }

  if (user.status === 'blocked') {
    return (
      <GuardScreen
        title="Tài khoản đã bị khóa"
        description="Vui lòng liên hệ quản trị viên để được hỗ trợ."
      >
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-2 inline-flex items-center justify-center rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Đăng xuất
        </button>
      </GuardScreen>
    );
  }

  if (isWrongRole) {
    return <GuardScreen title="Đang chuyển về bảng điều khiển…" />;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
