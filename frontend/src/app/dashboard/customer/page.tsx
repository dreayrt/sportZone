'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { api, LoyaltySummaryData } from '@/lib/api';
import type { Booking } from '@/lib/mock-data';
import { CustomerDashboardBanner } from '@/components/dashboard/CustomerDashboardBanner';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  CalendarDays,
  Award,
  Users,
  QrCode,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  Share2
} from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const STATUS_LABELS: Record<Booking['status'], string> = {
  pending: 'Chờ thanh toán',
  confirmed: 'Sắp diễn ra',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
  no_show: 'Vắng mặt',
};

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.bookings.getAll(), api.loyalty.getSummary()]).then(([bookingRes, loyaltyRes]) => {
      if (!active) return;
      if (bookingRes.success && Array.isArray(bookingRes.data)) setBookings(bookingRes.data);
      if (loyaltyRes.success && loyaltyRes.data) setLoyalty(loyaltyRes.data);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  const dateTimeOf = (booking: Booking, timeField: 'start_time' | 'end_time') =>
    new Date(`${booking.booking_date.slice(0, 10)}T${booking[timeField].slice(0, 8)}`);

  const upcomingBooking = bookings
    .filter((b) => (b.status === 'confirmed' || b.status === 'pending') && dateTimeOf(b, 'end_time') > new Date())
    .sort((a, b) => dateTimeOf(a, 'start_time').getTime() - dateTimeOf(b, 'start_time').getTime())[0];

  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const noShowCount = bookings.filter((b) => b.status === 'no_show').length;
  const decidedCount = completedCount + noShowCount;
  const completionRate = decidedCount > 0 ? Math.round((completedCount / decidedCount) * 100) : null;

  const recentBookings = [...bookings]
    .sort((a, b) => dateTimeOf(b, 'start_time').getTime() - dateTimeOf(a, 'start_time').getTime())
    .slice(0, 5);

  const totalPoints = loyalty?.current_points ?? user?.points?.total_points ?? 0;
  const tier = loyalty?.current_tier ?? user?.points?.tier ?? 'bronze';
  const referralRewards = user?.referral_code?.total_rewards ?? 0;

  const copyReferralCode = () => {
    const code = user?.referral_code?.code;
    if (code) void navigator.clipboard.writeText(code);
  };

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
              {upcomingBooking ? (
                <>
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">
                    {formatDate(upcomingBooking.booking_date.slice(0, 10))}
                  </div>
                  <p className="text-xs text-neutral-400 mt-1 tabular-nums">
                    {upcomingBooking.start_time.slice(0, 5)} - {upcomingBooking.end_time.slice(0, 5)} · {upcomingBooking.venue?.name}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-neutral-900 dark:text-white">
                    Chưa có trận sắp tới
                  </div>
                  <Link href="/venues" className="text-xs text-sport-600 hover:underline mt-1 inline-flex items-center gap-1">
                    Đặt sân ngay
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              )}
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
                  {totalPoints}
                </span>
                <span className="text-xs text-neutral-400">điểm</span>
                <Badge variant="warning" size="sm" className="ml-auto uppercase text-[10px]">
                  {TIER_LABELS[tier] || tier}
                </Badge>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {loyalty?.next_tier
                  ? `Cần ${loyalty.points_to_next_tier} điểm nữa để lên hạng ${TIER_LABELS[loyalty.next_tier]}`
                  : 'Bạn đang ở hạng thành viên cao nhất'}
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
                  {user?.referral_code?.code || '—'}
                </span>
                {user?.referral_code?.code && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={copyReferralCode}>
                    <Share2 className="w-3 h-3" strokeWidth={1.5} />
                    Copy
                  </Button>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Đã nhận {referralRewards} điểm thưởng
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
                {completedCount} <span className="text-xs text-neutral-400 font-normal">trận</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Tỷ lệ hoàn thành: {completionRate !== null ? `${completionRate}%` : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Featured Upcoming Match Banner with QR Check-in */}
        {upcomingBooking && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-sport-50 dark:bg-sport-950/50 border border-sport-200 dark:border-sport-900 flex items-center justify-center text-sport-600 shrink-0">
                <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={upcomingBooking.payment_status === 'paid' ? 'sport' : 'warning'}>
                    {upcomingBooking.payment_status === 'paid'
                      ? 'Đã thanh toán'
                      : upcomingBooking.payment_status === 'partial'
                        ? 'Thanh toán một phần'
                        : 'Chờ thanh toán'}
                  </Badge>
                  <span className="text-xs font-mono text-neutral-400">Mã đơn: {upcomingBooking.booking_code}</span>
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {upcomingBooking.court?.name} — {upcomingBooking.venue?.name}
                </h3>
                <p className="text-xs text-neutral-500 flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                    {upcomingBooking.start_time.slice(0, 5)} - {upcomingBooking.end_time.slice(0, 5)} ({formatDate(upcomingBooking.booking_date.slice(0, 10))})
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-400" strokeWidth={1.5} />
                    {upcomingBooking.venue?.address}{upcomingBooking.venue?.district ? `, ${upcomingBooking.venue.district}` : ''}
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
              <Link href="/dashboard/customer/bookings"><Button variant="secondary" size="sm" className="gap-2">
                <QrCode className="w-4 h-4" strokeWidth={1.5} />
                Mã QR Check-in
              </Button></Link>
            </div>
          </div>
        )}

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
                {recentBookings.map((booking) => (
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
                      <div>{formatDate(booking.booking_date.slice(0, 10))}</div>
                      <div className="text-neutral-400">{booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono font-medium text-xs text-neutral-900 dark:text-neutral-100">
                      {formatVND(booking.total_price)}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={booking.payment_status === 'paid' ? 'success' : booking.payment_status === 'partial' ? 'warning' : 'neutral'}>
                        {booking.payment_status === 'paid' ? 'Đã thanh toán' : booking.payment_status === 'partial' ? 'Thanh toán một phần' : 'Chưa thanh toán'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={booking.status === 'confirmed' ? 'sport' : booking.status === 'completed' ? 'success' : 'neutral'}>
                        {STATUS_LABELS[booking.status] || booking.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link href="/dashboard/customer/bookings">
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                          Chi tiết
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading && (
              <div role="status" aria-label="Đang tải dữ liệu" className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 animate-fade-in-up"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                ))}
                <span className="sr-only">Đang tải dữ liệu…</span>
              </div>
            )}
            {!isLoading && recentBookings.length === 0 && (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <p className="text-sm text-neutral-400">Bạn chưa có đơn đặt sân nào.</p>
                <Link href="/venues">
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Đặt sân đầu tiên
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
