'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Clock3,
  DollarSign,
  Plus,
  RefreshCw,
  Trophy,
} from 'lucide-react';
import { AnalyticsBarChart } from '@/components/dashboard/AnalyticsBarChart';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, type OwnerAnalyticsData } from '@/lib/api';
import { formatVND } from '@/lib/utils';

const bookingStatusLabels: Array<{
  key: keyof OwnerAnalyticsData['booking_statistics'];
  label: string;
  color: string;
}> = [
  { key: 'total', label: 'Tổng đơn', color: 'text-neutral-900 dark:text-white' },
  { key: 'pending', label: 'Chờ xác nhận', color: 'text-amber-600' },
  { key: 'confirmed', label: 'Đã xác nhận', color: 'text-sky-600' },
  { key: 'completed', label: 'Hoàn thành', color: 'text-emerald-600' },
  { key: 'cancelled', label: 'Đã hủy', color: 'text-rose-600' },
  { key: 'no_show', label: 'Không đến', color: 'text-neutral-500' },
];

export default function OwnerDashboardPage() {
  const [analytics, setAnalytics] = useState<OwnerAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.analytics.getOwnerAnalytics();

    if (response.success && response.data) {
      setAnalytics(response.data);
    } else {
      setAnalytics(null);
      setError(response.message || 'Không thể tải dữ liệu thống kê.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return (
    <div>
      <DashboardHeader
        title="Tổng Quan Quản Lý Cơ Sở"
        description="Doanh thu và hiệu suất đặt sân trên toàn bộ cơ sở thuộc tài khoản của bạn."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/owner/calendar">
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                Lịch Sân Trực Quan
              </Button>
            </Link>
            <Link href="/dashboard/owner/bookings">
              <Button variant="primary" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                Đặt Sân Tại Quầy
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {isLoading && (
          <Card>
            <CardContent className="flex min-h-64 items-center justify-center p-8 text-sm text-neutral-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Đang tải dữ liệu thống kê...
            </CardContent>
          </Card>
        )}

        {!isLoading && error && (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertCircle className="h-9 w-9 text-rose-500" strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Không thể tải dashboard</p>
                <p className="mt-1 text-sm text-neutral-500">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadAnalytics()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && analytics && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Doanh thu hôm nay', value: analytics.revenue.today, icon: DollarSign, color: 'text-sport-500' },
                { label: 'Doanh thu tuần này', value: analytics.revenue.this_week, icon: CalendarCheck, color: 'text-sky-500' },
                { label: 'Doanh thu tháng này', value: analytics.revenue.this_month, icon: CalendarDays, color: 'text-amber-500' },
                { label: 'Doanh thu năm nay', value: analytics.revenue.this_year, icon: BarChart3, color: 'text-indigo-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-500">
                      <span>{label}</span>
                      <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
                    </div>
                    <div className="font-mono text-2xl font-bold text-neutral-900 dark:text-white">
                      {formatVND(value)}
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">Chỉ tính giao dịch đã thanh toán</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Doanh Thu 7 Ngày Gần Nhất</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsBarChart
                    points={analytics.revenue_chart.map((point) => ({
                      key: point.date,
                      label: point.label,
                      value: point.revenue,
                    }))}
                    valueFormatter={formatVND}
                    emptyMessage="Chưa có giao dịch đã thanh toán trong 7 ngày gần nhất."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trạng Thái Đặt Sân</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {bookingStatusLabels.map((status) => (
                    <div
                      key={status.key}
                      className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900"
                    >
                      <span className="text-sm text-neutral-500">{status.label}</span>
                      <span className={`font-mono text-sm font-bold ${status.color}`}>
                        {analytics.booking_statistics[status.key].toLocaleString('vi-VN')}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <CardTitle>Top 5 Sân Theo Lượt Đặt</CardTitle>
                  </div>
                </CardHeader>
                {analytics.top_courts.length === 0 ? (
                  <CardContent className="py-12 text-center text-sm text-neutral-400">
                    Chưa có booking để xếp hạng sân.
                  </CardContent>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40">
                        <tr>
                          <th className="px-5 py-3">Sân</th>
                          <th className="px-5 py-3">Cơ sở</th>
                          <th className="px-5 py-3 text-right">Lượt đặt</th>
                          <th className="px-5 py-3 text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {analytics.top_courts.map((court, index) => (
                          <tr key={court.court_id}>
                            <td className="px-5 py-3.5 font-semibold text-neutral-900 dark:text-white">
                              <span className="mr-2 font-mono text-xs text-amber-500">#{index + 1}</span>
                              {court.court_name}
                            </td>
                            <td className="px-5 py-3.5 text-neutral-500">{court.venue_name}</td>
                            <td className="px-5 py-3.5 text-right font-mono font-semibold">{court.total_bookings}</td>
                            <td className="px-5 py-3.5 text-right font-mono font-semibold text-sport-600">
                              {formatVND(court.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-sky-500" />
                    <CardTitle>Khung Giờ Cao Điểm</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {analytics.peak_hours.length === 0 ? (
                    <div className="py-10 text-center text-sm text-neutral-400">
                      Chưa có booking để tổng hợp khung giờ.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {analytics.peak_hours.map((slot) => {
                        const maxBookings = analytics.peak_hours[0]?.booking_count || 1;

                        return (
                          <div key={slot.hour}>
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span className="font-medium text-neutral-700 dark:text-neutral-300">{slot.label}</span>
                              <span className="font-mono text-neutral-500">{slot.booking_count} lượt</span>
                            </div>
                            <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <div
                                className="h-2 rounded-full bg-sky-500"
                                style={{ width: `${(slot.booking_count / maxBookings) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
