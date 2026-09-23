'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Sliders, Check, CreditCard, Award, Phone } from 'lucide-react';

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div>
      <DashboardHeader
        title="Cấu Hình Tham Số Hệ Thống"
        description="Quản lý tài khoản ngân hàng nhận thanh toán VietQR, tỷ lệ tích điểm và hotline hỗ trợ."
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Lưu cài đặt hệ thống thành công!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* VietQR Bank Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                Cấu Hình Thanh Toán VietQR Tự Động
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Ngân hàng nhận tiền
                  </label>
                  <input
                    type="text"
                    defaultValue="Vietcombank"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Số tài khoản
                  </label>
                  <input
                    type="text"
                    defaultValue="0123456789"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Tên chủ tài khoản
                  </label>
                  <input
                    type="text"
                    defaultValue="SPORTZONE VIETNAM"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono uppercase bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty and Referral Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Award className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                Tham Số Tích Điểm & Giới Thiệu (Loyalty / Referral)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Điểm tích lũy cho mỗi 10.000đ chi tiêu
                  </label>
                  <input
                    type="number"
                    defaultValue={1}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Điểm thưởng người giới thiệu (Referrer)
                  </label>
                  <input
                    type="number"
                    defaultValue={50}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Điểm thưởng người được giới thiệu (Referred)
                  </label>
                  <input
                    type="number"
                    defaultValue={30}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Thời gian gửi nhắc nhở trước giờ chơi (phút)
                  </label>
                  <input
                    type="number"
                    defaultValue={60}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="sm">
                  Lưu Cấu Hình
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
