'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Server,
  ArrowUpRight,
  TrendingUp,
  Globe2,
  Users,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface AdminDashboardBannerProps {
  totalVenues?: number;
  totalUsers?: number;
  monthlyGmv?: number;
  systemUptime?: string;
}

export function AdminDashboardBanner({
  totalVenues = 32,
  totalUsers = 1280,
  monthlyGmv = 148500000,
  systemUptime = '99.98%',
}: AdminDashboardBannerProps) {
  return (
    // Double-Bezel Architecture: Outer Shell
    <div className="relative p-1.5 sm:p-2 rounded-[2rem] bg-neutral-900/5 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 shadow-sm transition-all duration-300">
      {/* Double-Bezel Architecture: Inner Core */}
      <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-neutral-950 text-white min-h-[340px] sm:min-h-[290px] flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        {/* Background Artwork Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/banners/admin-banner.jpg"
            alt="SportZone Global Sports Infrastructure"
            fill
            priority
            className="object-cover object-center scale-105"
          />
          {/* Multi-layered Graded Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/90 to-neutral-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/30" />
          {/* Subtle Emerald Mesh */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-sport-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between flex-1">
          {/* Header Row: Eyebrow + Live System Beacon */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] border border-sport-400/30 bg-sport-500/15 text-sport-300 backdrop-blur-md">
              <Server className="w-3 h-3 text-sport-400" strokeWidth={2} />
              <span>SPORTZONE CORE INFRASTRUCTURE • TOÀN MẠNG LƯỚI</span>
            </div>

            {/* Platform Health Telemetry Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-medium bg-neutral-900/80 border border-white/10 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sport-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sport-500" />
              </span>
              <span className="text-neutral-300">
                Hệ thống ổn định: <span className="text-sport-400 font-bold">{systemUptime}</span> (38ms)
              </span>
            </div>
          </div>

          {/* Main Title & Ecosystem Scope */}
          <div className="max-w-2xl space-y-3 my-auto py-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-sport-300 bg-sport-950/70 border border-sport-500/30 px-3 py-1 rounded-full backdrop-blur-sm">
              <TrendingUp className="w-3.5 h-3.5 text-sport-400" strokeWidth={2} />
              <span>Tăng trưởng GMV Quý 3: +24.8% • 118 Sân thi đấu đồng bộ</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
              Điều Phối 32 Cụm Sân Thể Thao & Cổng Thanh Toán Tự Động Toàn Quốc
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              Cơ chế phân bổ thời gian thực và xác thực giao dịch VietQR/MoMo đang xử lý lưu lượng đặt sân ổn định trên toàn quốc. Đảm bảo quyết toán minh bạch cho toàn bộ chủ cơ sở đối tác.
            </p>
          </div>

          {/* Bottom Bar: Nested Action CTAs + Metric Clusters */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 mt-3">
            {/* Nested Island Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/admin/users" className="group">
                <div className="inline-flex items-center gap-3 rounded-full bg-sport-500 hover:bg-sport-400 text-neutral-950 font-bold text-xs sm:text-sm pl-5 pr-1.5 py-1.5 sm:py-2 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-sport-500/20">
                  <span>Quản Trị Người Dùng & Sân</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-950/15 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-4 h-4 text-neutral-950" strokeWidth={2.2} />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/admin/audit-logs">
                <button className="rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sport-400" strokeWidth={1.75} />
                  <span>Kiểm Toán Nhật Ký Hệ Thống</span>
                </button>
              </Link>
            </div>

            {/* Quick Metrics Cluster */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-neutral-900/70 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
                <Globe2 className="w-4 h-4 text-sport-400" strokeWidth={1.75} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Cụm Sân Active
                  </span>
                  <span className="text-xs font-bold font-mono text-sport-300">
                    {totalVenues} Cụm (118 sân)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-neutral-900/70 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
                <Users className="w-4 h-4 text-sky-400" strokeWidth={1.75} />
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Tài khoản toàn sàn
                  </span>
                  <span className="text-xs font-bold font-mono text-sky-300">
                    {totalUsers.toLocaleString()} Users
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
