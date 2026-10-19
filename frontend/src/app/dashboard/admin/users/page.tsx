'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Search, Lock, Unlock, AlertCircle, CheckCircle2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserRow {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: 'customer' | 'owner' | 'admin';
  status: 'active' | 'blocked';
  created_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

const PER_PAGE = 10;

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, total: 0, per_page: PER_PAGE });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async (params: { search: string; role: string; status: string; page: number }) => {
    setIsLoading(true);
    try {
      const res = await api.admin.users.list({
        search: params.search || undefined,
        role: params.role || undefined,
        status: params.status || undefined,
        page: params.page,
        per_page: PER_PAGE,
      });
      if (res.success && res.data) {
        setUsers(res.data.data || []);
        setMeta({
          current_page: res.data.current_page || 1,
          last_page: res.data.last_page || 1,
          total: res.data.total || 0,
          per_page: res.data.per_page || PER_PAGE,
        });
      } else {
        setNotice({ type: 'error', text: res.message || 'Không tải được danh sách người dùng.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Tìm kiếm có debounce, đổi filter reset về trang 1
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchUsers({ search, role: roleFilter, status: statusFilter, page });
    }, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter, page, fetchUsers]);

  const reload = () => fetchUsers({ search, role: roleFilter, status: statusFilter, page });

  const handleToggleStatus = async (u: UserRow) => {
    const nextStatus = u.status === 'active' ? 'blocked' : 'active';
    const action = nextStatus === 'blocked' ? 'khóa' : 'mở khóa';
    if (!confirm(`Bạn chắc chắn muốn ${action} tài khoản "${u.full_name}"?${nextStatus === 'blocked' ? ' Người này sẽ bị đăng xuất ngay và không đăng nhập được nữa.' : ''}`)) return;

    setNotice(null);
    setActionId(u.id);
    try {
      const res = await api.admin.users.updateStatus(u.id, nextStatus);
      if (res.success) {
        setNotice({ type: 'success', text: res.message || `Đã ${action} tài khoản.` });
        reload();
      } else {
        setNotice({ type: 'error', text: res.message || `Không thể ${action} tài khoản.` });
      }
    } catch {
      setNotice({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setActionId(null);
    }
  };

  const handleChangeRole = async (u: UserRow, nextRole: string) => {
    if (nextRole === u.role) return;
    if (!confirm(`Đổi vai trò của "${u.full_name}" thành ${nextRole}?`)) return;

    setNotice(null);
    setActionId(u.id);
    try {
      const res = await api.admin.users.updateRole(u.id, nextRole);
      if (res.success) {
        setNotice({ type: 'success', text: res.message || 'Đã cập nhật vai trò.' });
        reload();
      } else {
        setNotice({ type: 'error', text: res.message || 'Không thể đổi vai trò.' });
      }
    } catch {
      setNotice({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('vi-VN');
  };

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Tài Khoản Người Dùng"
        description="Danh sách tài khoản khách hàng, chủ cơ sở và quản trị viên trong toàn hệ thống."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {notice && (
          <div className={`p-3 border text-xs rounded-lg flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {notice.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
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
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            >
              <option value="">Tất cả vai trò</option>
              <option value="customer">Khách hàng</option>
              <option value="owner">Chủ sân</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="blocked">Đã khóa</option>
            </select>
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
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-neutral-400">
                      Không tìm thấy người dùng nào.
                    </td>
                  </tr>
                ) : users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-neutral-50/50">
                      <td className="py-3.5 px-5 font-mono text-xs text-neutral-400">#{u.id}</td>
                      <td className="py-3.5 px-5 font-semibold text-neutral-900 dark:text-white">
                        {u.full_name}
                        {isSelf && <span className="ml-2 text-[10px] font-normal text-neutral-400">(bạn)</span>}
                      </td>
                      <td className="py-3.5 px-5 text-xs text-neutral-500">
                        <div>{u.email || '—'}</div>
                        <div className="font-mono text-[11px] text-neutral-400">{u.phone || '—'}</div>
                      </td>
                      <td className="py-3.5 px-5">
                        {u.role === 'admin' || isSelf ? (
                          <Badge variant={u.role === 'admin' ? 'warning' : u.role === 'owner' ? 'info' : 'sport'}>
                            {u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Chủ Sân' : 'Khách Hàng'}
                          </Badge>
                        ) : (
                          <select
                            value={u.role}
                            disabled={busy}
                            onChange={(e) => handleChangeRole(u, e.target.value)}
                            className="text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1"
                            title="Đổi vai trò"
                          >
                            <option value="customer">Khách Hàng</option>
                            <option value="owner">Chủ Sân</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </td>
                      <td className="py-3.5 px-5">
                        <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                          {u.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-neutral-400">{formatDate(u.created_at)}</td>
                      <td className="py-3.5 px-5 text-right">
                        {u.role !== 'admin' && !isSelf ? (
                          <Button
                            variant={u.status === 'active' ? 'outline' : 'secondary'}
                            size="sm"
                            className="h-7 text-xs px-2.5 gap-1"
                            disabled={busy}
                            onClick={() => handleToggleStatus(u)}
                          >
                            {busy ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : u.status === 'active' ? (
                              <Lock className="w-3 h-3 text-red-500" />
                            ) : (
                              <Unlock className="w-3 h-3 text-emerald-500" />
                            )}
                            {u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                          </Button>
                        ) : (
                          <span className="text-[11px] text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta.last_page > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500">
              <span>Tổng {meta.total} người dùng — Trang {meta.current_page}/{meta.last_page}</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={page >= meta.last_page || isLoading}
                  onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
