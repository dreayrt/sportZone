'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Award, Gift, ArrowUpRight, CheckCircle2, Sparkles, History } from 'lucide-react';

export default function CustomerLoyaltyPage() {
  const points = 350;
  const nextTierPoints = 500;
  const progressPercent = Math.min(100, Math.round((points / nextTierPoints) * 100));

  const redeemableVouchers = [
    { id: 1, title: 'Giảm 50.000đ cho đơn từ 300.000đ', pointsCost: 100, code: 'SPORTZONE50' },
    { id: 2, title: 'Giảm 100.000đ cho đơn bất kỳ', pointsCost: 200, code: 'VIP100K' },
    { id: 3, title: 'Miễn phí 2 chai nước khoáng Pocari', pointsCost: 50, code: 'FREEWATER' },
  ];

  const pointHistory = [
    { id: 1, action: 'Tích điểm đơn đặt SZ-77812', points: '+50', date: '17/09/2026', type: 'earn' },
    { id: 2, action: 'Thưởng giới thiệu bạn bè thành công', points: '+100', date: '15/09/2026', type: 'earn' },
    { id: 3, action: 'Đổi voucher giảm giá 30k', points: '-60', date: '10/09/2026', type: 'redeem' },
    { id: 4, action: 'Tích điểm đơn đặt SZ-55019', points: '+45', date: '04/09/2026', type: 'earn' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Tích Điểm & Hạng Thành Viên"
        description="Mỗi 10.000đ chi tiêu nhận 1 điểm thưởng SportZone. Tích lũy để thăng hạng và đổi voucher thi đấu."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Tier Progress Card */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 text-white p-6 sm:p-8 relative overflow-hidden shadow-lg">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="warning" size="md" className="uppercase font-bold tracking-wider">
                  Hạng Silver (Bạc)
                </Badge>
                <span className="text-xs text-neutral-400">SportZone Athlete Club</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight tabular-nums">
                {points} <span className="text-base font-normal text-neutral-400">Điểm hiện có</span>
              </h2>
              <p className="text-xs text-neutral-400 max-w-md">
                Bạn chỉ còn thiếu <strong className="text-white">{nextTierPoints - points} điểm</strong> để nâng cấp lên hạng <strong>Gold</strong> (nhận ưu đãi giảm 5% mọi khung giờ peak).
              </p>
            </div>

            <div className="w-full md:w-72 bg-neutral-800/80 p-4 rounded-xl border border-neutral-700/60 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-neutral-300">Tiến trình lên Gold</span>
                <span className="text-sport-400">{progressPercent}%</span>
              </div>
              <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sport-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Silver (300)</span>
                <span>Gold (500)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Redeem Vouchers */}
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
            Đổi Điểm Nhận Ưu Đãi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {redeemableVouchers.map((v) => (
              <Card key={v.id} hoverEffect className="flex flex-col justify-between">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-sport-600 dark:text-sport-400 bg-sport-50 dark:bg-sport-950 px-2 py-1 rounded">
                      {v.code}
                    </span>
                    <Badge variant="warning">{v.pointsCost} Điểm</Badge>
                  </div>
                  <h4 className="font-semibold text-sm text-neutral-900 dark:text-white leading-snug">
                    {v.title}
                  </h4>
                </CardContent>
                <div className="p-5 pt-0">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Đổi thưởng ngay
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Point History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              Lịch Sử Giao Dịch Điểm
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-sm">
            {pointHistory.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 text-xs sm:text-sm">
                    {item.action}
                  </p>
                  <span className="text-[11px] text-neutral-400">{item.date}</span>
                </div>
                <span
                  className={`font-mono font-bold text-sm ${
                    item.type === 'earn' ? 'text-sport-600' : 'text-neutral-500'
                  }`}
                >
                  {item.points} pt
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
