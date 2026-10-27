'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  Compass, 
  Trophy, 
  Flame,
  Zap,
  User, 
  Building2, 
  ShieldCheck, 
  Users,
  ArrowRight,
  LogOut
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isDashboard = pathname.startsWith('/dashboard');

  if (isDashboard) {
    return null; // Dashboard has its own sidebar & header
  }

  const getDashboardLink = () => {
    if (!user) return '/auth/login';
    if (user.role === 'admin') return '/dashboard/admin';
    if (user.role === 'owner') return '/dashboard/owner';
    return '/dashboard/customer';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'owner':
        return 'Chủ sân';
      case 'customer':
      default:
        return 'Khách hàng';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/80 bg-white/90 backdrop-blur-md dark:border-neutral-800 dark:bg-neutral-950/90 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Nav items */}
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 font-bold tracking-tighter shadow-sm transition-transform duration-200 group-hover:scale-105">
              <span className="text-sport-500 font-black text-lg">S</span>
              <span className="text-xs font-semibold">Z</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5 leading-none">
                SportZone
                <span className="w-1.5 h-1.5 rounded-full bg-sport-500 inline-block"></span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-wider uppercase mt-1">
                Đặt Sân Thể Thao
              </span>
            </div>
          </Link>

          {/* Navigation Links - Clean, single-line, refined stroke icons */}
          <nav className="hidden lg:flex items-center gap-1">
            <Link
              href="/venues"
              className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Compass className="w-4 h-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
              <span>Tìm sân thể thao</span>
            </Link>
            <Link
              href="/venues?sport=pickleball"
              className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Flame className="w-4 h-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
              <span>Pickleball & Tennis</span>
            </Link>
            <Link
              href="/venues?sport=football"
              className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
              <span>Bóng đá mini</span>
            </Link>
            <Link
              href="/venues?sport=badminton"
              className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Zap className="w-4 h-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
              <span>Cầu lông</span>
            </Link>
            <Link
              href="/matches"
              className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-neutral-500 shrink-0" strokeWidth={1.5} />
              <span>Ghép kèo</span>
            </Link>
          </nav>
        </div>

        {/* Right Auth actions - No fake role switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              {/* User Profile Pill */}
              <Link 
                href={getDashboardLink()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                  {user.role === 'admin' && <ShieldCheck className="w-4 h-4 text-amber-500" strokeWidth={1.5} />}
                  {user.role === 'owner' && <Building2 className="w-4 h-4 text-sky-500" strokeWidth={1.5} />}
                  {user.role === 'customer' && <User className="w-4 h-4 text-sport-600 dark:text-sport-400" strokeWidth={1.5} />}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 leading-none max-w-[130px] truncate">
                    {user.full_name}
                  </span>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </Link>

              {/* Enter Dashboard CTA */}
              <Link href={getDashboardLink()}>
                <Button variant="primary" size="sm" className="gap-1.5 whitespace-nowrap font-medium">
                  <span>Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Button>
              </Link>

              {/* Logout Button */}
              <button
                onClick={() => logout()}
                title="Đăng xuất"
                className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                aria-label="Đăng xuất"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="font-medium text-neutral-700 dark:text-neutral-200">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm" className="font-medium shadow-xs">
                  Đăng ký tài khoản
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
