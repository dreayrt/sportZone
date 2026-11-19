"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
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
  ShieldCheck,
  Tag,
  Home,
  ArrowLeft,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const COLLAPSE_KEY = "sz_sidebar_collapsed";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem(COLLAPSE_KEY, current ? "0" : "1");
      return !current;
    });
  };

  const role = user?.role || "customer";

  // Navigation sets
  const customerNav = [
    { title: "Tổng quan", href: "/dashboard/customer", icon: LayoutDashboard },
    {
      title: "Lịch sử đặt sân",
      href: "/dashboard/customer/bookings",
      icon: CalendarCheck,
    },
    { title: "Kèo của tôi", href: "/dashboard/customer/matches", icon: Users },
    {
      title: "Tích điểm & Hạng",
      href: "/dashboard/customer/loyalty",
      icon: Award,
    },
    {
      title: "Mã giới thiệu",
      href: "/dashboard/customer/referral",
      icon: Users,
    },
    { title: "Hồ sơ cá nhân", href: "/dashboard/customer/profile", icon: User },
  ];

  const ownerNav = [
    {
      title: "Tổng quan vận hành",
      href: "/dashboard/owner",
      icon: LayoutDashboard,
    },
    {
      title: "Lưới lịch sân",
      href: "/dashboard/owner/calendar",
      icon: CalendarDays,
    },
    {
      title: "Quản lý sân đấu",
      href: "/dashboard/owner/courts",
      icon: CircleDot,
    },
    {
      title: "Đơn đặt & Check-in",
      href: "/dashboard/owner/bookings",
      icon: CalendarCheck,
    },
    {
      title: "Dịch vụ & Đồ uống",
      href: "/dashboard/owner/addons",
      icon: ShoppingBag,
    },
    {
      title: "Mã khuyến mãi",
      href: "/dashboard/owner/vouchers",
      icon: Tag,
    },
    { title: "Hồ sơ cơ sở", href: "/dashboard/owner/venues", icon: Building2 },
    {
      title: "Lịch sân cơ sở",
      href: "/dashboard/owner/venues/calendar",
      icon: CalendarDays,
    },
  ];

  const adminNav = [
    {
      title: "Thống kê toàn hệ thống",
      href: "/dashboard/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Lịch sân cơ sở",
      href: "/dashboard/admin/calendar",
      icon: CalendarDays,
    },
    {
      title: "Đơn đặt toàn sàn",
      href: "/dashboard/admin/bookings",
      icon: CalendarCheck,
    },
    {
      title: "Giám sát cơ sở",
      href: "/dashboard/admin/venues",
      icon: Building2,
    },
    {
      title: "Quản lý người dùng",
      href: "/dashboard/admin/users",
      icon: Users,
    },
    {
      title: "Kiểm duyệt đánh giá",
      href: "/dashboard/admin/reviews",
      icon: Star,
    },
    {
      title: "Danh mục môn thể thao",
      href: "/dashboard/admin/categories",
      icon: CircleDot,
    },
    { title: "Mã khuyến mãi", href: "/dashboard/admin/vouchers", icon: Tag },
    {
      title: "Nhật ký quản trị",
      href: "/dashboard/admin/audit-logs",
      icon: ShieldCheck,
    },
    {
      title: "Cấu hình hệ thống",
      href: "/dashboard/admin/settings",
      icon: Sliders,
    },
  ];

  const navItems =
    role === "admin" ? adminNav : role === "owner" ? ownerNav : customerNav;

  const roleLabels = {
    customer: { label: "Khách hàng", badge: "neutral" as const },
    owner: { label: "Chủ cơ sở", badge: "info" as const },
    admin: { label: "Quản trị viên", badge: "warning" as const },
  };

  return (
    <>
      <div className="border-b border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950 sm:hidden">
        <details key={pathname}>
          <summary className="cursor-pointer text-sm font-semibold">
            SportZone · Menu {roleLabels[role].label}
          </summary>
          <nav className="mt-3 grid grid-cols-2 gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm ${pathname === item.href ? "bg-sport-50 font-semibold text-sport-700 dark:bg-sport-950 dark:text-sport-400" : "bg-neutral-50 dark:bg-neutral-900"}`}
              >
                {item.title}
              </Link>
            ))}
            <Link href="/" className="px-3 py-2 text-sm">
              Về trang chủ
            </Link>
          </nav>
        </details>
      </div>
      <aside
        className={cn(
          "relative hidden sm:flex shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex-col justify-between h-screen sticky top-0 overflow-visible transition-[width] duration-300 ease-in-out z-40",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
          className="absolute top-4 -right-3.5 z-40 flex items-center justify-center w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400 shadow-sm hover:text-neutral-900 dark:hover:text-white hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          )}
        </button>
        {/* Brand & Role Header */}
        <div className="min-w-0">
          <div className="h-16 border-b border-neutral-200 dark:border-neutral-800 px-3 flex items-center justify-between gap-2">
            <Link
              href="/"
              className={cn("flex items-center gap-2.5 min-w-0", collapsed && "mx-auto")}
              title="SportZone"
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 font-bold text-sm tracking-tighter">
                <span className="text-sport-500 font-extrabold">S</span>
                <span className="text-xs">Z</span>
              </div>
              {!collapsed && (
                <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
                  SportZone
                </span>
              )}
            </Link>
            {!collapsed && (
              <Badge
                variant={roleLabels[role].badge}
                size="sm"
                className="text-[10px] uppercase font-semibold shrink-0"
              >
                {roleLabels[role].label}
              </Badge>
            )}
          </div>

          {/* Menu Navigation */}
          <div className="p-3">
            {!collapsed && (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 px-3 py-2">
                Phân hệ {roleLabels[role].label}
              </div>
            )}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 text-sm font-medium rounded-lg transition-all",
                      collapsed ? "justify-center w-10 h-10 mx-auto" : "px-3 py-2",
                      isActive
                        ? "bg-sport-50 text-sport-700 dark:bg-sport-950/40 dark:text-sport-400 font-semibold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-200"
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0",
                        collapsed ? "w-5 h-5" : "w-4 h-4",
                        isActive
                          ? "text-sport-600 dark:text-sport-400"
                          : "text-neutral-500 dark:text-neutral-300"
                      )}
                      strokeWidth={2}
                    />
                    {!collapsed && <span className="truncate">{item.title}</span>}
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
            title="Về Cổng đặt sân SportZone"
            className={cn(
              "flex items-center gap-2 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-lg transition-colors mb-2",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            {collapsed ? (
              <Home className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            ) : (
              <>
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
                <span className="truncate">Về Cổng đặt sân SportZone</span>
              </>
            )}
          </Link>
          <div
            className={cn(
              "flex items-center gap-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800/80",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <div className="w-8 h-8 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300 uppercase">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                  {user?.full_name || "Người dùng"}
                </span>
                <span className="text-[11px] text-neutral-400 truncate">
                  {user?.phone || user?.email || "SportZone User"}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
