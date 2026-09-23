'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { MOCK_BOOKINGS } from '@/lib/mock-data';
import { CustomerDashboardBanner } from '@/components/dashboard/CustomerDashboardBanner';
import {
  CalendarDays,
  Award,
  Users,
  QrCode,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  Share2,
  Sparkles
} from 'lucide-react';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const upcomingBooking = MOCK_BOOKINGS[0];

  return (
    <div>
      <DashboardHeader
        title="Bảng Điều Khiển Khách Hàng"
        description="Theo dõi lịch tập luyện, quản lý đơn đặt sân và điểm thưởng thành viên."
        actions={
          <Link href="/venues">
            <Button variant="primary" size="sm" className="gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
              Đặt Sân Mới
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Interactive Double-Bezel Hero Banner */}
        <CustomerDashboardBanner />

        {/* Welcome & Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Trận đấu sắp tới */}
          <Card className="border-l-4 border-l-sport-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Trận đấu kế tiếp</span>
                <Clock className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
              </div>
              <div className="text-xl font-bold text-neutral-900 dark:text-white">
                Hôm nay, 18:00
              </div>
              <p className="text-xs text-neutral-400 mt-1 truncate">
                {upcomingBooking?.venue?.name}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Điểm thưởng & Hạng */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Điểm tích lũy SportZone</span>
                <Award className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                  {user?.points?.total_points || 350}
                </span>
                <span className="text-xs text-neutral-400">điểm</span>
                <Badge variant="warning" size="sm" className="ml-auto uppercase text-[10px]">
                  {user?.points?.tier || 'Silver'}
                </Badge>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Cần 150 điểm nữa để lên hạng Gold
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Mã giới thiệu */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Mã giới thiệu bạn bè</span>
                <Users className="w-4 h-4 text-sky-500" strokeWidth={1.5} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-bold text-neutral-900 dark:text-white tracking-wider">
                  {user?.referral_code?.code || 'MINHANH2026'}
                </span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  <Share2 className="w-3 h-3" strokeWidth={1.5} />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Đã nhận {user?.referral_code?.total_rewards || 200} điểm thưởng
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Tổng đơn hoàn thành */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Số trận đã thi đấu</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-white tabular-nums">
                12 <span className="text-xs text-neutral-400 font-normal">trận</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Tỷ lệ hoàn thành: 100%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Upcoming Match Banner with QR Check-in */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-sport-50 dark:bg-sport-950/50 border border-sport-200 dark:border-sport-900 flex items-center justify-center text-sport-600 shrink-0">
              <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="sport">Đã thanh toán VietQR</Badge>
                <span className="text-xs font-mono text-neutral-400">Mã đơn: {upcomingBooking.booking_code}</span>
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                {upcomingBooking.court?.name} — {upcomingBooking.venue?.name}
              </h3>
              <p className="text-xs text-neutral-500 flex items-center gap-4 mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                  18:00 - 19:30 (Hôm nay)
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                  48 Chấn Hưng, Q. Tân Bình
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-[11px] text-neutral-400">Tổng thanh toán</span>
              <span className="text-sm font-bold font-mono text-sport-600">
                {formatVND(upcomingBooking.total_price)}
              </span>
            </div>
            <Button variant="secondary" size="sm" className="gap-2">
              <QrCode className="w-4 h-4" strokeWidth={1.5} />
              Mã QR Check-in
            </Button>
          </div>
        </div>

        {/* Recent Bookings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Lịch Sử Đơn Đặt Sân Gần Đây</CardTitle>
              <Link href="/dashboard/customer/bookings">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-sport-600">
                  Xem tất cả
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Mã đơn</th>
                  <th className="py-3 px-5">Cơ sở & Sân</th>
                  <th className="py-3 px-5">Ngày & Khung giờ</th>
                  <th className="py-3 px-5">Tổng tiền</th>
                  <th className="py-3 px-5">Thanh toán</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {MOCK_BOOKINGS.map((booking) => (
                  <tr key={booking.id} className="hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                      {booking.booking_code}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {booking.court?.name}
                      </div>
                      <div className="text-xs text-neutral-400 truncate max-w-[200px]">
                        {booking.venue?.name}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 tabular-nums text-xs text-neutral-600 dark:text-neutral-300">
                      <div>{formatDate(booking.booking_date)}</div>
                      <div className="text-neutral-400">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-medium text-xs text-neutral-900 dark:text-neutral-100">
                      {formatVND(booking.total_price)}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={booking.payment_status === 'paid' ? 'success' : 'warning'}>
                        {booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Thanh toán 1 phần'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={booking.status === 'confirmed' ? 'sport' : 'neutral'}>
                        {booking.status === 'confirmed' ? 'Đã xác nhận' : 'Hoàn thành'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
