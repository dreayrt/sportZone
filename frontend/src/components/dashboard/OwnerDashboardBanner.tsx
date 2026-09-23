'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TrendingUp,
  Activity,
  CalendarCheck,
  Zap,
  ArrowUpRight,
  Sliders,
  CheckCircle2,
  Building2,
  QrCode
} from 'lucide-react';

interface OwnerDashboardBannerProps {
  venueName?: string;
  todayRevenue?: number;
  occupancyRate?: number;
  bookingsCount?: number;
}

export function OwnerDashboardBanner({
  venueName = 'SportZone Chấn Hưng Complex',
  todayRevenue = 3250000,
  occupancyRate = 92,
  bookingsCount = 18,
}: OwnerDashboardBannerProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    // Double-Bezel Architecture: Outer Shell
    <div className="relative p-1.5 sm:p-2 rounded-[2rem] bg-neutral-900/5 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 shadow-sm transition-all duration-300">
      {/* Double-Bezel Architecture: Inner Core */}
      <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-neutral-950 text-white min-h-[340px] sm:min-h-[290px] flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        {/* Background Artwork Layer */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/banners/owner-banner.jpg"
            alt="SportZone Arena Operations Center"
            fill
            priority
            className="object-cover object-center scale-105"
          />
          {/* Multi-layered Graded Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/25" />
          {/* Subtle Emerald Mesh */}
          <div className="absolute -top-24 right-0 w-96 h-96 bg-sport-500/15 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Content Layer */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between flex-1">
          {/* Header Row: Eyebrow + Live Status Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] border border-sport-400/30 bg-sport-500/15 text-sport-300 backdrop-blur-md">
              <Activity className="w-3 h-3 text-sport-400" strokeWidth={2} />
              <span>SPORTZONE VENUE OS • VẬN HÀNH THÔNG MINH</span>
            </div>

            {/* Live Operations Indicator Pill */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-neutral-900/80 border border-white/10 backdrop-blur-md hover:bg-neutral-800 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isOpen ? 'bg-sport-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isOpen ? 'bg-sport-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-neutral-200">
                {isOpen ? 'Cơ sở đang mở cửa đón khách' : 'Tạm dừng nhận khách mới'}
              </span>
            </button>
          </div>

          {/* Main Title & Facility Value Prop */}
          <div className="max-w-2xl space-y-3 my-auto py-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-neutral-300 font-mono">
              <Building2 className="w-3.5 h-3.5 text-sport-400" strokeWidth={1.75} />
              <span>{venueName}</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
              Tối Ưu Doanh Thu Giờ Cao Điểm Với Giá Động & Check-in Tự Động
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl">
              Cơ sở đang ghi nhận tỷ lệ kín sân đạt <span className="text-sport-400 font-bold">{occupancyRate}%</span> tối nay. Kích hoạt tính năng phân bổ lịch sân thông minh và gói hội viên tháng để tăng thêm 25% doanh thu định kỳ.
            </p>
          </div>

          {/* Bottom Bar: Action CTAs + Telemetry Micro-Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 mt-3">
            {/* Nested Island Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/dashboard/owner/calendar" className="group">
                <div className="inline-flex items-center gap-3 rounded-full bg-sport-500 hover:bg-sport-400 text-neutral-950 font-bold text-xs sm:text-sm pl-5 pr-1.5 py-1.5 sm:py-2 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-sport-500/20">
                  <span>Điều Phối Lịch Sân Trực Quan</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-950/15 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-4 h-4 text-neutral-950" strokeWidth={2.2} />
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/owner/bookings">
                <button className="rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-200 active:scale-[0.98] inline-flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-sport-400" strokeWidth={1.75} />
                  <span>Quét Mã Check-in Nhanh</span>
                </button>
              </Link>
            </div>

            {/* Quick Metrics Badge Group */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="flex items-center gap-2.5 bg-neutral-900/70 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-sport-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Lấp đầy hôm nay
                  </span>
                  <span className="text-xs font-bold font-mono text-sport-300">
                    {occupancyRate}% (+14.2%)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-neutral-900/70 border border-white/10 px-3.5 py-1.5 rounded-2xl backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-sky-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    Check-in QR
                  </span>
                  <span className="text-xs font-bold font-mono text-sky-300">
                    {bookingsCount}/{bookingsCount} Hoàn tất
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
