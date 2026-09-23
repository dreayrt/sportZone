'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { MOCK_CATEGORIES, MOCK_VENUES } from '@/lib/mock-data';
import { formatVND } from '@/lib/utils';
import {
  Search,
  MapPin,
  CalendarDays,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Star,
  Users
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = new URLSearchParams();
    if (selectedSport !== 'all') query.set('sport', selectedSport);
    if (selectedCity !== 'all') query.set('city', selectedCity);
    router.push(`/venues?${query.toString()}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-sport-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />

        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 text-xs font-semibold text-neutral-800 dark:text-neutral-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-sport-500 animate-pulse"></span>
            <span>Hệ Thống Đặt Sân Trực Tuyến 24/7 Chuẩn Xác</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-neutral-900 dark:text-white tracking-tight leading-[1.1]">
            Khởi Động Đam Mê. <br className="hidden sm:inline" />
            <span className="text-sport-600 dark:text-sport-400">Đặt Sân Thể Thao Tức Thì.</span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Tra cứu slot giờ trống chính xác, thanh toán chuyển khoản VietQR tự động và check-in vào sân không cần chờ đợi.
          </p>

          {/* Quick Search Widget */}
          <form
            onSubmit={handleSearch}
            className="mt-8 p-2.5 sm:p-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-elevated max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2"
          >
            {/* Sport select */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
              <Trophy className="w-4 h-4 text-sport-500 shrink-0" strokeWidth={1.5} />
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
              >
                <option value="all">Tất cả môn thể thao</option>
                {MOCK_CATEGORIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* City select */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-100 dark:border-neutral-800">
              <MapPin className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
              >
                <option value="all">Tất cả khu vực</option>
                <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
                <option value="Hà Nội">Hà Nội</option>
              </select>
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="primary" size="md" className="w-full gap-2">
              <Search className="w-4 h-4" strokeWidth={1.5} />
              <span>Tìm Sân Ngay</span>
            </Button>
          </form>

          {/* Micro badges */}
          <div className="flex items-center justify-center gap-6 pt-3 text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sport-500" />
              Slot cập nhật trực tiếp
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sport-500" />
              Xác nhận QR tức thì
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sport-500" />
              Hoàn tiền nếu hủy sớm
            </span>
          </div>
        </div>
      </section>

      {/* Sport Categories Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sport-600 dark:text-sport-400 block mb-1">
              Bộ Môn Nổi Bật
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Khám Phá Sân Theo Môn Thể Thao
            </h2>
          </div>
          <Link href="/venues">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-neutral-600">
              Xem tất cả môn
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_CATEGORIES.map((cat, idx) => (
            <Link
              key={cat.id}
              href={`/venues?sport=${cat.code}`}
              className={`group relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-900 transition-all duration-300 hover:shadow-subtle ${
                idx === 0 ? 'sm:col-span-2 lg:col-span-2 h-72' : 'h-72'
              }`}
            >
              <img
                src={cat.banner_image}
                alt={cat.name}
                className="w-full h-full object-cover opacity-70 group-hover:opacity-85 group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="sport" size="sm">
                    {cat.court_count || 20}+ cụm sân
                  </Badge>
                  <span className="text-xs text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-medium">
                    Xem lịch sân <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold">{cat.name}</h3>
                <p className="text-xs text-neutral-300 line-clamp-1 max-w-md">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Venues Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sport-600 dark:text-sport-400 block mb-1">
              Địa Điểm Uy Tín
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Cơ Sở Thể Thao Được Yêu Thích
            </h2>
          </div>
          <Link href="/venues">
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-neutral-600">
              Tất cả cụm sân
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_VENUES.map((venue) => (
            <Card key={venue.id} hoverEffect className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-48 relative overflow-hidden bg-neutral-900">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="warning" className="bg-white/95 dark:bg-neutral-900/95 font-bold shadow-xs">
                      ★ {venue.rating} ({venue.review_count})
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-white line-clamp-1">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{venue.address}, {venue.district}</span>
                    </p>
                  </div>

                  {/* Amenities tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {venue.amenities?.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
                      >
                        {amenity.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </div>

              <div className="p-5 pt-0 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Giá chỉ từ</span>
                  <span className="text-sm font-bold font-mono text-sport-600">
                    {formatVND(venue.courts?.[0]?.hourly_rate_standard || 90000)}/h
                  </span>
                </div>
                <Link href={`/venues/${venue.slug}`}>
                  <Button variant="primary" size="sm" className="text-xs">
                    Xem Sân & Giờ
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Why SportZone Bento Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-neutral-900 text-white p-8 sm:p-12 space-y-8">
          <div className="max-w-xl space-y-2">
            <span className="text-xs uppercase font-bold tracking-wider text-sport-400">
              Công Nghệ Quản Lý Sân
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Được Thiết Kế Cho Trải Nghiệm Thể Thao Tối Giản, Chuẩn Xác
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sport-500/20 text-sport-400 flex items-center justify-center">
                <Zap className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-base">Thanh Toán VietQR Xác Nhận Tức Thì</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Không cần gửi hóa đơn chụp màn hình cho chủ sân. Hệ thống tự động kích hoạt mã đơn ngay khi nhận giao dịch ngân hàng.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Clock className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-base">Check-in Mã QR Tại Quầy</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Đến sân chỉ cần quét mã QR đơn hàng tại điện thoại. Nhân viên xác nhận vào sân trong 3 giây.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-neutral-800/60 border border-neutral-700/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Trophy className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h3 className="font-bold text-base">Tích Điểm Nâng Hạng Vận Động Viên</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Mỗi trận đấu đều được tích điểm thưởng quy đổi voucher giảm giá và ưu đãi đặt sân trước vào giờ cao điểm.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
