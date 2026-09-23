'use client';

import React from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND } from '@/lib/utils';
import { MOCK_VENUES, MOCK_BOOKINGS } from '@/lib/mock-data';
import { OwnerDashboardBanner } from '@/components/dashboard/OwnerDashboardBanner';
import {
  DollarSign,
  CalendarCheck,
  Percent,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  QrCode,
  AlertCircle
} from 'lucide-react';

export default function OwnerDashboardPage() {
  const venue = MOCK_VENUES[0]; // SportZone Chấn Hưng Complex

  return (
    <div>
      <DashboardHeader
        title="Tổng Quan Quản Lý Cơ Sở"
        description={`Cơ sở: ${venue.name} — ${venue.address}, ${venue.district}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/calendar">
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                Lịch Sân Trực Quan
              </Button>
            </Link>
            <Link href="/dashboard/owner/bookings">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
                Đặt Sân Tại Quầy
              </Button>
            </Link>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Double-Bezel Hero Banner for Operations */}
        <OwnerDashboardBanner
          venueName={venue.name}
          todayRevenue={3250000}
          occupancyRate={92}
          bookingsCount={18}
        />

        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Doanh thu hôm nay</span>
                <DollarSign className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                {formatVND(3250000)}
              </div>
              <p className="text-xs text-sport-600 mt-1 font-medium">
                +14.2% so với hôm qua
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Số đơn đặt trong ngày</span>
                <CalendarCheck className="w-4 h-4 text-sky-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                18 <span className="text-xs text-neutral-400 font-normal">đơn</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                4 đơn đặt qua website, 14 tại quầy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Tỷ lệ lấp đầy giờ vàng (17h-21h)</span>
                <Percent className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                92.5%
              </div>
              <p className="text-xs text-amber-600 mt-1 font-medium">
                Còn 2 slot trống lúc 20:00
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Khách cần check-in hôm nay</span>
                <Clock className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                3 <span className="text-xs text-neutral-400 font-normal">đội</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Trận gần nhất lúc 18:00
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Live Court Status Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Tình Trạng Các Sân Hiện Tại ({venue.courts?.length} Sân)</CardTitle>
              <Link href="/dashboard/owner/courts">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-sport-600">
                  Cài đặt giá sân
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {venue.courts?.map((court) => (
              <div
                key={court.id}
                className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs text-neutral-400">{court.code}</span>
                    <h4 className="font-bold text-sm text-neutral-900 dark:text-white mt-0.5">
                      {court.name}
                    </h4>
                  </div>
                  <Badge variant="success">Hoạt động</Badge>
                </div>

                <div className="text-xs text-neutral-500 space-y-1">
                  <p>Mặt sân: {court.surface_type}</p>
                  <p>Giờ thường: <strong className="font-mono text-neutral-700 dark:text-neutral-300">{formatVND(court.hourly_rate_standard)}/h</strong></p>
                  <p>Giờ vàng (Peak): <strong className="font-mono text-amber-600">{formatVND(court.hourly_rate_peak)}/h</strong></p>
                </div>

                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <span className="text-[11px] text-sport-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sport-500 animate-ping"></span>
                    Đang có khách thi đấu
                  </span>
                  <Link href={`/dashboard/owner/calendar?courtId=${court.id}`}>
                    <Button variant="outline" size="sm" className="h-6 text-[11px] px-2">
                      Lịch
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Action: Pending Bookings & Fast Check-In Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Khách Đã Đặt Sân Sắp Tới & Điểm Danh (Check-in)</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                  <QrCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Quét Mã Khách
                </Button>
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Mã đơn</th>
                  <th className="py-3 px-5">Tên khách & SĐT</th>
                  <th className="py-3 px-5">Sân thi đấu</th>
                  <th className="py-3 px-5">Khung giờ</th>
                  <th className="py-3 px-5">Tiền sân</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5 text-right">Xác nhận check-in</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {MOCK_BOOKINGS.map((b) => (
                  <tr key={b.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5 font-mono text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {b.booking_code}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-neutral-900 dark:text-white">
                        {b.customer_name}
                      </div>
                      <div className="text-xs font-mono text-neutral-400">
                        {b.customer_phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-700 dark:text-neutral-300">
                      {b.court?.name}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                      {b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-medium text-sport-600">
                      {formatVND(b.total_price)}
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={b.checked_in ? 'neutral' : 'sport'}>
                        {b.checked_in ? 'Đã vào sân' : 'Chờ vào sân'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {b.checked_in ? (
                        <span className="text-xs text-neutral-400 flex items-center justify-end gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Đã điểm danh
                        </span>
                      ) : (
                        <Button variant="primary" size="sm" className="h-7 text-xs px-3">
                          Vào sân
                        </Button>
                      )}
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
