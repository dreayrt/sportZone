'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { AnalyticsBarChart } from '@/components/dashboard/AnalyticsBarChart';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, type AdminAnalyticsData } from '@/lib/api';
import { formatVND } from '@/lib/utils';

const bookingStatusLabels: Array<{
  key: keyof AdminAnalyticsData['booking_statistics'];
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

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.analytics.getAdminAnalytics();

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
        title="Tổng Quan Quản Trị Hệ Thống SportZone"
        description="Theo dõi giao dịch, tăng trưởng người dùng và hoạt động đặt sân trên toàn hệ thống."
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: 'Tổng GMV hợp lệ',
                  value: formatVND(analytics.overview.total_gmv),
                  detail: 'Từ các giao dịch đã thanh toán',
                  icon: CircleDollarSign,
                  color: 'text-sport-500',
                },
                {
                  label: 'Tổng người dùng',
                  value: analytics.overview.total_users.toLocaleString('vi-VN'),
                  detail: `${analytics.overview.total_customers.toLocaleString('vi-VN')} khách hàng`,
                  icon: Users,
                  color: 'text-sky-500',
                },
                {
                  label: 'Chủ cơ sở',
                  value: analytics.overview.total_owners.toLocaleString('vi-VN'),
                  detail: 'Tài khoản owner toàn hệ thống',
                  icon: UserRoundCheck,
                  color: 'text-indigo-500',
                },
                {
                  label: 'Cơ sở & sân',
                  value: `${analytics.overview.total_venues.toLocaleString('vi-VN')} cơ sở`,
                  detail: `${analytics.overview.total_courts.toLocaleString('vi-VN')} sân`,
                  icon: Building2,
                  color: 'text-amber-500',
                },
                {
                  label: 'Tổng booking',
                  value: analytics.overview.total_bookings.toLocaleString('vi-VN'),
                  detail: 'Tất cả trạng thái',
                  icon: CalendarCheck,
                  color: 'text-cyan-500',
                },
                {
                  label: 'Booking hoàn thành',
                  value: analytics.overview.total_completed_bookings.toLocaleString('vi-VN'),
                  detail: 'Đã hoàn thành dịch vụ',
                  icon: CheckCircle2,
                  color: 'text-emerald-500',
                },
                {
                  label: 'Quản trị viên',
                  value: (
                    analytics.overview.total_users
                    - analytics.overview.total_customers
                    - analytics.overview.total_owners
                  ).toLocaleString('vi-VN'),
                  detail: 'Tài khoản admin toàn hệ thống',
                  icon: ShieldCheck,
                  color: 'text-violet-500',
                },
              ].map(({ label, value, detail, icon: Icon, color }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between text-xs font-medium text-neutral-500">
                      <span>{label}</span>
                      <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
                    </div>
                    <div className="font-mono text-2xl font-bold text-neutral-900 dark:text-white">{value}</div>
                    <p className="mt-1 text-xs text-neutral-400">{detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>GMV 7 Ngày Gần Nhất</CardTitle>
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
                  <CardTitle>Người Dùng Mới Trong 7 Ngày</CardTitle>
                </CardHeader>
                <CardContent>
                  <AnalyticsBarChart
                    points={analytics.user_growth.map((point) => ({
                      key: point.date,
                      label: point.label,
                      value: point.new_users,
                    }))}
                    valueFormatter={(value) => `${value.toLocaleString('vi-VN')} người`}
                    emptyMessage="Chưa có người dùng mới trong 7 ngày gần nhất."
                    colorClassName="bg-sky-500"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Phân Bổ Trạng Thái Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {bookingStatusLabels.map((status) => (
                    <div key={status.key} className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
                      <p className="text-xs text-neutral-500">{status.label}</p>
                      <p className={`mt-2 font-mono text-2xl font-bold ${status.color}`}>
                        {analytics.booking_statistics[status.key].toLocaleString('vi-VN')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
