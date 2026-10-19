'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { NotificationDropdown } from '@/components/notifications/NotificationDropdown';
import { LogOut, ExternalLink, ShieldCheck, Building2, User } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({ title, description, actions }: DashboardHeaderProps) {
  const { user, logout } = useAuth();

  const getRoleBadge = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40">
            <ShieldCheck className="w-3 h-3" strokeWidth={1.5} />
            Quản trị viên
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400 border border-sky-200/60 dark:border-sky-900/40">
            <Building2 className="w-3 h-3" strokeWidth={1.5} />
            Chủ cụm sân
          </span>
        );
      case 'customer':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sport-50 text-sport-700 dark:bg-sport-950/40 dark:text-sport-400 border border-sport-200/60 dark:border-sport-900/40">
            <User className="w-3 h-3" strokeWidth={1.5} />
            Khách hàng
          </span>
        );
    }
  };

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Custom Actions if provided by individual page */}
        {actions}

        {/* View Public Site Link */}
        <Link
          href="/"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors border border-neutral-200/60 dark:border-neutral-800"
        >
          <span>Trang chủ</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" strokeWidth={1.5} />
        </Link>

        {/* Current User Info & Role Badge */}
        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-neutral-200 dark:border-neutral-800">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">
                {user.full_name}
              </div>
              <div className="mt-0.5">
                {getRoleBadge()}
              </div>
            </div>
          </div>
        )}

        <NotificationDropdown />

        {/* Logout */}
        <button
          onClick={() => logout()}
          title="Đăng xuất khỏi hệ thống"
          className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="Đăng xuất"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
}
