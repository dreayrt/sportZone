'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Trophy,
  Sparkles,
  Zap,
  ArrowUpRight,
  Flame,
  CalendarCheck,
  ChevronRight,
  ChevronLeft,
  Timer
} from 'lucide-react';

interface PromoSlide {
  id: string;
  eyebrow: string;
  eyebrowIcon: React.ReactNode;
  title: string;
  description: string;
  highlightBadge: string;
  metricLabel: string;
  metricValue: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

const SLIDES: PromoSlide[] = [
  {
    id: 'summer-cup-2026',
    eyebrow: 'GIẢI ĐẤU MÙA HÈ 2026',
    eyebrowIcon: <Trophy className="w-3 h-3 text-sport-400" strokeWidth={1.75} />,
    title: 'Khởi Tranh SportZone Summer Cup: Pickleball & Cầu Lông',
    description:
      'Tổng quỹ thưởng 50.000.000đ dành cho các vận động viên phong trào. Đăng ký thi đấu đơn hoặc đôi tại cụm sân SportZone Chấn Hưng ngay hôm nay.',
    highlightBadge: '🔥 82% Vé Ghi Danh Đã Kín',
    metricLabel: 'Vận Động Viên Đã Tham Gia',
    metricValue: '1,240+',
    ctaText: 'Đăng Ký Thi Đấu Ngay',
    ctaLink: '/venues',
    secondaryCtaText: 'Xem Thể Lệ Giải Đấu',
    secondaryCtaLink: '/venues',
  },
  {
    id: 'golden-hour-promo',
    eyebrow: 'ƯU ĐÃI GIỜ VÀNG',
    eyebrowIcon: <Zap className="w-3 h-3 text-amber-400" strokeWidth={1.75} />,
    title: 'Hoàn 20% Xu SportZone Điểm Thưởng Khung Giờ 17:00 – 20:00',
    description:
      'Đặt sân trước tối thiểu 2 giờ để tự động nhận mã hoàn xu vào ví thành viên. Tích lũy điểm để quy đổi thành giờ chơi miễn phí hoặc nước uống tại sân.',
    highlightBadge: '⚡ Tự Động Áp Dụng Khi Thanh Toán',
    metricLabel: 'Số Lượt Đặt Đã Tận Dụng',
    metricValue: '850+ Đơn',
    ctaText: 'Tìm Sân Giờ Vàng Trống',
    ctaLink: '/venues',
    secondaryCtaText: 'Xem Cụm Sân Áp Dụng',
    secondaryCtaLink: '/venues',
  },
  {
    id: 'loyalty-gold-tier',
    eyebrow: 'ĐẶC QUYỀN THÀNH VIÊN',
    eyebrowIcon: <Sparkles className="w-3 h-3 text-sky-400" strokeWidth={1.75} />,
    title: 'Chỉ Còn 150 Điểm Để Mở Khóa Thẻ Hội Viên Hạng Gold',
    description:
      'Hội viên Gold được ưu tiên giữ khung giờ cố định cả tháng, miễn phí mượn vợt chuẩn thi đấu và giảm trực tiếp 10% cho mọi dịch vụ thuê sân.',
    highlightBadge: '💎 Tiến Trình Hạng: 350 / 500 XP',
    metricLabel: 'Hạng Hội Viên Hiện Tại',
    metricValue: 'Silver Tier',
    ctaText: 'Khám Phá Điểm Thưởng',
    ctaLink: '/dashboard/customer/loyalty',
    secondaryCtaText: 'Mời Bạn Nhận 50 Điểm',
    secondaryCtaLink: '/dashboard/customer/referral',
  },
];

export function CustomerDashboardBanner() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto rotate every 6.5 seconds when not hovered
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const slide = SLIDES[currentSlideIndex];

