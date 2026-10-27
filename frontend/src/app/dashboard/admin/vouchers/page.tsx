'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { api, VoucherItem } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import { Plus, Tag, X } from 'lucide-react';

interface VoucherFormState {
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

const blankForm: VoucherFormState = {
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

export default function AdminVouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherItem[]>([]);
  const [form, setForm] = useState<VoucherFormState>(blankForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadVouchers = useCallback(async () => {
    setIsLoading(true);
    const response = await api.admin.vouchers.list({ per_page: 100 });
    if (response.success) {
      setVouchers(response.data?.data || []);
      setError('');
    } else {
      setError(response.message || 'Không tải được danh sách voucher.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  const updateField = <K extends keyof VoucherFormState>(key: K, value: VoucherFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(blankForm);
    setShowForm(true);
    setError('');
    setNotice('');
  };

  const startEdit = (voucher: VoucherItem) => {
    setEditingId(voucher.id);
    setForm({
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
    setIsSaving(true);
    setError('');
    setNotice('');

    const body = {
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
      ? await api.admin.vouchers.update(editingId, body)
      : await api.admin.vouchers.create(body);

    if (response.success) {
      setNotice(editingId ? 'Đã cập nhật voucher.' : 'Đã tạo voucher mới.');
      setShowForm(false);
      setEditingId(null);
      setForm(blankForm);
      await loadVouchers();
    } else {
      setError(response.message || 'Không lưu được voucher.');
    }
    setIsSaving(false);
  };

  const removeVoucher = async (voucher: VoucherItem) => {
    if (!window.confirm(`Xóa hoặc tạm ngưng mã ${voucher.code}?`)) return;
    const response = await api.admin.vouchers.delete(voucher.id);
    if (response.success) {
      setNotice(response.message || 'Đã cập nhật trạng thái voucher.');
      await loadVouchers();
    } else {
      setError(response.message || 'Không thể xóa voucher.');
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm';

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Mã Khuyến Mãi"
        description="Tạo và quản lý voucher áp dụng toàn hệ thống cho đồ án SportZone."
        actions={<Button variant="primary" size="sm" className="gap-1.5" onClick={startCreate}><Plus className="w-3.5 h-3.5" />Tạo voucher</Button>}
      />
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        {showForm && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">{editingId ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</h2><button type="button" onClick={() => setShowForm(false)} aria-label="Đóng biểu mẫu"><X className="w-4 h-4" /></button></div>
              <form onSubmit={saveVoucher} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="space-y-1.5"><span className="text-xs font-medium">Mã voucher *</span><input required maxLength={50} value={form.code} onChange={(event) => updateField('code', event.target.value.toUpperCase())} className={`${inputClass} font-mono`} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Tên chương trình *</span><input required maxLength={150} value={form.name} onChange={(event) => updateField('name', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Loại giảm</span><select value={form.discount_type} onChange={(event) => updateField('discount_type', event.target.value as VoucherFormState['discount_type'])} className={inputClass}><option value="fixed">Số tiền cố định</option><option value="percent">Phần trăm</option></select></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Giá trị giảm *</span><input required type="number" min={1} value={form.discount_value} onChange={(event) => updateField('discount_value', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Giảm tối đa (đ)</span><input type="number" min={0} value={form.max_discount} onChange={(event) => updateField('max_discount', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Đơn tối thiểu (đ)</span><input type="number" min={0} value={form.min_order_value} onChange={(event) => updateField('min_order_value', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Giới hạn lượt dùng</span><input type="number" min={1} value={form.usage_limit} onChange={(event) => updateField('usage_limit', event.target.value)} placeholder="Không giới hạn" className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Bắt đầu *</span><input required type="datetime-local" value={form.starts_at} onChange={(event) => updateField('starts_at', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Kết thúc *</span><input required type="datetime-local" value={form.ends_at} onChange={(event) => updateField('ends_at', event.target.value)} className={inputClass} /></label>
                <label className="space-y-1.5"><span className="text-xs font-medium">Trạng thái</span><select value={form.status} onChange={(event) => updateField('status', event.target.value as VoucherFormState['status'])} className={inputClass}><option value="active">Đang hoạt động</option><option value="inactive">Tạm ngưng</option></select></label>
                <div className="md:col-span-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button><Button type="submit" variant="primary" disabled={isSaving}>{isSaving ? 'Đang lưu...' : 'Lưu voucher'}</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {isLoading ? <div className="p-10 text-center text-sm text-neutral-500">Đang tải voucher...</div> : vouchers.length === 0 ? <div className="p-10 text-center text-sm text-neutral-500">Chưa có voucher nào.</div> : (
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/70 text-xs text-neutral-500"><tr><th className="px-5 py-3">Voucher</th><th className="px-5 py-3">Ưu đãi</th><th className="px-5 py-3">Lượt dùng</th><th className="px-5 py-3">Hiệu lực</th><th className="px-5 py-3">Trạng thái</th><th className="px-5 py-3 text-right">Thao tác</th></tr></thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {vouchers.map((voucher) => (
                    <tr key={voucher.id}>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><Tag className="w-4 h-4 text-sport-600" /><div><p className="font-mono font-semibold">{voucher.code}</p><p className="text-xs text-neutral-500">{voucher.name}</p></div></div></td>
                      <td className="px-5 py-4">{voucher.discount_type === 'percent' ? `${voucher.discount_value}%${voucher.max_discount ? ` · tối đa ${formatVND(voucher.max_discount)}` : ''}` : formatVND(voucher.discount_value)}<p className="text-xs text-neutral-500">Đơn từ {formatVND(voucher.min_order_value)}</p></td>
                      <td className="px-5 py-4">{voucher.used_count}/{voucher.usage_limit ?? '∞'}</td>
                      <td className="px-5 py-4 text-xs text-neutral-500">{formatLocalDateTime(voucher.starts_at)}<br />đến {formatLocalDateTime(voucher.ends_at)}</td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs ${voucher.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>{voucher.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}</span></td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => startEdit(voucher)}>Sửa</Button><Button size="sm" variant="outline" onClick={() => removeVoucher(voucher)}>Xóa / ngưng</Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
