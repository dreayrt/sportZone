'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Search, Shield, Lock, Unlock } from 'lucide-react';

interface UserRow {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'customer' | 'owner' | 'admin';
  status: 'active' | 'blocked';
  created_at: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([
    { id: 1, full_name: 'Quản trị SportZone', email: 'admin@sportzone.local', phone: '0908000001', role: 'admin', status: 'active', created_at: '17/09/2026' },
    { id: 2, full_name: 'Chủ sân Chấn Hưng', email: 'owner1@sportzone.local', phone: '0908000002', role: 'owner', status: 'active', created_at: '17/09/2026' },
    { id: 3, full_name: 'Chủ sân D-Sports', email: 'owner2@sportzone.local', phone: '0908000003', role: 'owner', status: 'active', created_at: '17/09/2026' },
    { id: 4, full_name: 'Nguyễn Minh Anh', email: 'minhanh@example.com', phone: '0912345678', role: 'customer', status: 'active', created_at: '17/09/2026' },
    { id: 5, full_name: 'Trần Quốc Huy', email: 'quochuy@example.com', phone: '0909888777', role: 'customer', status: 'active', created_at: '16/09/2026' },
  ]);

  const [search, setSearch] = useState('');

  const toggleStatus = (id: number) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'blocked' : 'active' } : u));
  };

  const filtered = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Tài Khoản Người Dùng"
        description="Danh sách tài khoản khách hàng, chủ cơ sở và quản trị viên trong toàn hệ thống."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Họ và tên</th>
                  <th className="py-3 px-5">Liên hệ</th>
                  <th className="py-3 px-5">Vai trò</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5">Ngày tạo</th>
                  <th className="py-3 px-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-neutral-50/50">
                    <td className="py-3.5 px-5 font-mono text-xs text-neutral-400">#{u.id}</td>
                    <td className="py-3.5 px-5 font-semibold text-neutral-900 dark:text-white">
                      {u.full_name}
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-500">
                      <div>{u.email}</div>
                      <div className="font-mono text-[11px] text-neutral-400">{u.phone}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={u.role === 'admin' ? 'warning' : u.role === 'owner' ? 'info' : 'sport'}>
                        {u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Chủ Sân' : 'Khách Hàng'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5">
                      <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                        {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-5 text-xs text-neutral-400">{u.created_at}</td>
                    <td className="py-3.5 px-5 text-right">
                      {u.role !== 'admin' && (
                        <Button
                          variant={u.status === 'active' ? 'outline' : 'secondary'}
                          size="sm"
                          className="h-7 text-xs px-2.5 gap-1"
                          onClick={() => toggleStatus(u.id)}
                        >
                          {u.status === 'active' ? <Lock className="w-3 h-3 text-red-500" /> : <Unlock className="w-3 h-3 text-emerald-500" />}
                          {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
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