  return (
    // Double-Bezel Architecture: Outer Shell
    <div
      className="relative p-1.5 sm:p-2 rounded-[2rem] bg-neutral-900/5 dark:bg-white/5 border border-neutral-200/80 dark:border-white/10 shadow-sm transition-all duration-300"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Double-Bezel Architecture: Inner Core */}
      <div className="relative overflow-hidden rounded-[calc(2rem-0.375rem)] bg-neutral-950 text-white min-h-[340px] sm:min-h-[300px] flex flex-col justify-between shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
        {/* Background Artwork Layer with High-End Graded Treatment */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/banners/customer-banner.jpg"
            alt="SportZone Customer Arena"
            fill
            priority
            className="object-cover object-center scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Multi-layered Cinematic Gradient Scrim */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/85 to-neutral-950/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-neutral-950/30" />
          {/* Subtle Radial Glow Mesh */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-sport-500/20 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-between flex-1">
          {/* Top Bar: Eyebrow + Slide Indicator */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] border border-sport-400/30 bg-sport-500/15 text-sport-300 backdrop-blur-md">
              {slide.eyebrowIcon}
              <span>{slide.eyebrow}</span>
            </div>

            {/* Slide Pagination Pills */}
            <div className="flex items-center gap-1.5 bg-neutral-900/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
              {SLIDES.map((s, index) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSlideIndex(index)}
                  className={`transition-all duration-300 rounded-full ${
                    index === currentSlideIndex
                      ? 'w-6 h-1.5 bg-sport-400'
                      : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Center Content: Headline & Story */}
          <div className="max-w-2xl space-y-3.5 my-auto py-2">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-sport-300/90 bg-sport-950/60 border border-sport-500/20 px-3 py-1 rounded-full backdrop-blur-sm">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" strokeWidth={2} />
              <span>{slide.highlightBadge}</span>
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-white leading-snug">
              {slide.title}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-xl line-clamp-2 sm:line-clamp-none">
              {slide.description}
            </p>
          </div>

          {/* Bottom Bar: Nested Island CTA + Metric Highlight */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 mt-4">
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Primary "Island" Button with Nested Trailing Icon */}
              <Link href={slide.ctaLink} className="group">
                <div className="inline-flex items-center gap-3 rounded-full bg-sport-500 hover:bg-sport-400 text-neutral-950 font-bold text-xs sm:text-sm pl-5 pr-1.5 py-1.5 sm:py-2 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-sport-500/20">
                  <span>{slide.ctaText}</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-neutral-950/15 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight className="w-4 h-4 text-neutral-950" strokeWidth={2.2} />
                  </div>
                </div>
              </Link>

              {slide.secondaryCtaText && slide.secondaryCtaLink && (
                <Link href={slide.secondaryCtaLink}>
                  <button className="rounded-full px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-medium text-neutral-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all duration-200 active:scale-[0.98]">
                    {slide.secondaryCtaText}
                  </button>
                </Link>
              )}
            </div>

            {/* Live Metric Capsule */}
            <div className="hidden md:flex items-center gap-4 bg-neutral-900/60 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
              <div className="flex flex-col text-right">
                <span className="text-[10px] uppercase tracking-wider text-neutral-400">
                  {slide.metricLabel}
                </span>
                <span className="text-sm font-bold font-mono text-sport-400 tabular-nums">
                  {slide.metricValue}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-sport-500/20 border border-sport-500/30 flex items-center justify-center text-sport-400">
                <CalendarCheck className="w-4 h-4" strokeWidth={1.75} />
              </div>
            </div>
          </div>
        </div>

        {/* Prev / Next Minimal Navigation Chevrons */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 hidden lg:flex flex-col gap-1.5">
          <button
            onClick={() =>
              setCurrentSlideIndex((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1))
            }
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-md"
            aria-label="Previous Slide"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % SLIDES.length)}
            className="w-8 h-8 rounded-full bg-neutral-900/80 hover:bg-neutral-800 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all backdrop-blur-md"
            aria-label="Next Slide"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
