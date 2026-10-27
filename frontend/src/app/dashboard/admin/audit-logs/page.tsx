'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { History, Shield } from 'lucide-react';

export default function AdminAuditLogsPage() {
  const logs = [
    { id: 101, action: 'BOOKING_CHECKIN', entity: 'Booking #SZ-66021', user: 'Chủ sân Chấn Hưng', ip: '127.0.0.1', time: '17/09/2026 07:05' },
    { id: 102, action: 'PAYMENT_RECEIVED', entity: 'Payment #SZ-77812 (500.000đ)', user: 'SePay Webhook', ip: '127.0.0.1', time: '17/09/2026 06:45' },
    { id: 103, action: 'USER_REGISTERED', entity: 'User #4 (Nguyễn Minh Anh)', user: 'Guest', ip: '113.190.12.8', time: '17/09/2026 06:30' },
    { id: 104, action: 'SETTINGS_UPDATED', entity: 'System Setting: loyalty_points', user: 'Quản trị SportZone', ip: '127.0.0.1', time: '16/09/2026 19:20' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Nhật Ký Kiểm Toán Hệ Thống (Audit Trail)"
        description="Ghi nhận toàn bộ thao tác bảo mật, thay đổi cấu hình và giao dịch tiền tệ quan trọng."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Hành động</th>
                  <th className="py-3 px-5">Đối tượng tác động</th>
                  <th className="py-3 px-5">Người thực hiện</th>
                  <th className="py-3 px-5">IP Address</th>
                  <th className="py-3 px-5 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-5 font-mono text-xs text-neutral-400">#{log.id}</td>
                    <td className="py-3 px-5">
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-xs font-medium text-neutral-900 dark:text-white">
                      {log.entity}
                    </td>
                    <td className="py-3 px-5 text-xs text-neutral-600 dark:text-neutral-400">
                      {log.user}
                    </td>
                    <td className="py-3 px-5 font-mono text-xs text-neutral-400">
                      {log.ip}
                    </td>
                    <td className="py-3 px-5 text-xs text-neutral-400 text-right">
                      {log.time}
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
