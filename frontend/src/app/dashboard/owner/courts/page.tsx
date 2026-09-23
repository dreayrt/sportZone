'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_VENUES, Court } from '@/lib/mock-data';
import { formatVND } from '@/lib/utils';
import { Plus, Edit2, CircleDot, Clock, Sliders, Check } from 'lucide-react';

export default function OwnerCourtsPage() {
  const venue = MOCK_VENUES[0];
  const [courts, setCourts] = useState<Court[]>(venue.courts || []);
  const [editingCourt, setEditingCourt] = useState<Court | null>(null);

  const handleSaveCourt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourt) return;
    setCourts(courts.map(c => c.id === editingCourt.id ? editingCourt : c));
    setEditingCourt(null);
  };

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Danh Sách Sân Đấu"
        description="Cấu hình loại mặt sân, sức chứa, bảng giá giờ tiêu chuẩn & giờ vàng (Peak Hours)."
        actions={
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Thêm Sân Mới
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courts.map((court) => (
            <Card key={court.id} hoverEffect className="relative overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      {court.code}
                    </span>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                      {court.name}
                    </h3>
                    <p className="text-xs text-neutral-500">Mặt sân: {court.surface_type}</p>
                  </div>
                  <Badge variant={court.status === 'active' ? 'success' : 'warning'}>
                    {court.status === 'active' ? 'Sẵn sàng' : 'Bảo trì'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-850 text-xs border border-neutral-100 dark:border-neutral-800">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Giá giờ tiêu chuẩn</span>
                    <span className="font-mono font-bold text-sm text-neutral-800 dark:text-neutral-200">
                      {formatVND(court.hourly_rate_standard)}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-amber-500 font-medium block">Giá giờ Peak (17h-21h)</span>
                    <span className="font-mono font-bold text-sm text-amber-600">
                      {formatVND(court.hourly_rate_peak)}/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Loại hình</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {court.indoor ? 'Trong nhà (Indoor)' : 'Ngoài trời (Outdoor)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Thời gian tối thiểu</span>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {court.min_booking_minutes} phút
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => setEditingCourt(court)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Chỉnh sửa giá & giờ
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Modal */}
        {editingCourt && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  Cập Nhật Giá: {editingCourt.name}
                </h3>
                <button
                  onClick={() => setEditingCourt(null)}
                  className="text-neutral-400 hover:text-neutral-900"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveCourt} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Giá giờ tiêu chuẩn (VNĐ/h)
                  </label>
                  <input
                    type="number"
                    value={editingCourt.hourly_rate_standard}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourly_rate_standard: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-amber-600">
                    Giá giờ cao điểm / Peak (VNĐ/h)
                  </label>
                  <input
                    type="number"
                    value={editingCourt.hourly_rate_peak}
                    onChange={(e) => setEditingCourt({ ...editingCourt, hourly_rate_peak: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono text-amber-600 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Trạng thái sân
                  </label>
                  <select
                    value={editingCourt.status}
                    onChange={(e) => setEditingCourt({ ...editingCourt, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  >
                    <option value="active">Sẵn sàng thi đấu (Active)</option>
                    <option value="maintenance">Bảo trì bảo dưỡng (Maintenance)</option>
                    <option value="closed">Tạm ngưng phục vụ (Closed)</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingCourt(null)}>
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Lưu Thay Đổi
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
