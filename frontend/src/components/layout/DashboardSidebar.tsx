'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/ui/Badge';
import {
  LayoutDashboard,
  CalendarCheck,
  Award,
  Users,
  User,
  Building2,
  CalendarDays,
  CircleDot,
  ShoppingBag,
  Sliders,
  History,
  ShieldCheck,
  Home,
  ArrowLeft
} from 'lucide-react';

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const role = user?.role || 'customer';

  // Navigation sets
  const customerNav = [
    { title: 'Tổng quan', href: '/dashboard/customer', icon: LayoutDashboard },
    { title: 'Lịch sử đặt sân', href: '/dashboard/customer/bookings', icon: CalendarCheck },
    { title: 'Tích điểm & Hạng', href: '/dashboard/customer/loyalty', icon: Award },
    { title: 'Mã giới thiệu', href: '/dashboard/customer/referral', icon: Users },
    { title: 'Hồ sơ cá nhân', href: '/dashboard/customer/profile', icon: User },
  ];

  const ownerNav = [
    { title: 'Tổng quan vận hành', href: '/dashboard/owner', icon: LayoutDashboard },
    { title: 'Lưới lịch sân', href: '/dashboard/owner/calendar', icon: CalendarDays },
    { title: 'Quản lý sân đấu', href: '/dashboard/owner/courts', icon: CircleDot },
    { title: 'Đơn đặt & Check-in', href: '/dashboard/owner/bookings', icon: CalendarCheck },
    { title: 'Dịch vụ & Đồ uống', href: '/dashboard/owner/addons', icon: ShoppingBag },
    { title: 'Hồ sơ cơ sở', href: '/dashboard/owner/venues', icon: Building2 },
  ];

  const adminNav = [
    { title: 'Thống kê toàn hệ thống', href: '/dashboard/admin', icon: LayoutDashboard },
    { title: 'Quản lý người dùng', href: '/dashboard/admin/users', icon: Users },
    { title: 'Danh mục môn thể thao', href: '/dashboard/admin/categories', icon: CircleDot },
    { title: 'Cấu hình hệ thống', href: '/dashboard/admin/settings', icon: Sliders },
    { title: 'Nhật ký kiểm toán', href: '/dashboard/admin/audit-logs', icon: History },
  ];

  const navItems = role === 'admin' ? adminNav : role === 'owner' ? ownerNav : customerNav;

  const roleLabels = {
    customer: { label: 'Khách hàng', badge: 'neutral' as const },
    owner: { label: 'Chủ cơ sở', badge: 'info' as const },
    admin: { label: 'Quản trị viên', badge: 'warning' as const },
  };

  return (
    <aside className="w-64 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col justify-between h-screen sticky top-0">
      {/* Brand & Role Header */}
      <div>
        <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 px-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 font-bold text-sm tracking-tighter">
              <span className="text-sport-500 font-extrabold">S</span>
              <span className="text-xs">Z</span>
            </div>
            <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white">
              SportZone
            </span>
          </Link>
          <Badge variant={roleLabels[role].badge} size="sm" className="text-[10px] uppercase font-semibold">
            {roleLabels[role].label}
          </Badge>
        </div>

        {/* Menu Navigation */}
        <div className="p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2">
            Phân hệ {roleLabels[role].label}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-sport-50 text-sport-700 dark:bg-sport-950/40 dark:text-sport-400 font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-sport-600 dark:text-sport-400' : 'text-neutral-400 dark:text-neutral-500'
                    }`}
                    strokeWidth={1.5}
                  />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Back to Home & User Info */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Về Cổng đặt sân SportZone</span>
        </Link>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
              {user?.full_name || 'Người dùng'}
            </span>
            <span className="text-[11px] text-neutral-400 truncate">
              {user?.phone || user?.email || 'SportZone User'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
