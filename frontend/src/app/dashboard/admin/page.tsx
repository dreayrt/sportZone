'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND } from '@/lib/utils';
import { MOCK_VENUES } from '@/lib/mock-data';
import { AdminDashboardBanner } from '@/components/dashboard/AdminDashboardBanner';
import {
  TrendingUp,
  Users,
  Building2,
  CalendarCheck,
  Search,
  Sliders,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div>
      <DashboardHeader
        title="Tổng Quan Quản Trị Hệ Thống SportZone"
        description="Theo dõi lưu lượng giao dịch toàn sàn, quản trị tài khoản và cấu hình hệ thống."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Double-Bezel System Hero Banner */}
        <AdminDashboardBanner
          totalVenues={32}
          totalUsers={1280}
          monthlyGmv={148500000}
          systemUptime="99.98%"
        />

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Tổng GMV Tháng Này</span>
                <TrendingUp className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                {formatVND(148500000)}
              </div>
              <p className="text-xs text-sport-600 mt-1 font-medium">
                +24.8% so với tháng trước
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Tổng người dùng</span>
                <Users className="w-4 h-4 text-sky-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                1,280 <span className="text-xs text-neutral-400 font-normal">users</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                48 chủ cơ sở sân
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Tổng số cơ sở & sân</span>
                <Building2 className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                32 <span className="text-xs text-neutral-400 font-normal">cơ sở (118 sân)</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Pickleball tăng trưởng +45%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-neutral-500 text-xs font-medium mb-1">
                <span>Số lượt tìm kiếm tuần</span>
                <Search className="w-4 h-4 text-indigo-500" strokeWidth={1.5} />
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                8,420
              </div>
              <p className="text-xs text-indigo-600 mt-1 font-medium">
                AI Recommendation đã ghi nhận
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Top Venues Overview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Cụm Sân Có Doanh Thu Cao Nhất</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Tên cơ sở</th>
                  <th className="py-3 px-5">Khu vực</th>
                  <th className="py-3 px-5">Số sân</th>
                  <th className="py-3 px-5">Đánh giá</th>
                  <th className="py-3 px-5">Tổng số đơn</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {MOCK_VENUES.map((venue) => (
                  <tr key={venue.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5 font-bold text-neutral-900 dark:text-white">
                      {venue.name}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-500">
                      {venue.district}, {venue.city}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs">
                      {venue.courts?.length || 4} sân
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs font-semibold text-amber-500">
                      ★ {venue.rating} ({venue.review_count})
                    </td>
                    <td className="py-3.5 px-5 font-mono text-xs">
                      342 đơn
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant="success">Hoạt động</Badge>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs px-2.5">
                        Kiểm duyệt
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
