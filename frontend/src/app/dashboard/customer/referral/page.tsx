'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Copy, Check, Share2, Award, ArrowRight } from 'lucide-react';

export default function CustomerReferralPage() {
  const [copied, setCopied] = useState(false);
  const referralCode = 'MINHANH2026';
  const shareUrl = `https://sportzone.vn/register?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invitedList = [
    { id: 1, name: 'Hoàng Quốc Việt', phone: '0938 *** 123', status: 'completed', reward: '+50 pts', date: '15/09/2026' },
    { id: 2, name: 'Trần Văn Nam', phone: '0909 *** 789', status: 'completed', reward: '+50 pts', date: '12/09/2026' },
    { id: 3, name: 'Đặng Thùy Dương', phone: '0988 *** 456', status: 'pending', reward: 'Đang chờ đơn đầu', date: '10/09/2026' },
  ];

  return (
    <div>
      <DashboardHeader
        title="Giới Thiệu Bạn Bè"
        description="Mời đồng đội tham gia SportZone cùng thi đấu. Cả hai đều nhận điểm thưởng khi đơn đặt sân đầu tiên hoàn thành."
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Referral Hero Card */}
        <Card className="bg-gradient-to-r from-sport-900/10 via-neutral-50 to-white dark:from-sport-950/20 dark:via-neutral-900 dark:to-neutral-900 border-sport-200/60 dark:border-sport-900/40">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-3">
              <Badge variant="sport" size="md">
                Chương Trình Đối Tác Giới Thiệu
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Nhận ngay <span className="text-sport-600">50 điểm thưởng</span> cho mỗi lượt mời
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-lg">
                Người được bạn giới thiệu cũng sẽ nhận ngay <strong>30 điểm thưởng</strong> và mã voucher giảm 10% cho trận đấu đầu tiên.
              </p>
            </div>

            {/* Code Box */}
            <div className="bg-white dark:bg-neutral-800 p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm text-center min-w-[260px] space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block">
                Mã Giới Thiệu Của Bạn
              </span>
              <div className="text-2xl font-mono font-extrabold tracking-widest text-neutral-900 dark:text-white">
                {referralCode}
              </div>
              <Button
                variant="primary"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép!' : 'Sao chép mã'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 3 Step Instruction */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                1
              </div>
              <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">Chia sẻ mã hoặc link</h4>
              <p className="text-xs text-neutral-500">Gửi mã {referralCode} cho bạn bè cùng câu lạc bộ hoặc nhóm thể thao.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-700 dark:text-neutral-300">
                2
              </div>
              <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">Bạn bè đặt sân</h4>
              <p className="text-xs text-neutral-500">Bạn bè đăng ký tài khoản và hoàn tất trận đấu đầu tiên trên hệ thống.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="w-7 h-7 rounded-full bg-sport-50 text-sport-600 dark:bg-sport-950 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">Cùng nhận thưởng</h4>
              <p className="text-xs text-neutral-500">Điểm thưởng được tự động cộng vào tài khoản để quy đổi voucher.</p>
            </CardContent>
          </Card>
        </div>

        {/* Invited List */}
        <Card>
          <CardHeader>
            <CardTitle>Danh Sách Đã Giới Thiệu ({invitedList.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 text-xs font-semibold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-5">Tên người dùng</th>
                  <th className="py-3 px-5">Số điện thoại</th>
                  <th className="py-3 px-5">Ngày tham gia</th>
                  <th className="py-3 px-5">Trạng thái</th>
                  <th className="py-3 px-5 text-right">Phần thưởng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {invitedList.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 px-5 font-medium text-neutral-900 dark:text-white">{row.name}</td>
                    <td className="py-3 px-5 text-xs text-neutral-500 font-mono">{row.phone}</td>
                    <td className="py-3 px-5 text-xs text-neutral-400">{row.date}</td>
                    <td className="py-3 px-5">
                      <Badge variant={row.status === 'completed' ? 'success' : 'warning'}>
                        {row.status === 'completed' ? 'Đã hoàn thành đơn' : 'Đang chờ đơn đầu'}
                      </Badge>
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-xs text-sport-600">
                      {row.reward}
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
