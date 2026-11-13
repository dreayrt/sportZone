'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, VoucherItem } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import { useOwnerVenue } from '@/context/OwnerVenueContext';
import { Building2, Plus, Tag, X } from 'lucide-react';

interface OwnerVoucherFormState {
  venue_id: string;
  code: string;
  name: string;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  max_discount: string;
  min_order_value: string;
  usage_limit: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'inactive';
}

const blankForm: OwnerVoucherFormState = {
  venue_id: '',
  code: '',
  name: '',
  discount_type: 'fixed',
  discount_value: '',
  max_discount: '',
  min_order_value: '0',
  usage_limit: '',
  starts_at: '',
  ends_at: '',
  status: 'active',
};

function toDateTimeInput(value: string): string {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return value.replace(' ', 'T').slice(0, 16);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace(' ', 'T').slice(0, 16);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function formatLocalDateTime(value: string): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function OwnerVouchersPage() {
  const { venues, venueId, venue } = useOwnerVenue();

  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [form, setForm] = useState<OwnerVoucherFormState>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const requestId = useRef(0);

  const loadVouchers = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    const response = await api.owner.vouchers.list({
      per_page: 20,
      page,
      keyword,
      status: statusFilter,
      venue_id: venueId ? Number(venueId) : undefined,
    });

    if (id !== requestId.current) return;
    if (response.success) {
      setVouchers(response.data?.data || []);
      setLastPage(response.data?.last_page || 1);
      setTotal(response.data?.total || 0);
      if (page > (response.data?.last_page || 1)) setPage(response.data?.last_page || 1);
      setError('');
    } else {
      setError(response.message || 'Không tải được danh sách voucher của cơ sở.');
    }
    setIsLoading(false);
  }, [page, keyword, statusFilter, venueId]);

  useEffect(() => {
    const timer = setTimeout(() => void loadVouchers(), 250);
    return () => {
      clearTimeout(timer);
      requestId.current++;
    };
  }, [loadVouchers]);

  const updateField = <K extends keyof OwnerVoucherFormState>(key: K, value: OwnerVoucherFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startCreate = () => {
    setEditingId(null);
    const activeVenueId = venueId || (venues[0]?.id ? String(venues[0].id) : '');
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    setForm({
      ...blankForm,
      venue_id: activeVenueId,
      starts_at: toDateTimeInput(now.toISOString()),
      ends_at: toDateTimeInput(nextMonth.toISOString()),
    });
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const startEdit = (voucher: VoucherItem) => {
    setEditingId(voucher.id);
    setForm({
      venue_id: voucher.venue_id ? String(voucher.venue_id) : (venueId || ''),
      code: voucher.code,
      name: voucher.name,
      discount_type: voucher.discount_type,
      discount_value: String(voucher.discount_value),
      max_discount: voucher.max_discount == null ? '' : String(voucher.max_discount),
      min_order_value: String(voucher.min_order_value),
      usage_limit: voucher.usage_limit == null ? '' : String(voucher.usage_limit),
      starts_at: toDateTimeInput(voucher.starts_at),
      ends_at: toDateTimeInput(voucher.ends_at),
      status: voucher.status,
    });
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const saveVoucher = async (event: React.FormEvent) => {
    event.preventDefault();

    const targetVenueId = form.venue_id || venueId || (venues[0]?.id ? String(venues[0].id) : '');
    if (!targetVenueId) {
      setError('Vui lòng chọn cơ sở ở thanh quản lý phía trên trước khi tạo mã khuyến mãi.');
      return;
    }

    setIsSaving(true);
    setError('');
    setNotice('');

    const body = {
      venue_id: Number(targetVenueId),
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      min_order_value: Number(form.min_order_value || 0),
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      status: form.status,
    };

    const response = editingId
      ? await api.owner.vouchers.update(editingId, body)
      : await api.owner.vouchers.create(body);

    if (response.success) {
      setNotice(editingId ? 'Đã cập nhật mã khuyến mãi.' : 'Đã tạo mã khuyến mãi mới cho cơ sở.');
      setShowForm(false);
      setEditingId(null);
      setForm(blankForm);
      await loadVouchers();
    } else {
      setError(response.message || 'Không lưu được mã khuyến mãi.');
    }
    setIsSaving(false);
  };

  const removeVoucher = async (voucher: VoucherItem) => {
    if (!window.confirm(`Xóa hoặc tạm ngưng mã ${voucher.code}?`)) return;
    const response = await api.owner.vouchers.delete(voucher.id);
    if (response.success) {
      setNotice(response.message || 'Đã cập nhật trạng thái mã khuyến mãi.');
      await loadVouchers();
    } else {
      setError(response.message || 'Không thể xóa mã khuyến mãi.');
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Mã Khuyến Mãi"
        description={
          venue
            ? `Tạo và quản lý voucher ưu đãi cho cơ sở "${venue.name}".`
            : 'Tạo và quản lý voucher ưu đãi dành riêng cho cơ sở sân thể thao của bạn.'
        }
        actions={
          venues.length > 0 ? (
            <Button variant="primary" size="sm" className="gap-1.5" onClick={startCreate}>
              <Plus className="w-3.5 h-3.5" />
              Tạo voucher
            </Button>
          ) : undefined
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {venues.length === 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center justify-between">
            <span>Bạn cần tạo ít nhất một cơ sở sân để có thể thiết lập mã khuyến mãi.</span>
            <Link href="/dashboard/owner/venues">
              <Button size="sm" variant="outline">
                Thêm cơ sở ngay
              </Button>
            </Link>
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {showForm && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-neutral-900 dark:text-white">
                  {editingId ? 'Chỉnh sửa mã khuyến mãi' : 'Tạo mã khuyến mãi mới'}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  aria-label="Đóng biểu mẫu"
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={saveVoucher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* HIỂN THỊ CƠ SỞ ĐANG CHỌN TỪ HEADER */}
                <div className="md:col-span-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/60 dark:bg-emerald-950/30 dark:border-emerald-800 text-xs flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-neutral-500 dark:text-neutral-400">Áp dụng cho cơ sở: </span>
                    <strong className="text-neutral-900 dark:text-white text-sm">
                      {venue?.name || 'Cơ sở hiện tại'}
                    </strong>
                    {venue?.district && (
                      <span className="text-neutral-500 ml-1.5">
                        ({venue.district}, {venue.city})
                      </span>
                    )}
                  </div>
                </div>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Mã voucher *
                  </span>
                  <input
                    required
                    maxLength={50}
                    placeholder="VD: SANVIET20"
                    value={form.code}
                    onChange={(event) => updateField('code', event.target.value.toUpperCase())}
                    className={`${inputClass} font-mono`}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Tên chương trình / ưu đãi *
                  </span>
                  <input
                    required
                    maxLength={150}
                    placeholder="VD: Giảm 20k mừng khai trương sân"
                    value={form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Loại giảm giá
                  </span>
                  <select
                    value={form.discount_type}
                    onChange={(event) =>
                      updateField('discount_type', event.target.value as OwnerVoucherFormState['discount_type'])
                    }
                    className={inputClass}
                  >
                    <option value="fixed">Số tiền cố định (VNĐ)</option>
                    <option value="percent">Phần trăm (%)</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    {form.discount_type === 'percent' ? 'Mức giảm (%) *' : 'Số tiền giảm (VNĐ) *'}
                  </span>
                  <input
                    required
                    type="number"
                    min={1}
                    max={form.discount_type === 'percent' ? 100 : undefined}
                    placeholder={form.discount_type === 'percent' ? '10' : '20000'}
                    value={form.discount_value}
                    onChange={(event) => updateField('discount_value', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Giảm tối đa (đ)
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="Không giới hạn"
                    disabled={form.discount_type === 'fixed'}
                    value={form.discount_type === 'fixed' ? '' : form.max_discount}
                    onChange={(event) => updateField('max_discount', event.target.value)}
                    className={`${inputClass} disabled:bg-neutral-100 disabled:opacity-60`}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Đơn tối thiểu (đ)
                  </span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.min_order_value}
                    onChange={(event) => updateField('min_order_value', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Giới hạn lượt dùng
                  </span>
                  <input
                    type="number"
                    min={1}
                    placeholder="Không giới hạn"
                    value={form.usage_limit}
                    onChange={(event) => updateField('usage_limit', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Trạng thái
                  </span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField('status', event.target.value as OwnerVoucherFormState['status'])
                    }
                    className={inputClass}
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Thời gian bắt đầu *
                  </span>
                  <input
                    required
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) => updateField('starts_at', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Thời gian kết thúc *
                  </span>
                  <input
                    required
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(event) => updateField('ends_at', event.target.value)}
                    className={inputClass}
                  />
                </label>

                <div className="md:col-span-3 flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSaving}>
                    {isSaving ? 'Đang lưu...' : 'Lưu voucher'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* BỘ LỌC TÌM KIẾM (ĐÃ BỎ DROPDOWN CƠ SỞ TRÙNG LẶP) */}
        <div className="flex flex-wrap gap-3">
          <input
            aria-label="Tìm voucher"
            placeholder="Tìm theo mã hoặc tên voucher..."
            maxLength={150}
            className={`${inputClass} max-w-sm`}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />

          <select
            aria-label="Lọc trạng thái voucher"
            className={`${inputClass} max-w-44`}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="inactive">Tạm ngưng</option>
          </select>
        </div>

        {/* BẢNG DANH SÁCH VOUCHER */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? (
              <div className="p-10 text-center text-sm text-neutral-500">Đang tải danh sách voucher...</div>
            ) : vouchers.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Tag className="w-10 h-10 text-neutral-300 mx-auto" />
                <p className="text-sm text-neutral-500">
                  {venue
                    ? `Cơ sở "${venue.name}" chưa có mã khuyến mãi nào.`
                    : 'Chưa có mã khuyến mãi nào.'}
                </p>
                {venues.length > 0 && (
                  <Button size="sm" variant="primary" onClick={startCreate}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tạo voucher cho cơ sở này
                  </Button>
                )}
              </div>
            ) : (
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-xs text-neutral-500">
                  <tr>
                    <th className="px-5 py-3">Voucher</th>
                    <th className="px-5 py-3">Ưu đãi</th>
                    <th className="px-5 py-3">Lượt dùng</th>
                    <th className="px-5 py-3">Hiệu lực</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-neutral-900 dark:text-white">
                              {voucher.code}
                            </p>
                            <p className="text-xs text-neutral-500">{voucher.name}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {voucher.discount_type === 'percent'
                            ? `${voucher.discount_value}%${
                                voucher.max_discount ? ` · tối đa ${formatVND(voucher.max_discount)}` : ''
                              }`
                            : formatVND(voucher.discount_value)}
                        </span>
                        <p className="text-xs text-neutral-500">Đơn từ {formatVND(voucher.min_order_value)}</p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-medium">
                          {voucher.used_count}/{voucher.usage_limit ?? '∞'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-neutral-500">
                        {formatLocalDateTime(voucher.starts_at)}
                        <br />
                        đến {formatLocalDateTime(voucher.ends_at)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            voucher.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          {voucher.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(voucher)}>
                            Sửa
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => removeVoucher(voucher)}>
                            Xóa / ngưng
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* PHÂN TRANG */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <span>
            {total} voucher · Trang {page}/{lastPage}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => setPage((n) => n - 1)}>
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || page >= lastPage}
              onClick={() => setPage((n) => n + 1)}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
