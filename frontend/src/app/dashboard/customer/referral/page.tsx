'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Check,
  Copy,
  Gift,
  Link2,
  RefreshCw,
  Share2,
  Users,
} from 'lucide-react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { api, type ReferralData, type ReferralRewardStatus } from '@/lib/api';

const statusPresentation: Record<
  ReferralRewardStatus,
  { label: string; variant: 'success' | 'warning' | 'danger' }
> = {
  pending: { label: 'Chờ booking đầu tiên', variant: 'warning' },
  completed: { label: 'Đã nhận thưởng', variant: 'success' },
  cancelled: { label: 'Đã hủy', variant: 'danger' },
};

function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatReward(status: ReferralRewardStatus, value: number): string {
  if (status === 'completed') return `+${value} điểm`;
  if (status === 'cancelled') return 'Không nhận';

  return `${value} điểm chờ`;
}

export default function CustomerReferralPage() {
  const [referral, setReferral] = useState<ReferralData | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedField, setCopiedField] = useState<'code' | 'link' | null>(null);

  const applyReferralResponse = useCallback((data: ReferralData) => {
    const absoluteLink = new URL(data.referral_link, window.location.origin).toString();
    setReferral({ ...data, referral_link: absoluteLink });
  }, []);

  const loadReferral = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.referral.getMyCode();

    if (response.success && response.data) {
      applyReferralResponse(response.data);
    } else {
      setReferral(null);
      setError(response.message || 'Không thể tải thông tin giới thiệu.');
    }

    setIsLoading(false);
  }, [applyReferralResponse]);

  useEffect(() => {
    const codeFromLink = new URLSearchParams(window.location.search).get('code');

    if (codeFromLink) {
      setClaimCode(codeFromLink.toUpperCase());
    }

    void loadReferral();
  }, [loadReferral]);

  const copyValue = async (value: string, field: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setFeedback(null);
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      setFeedback({ type: 'error', message: 'Không thể sao chép. Vui lòng sao chép thủ công.' });
    }
  };

  const claimReferral = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!claimCode.trim()) {
      setFeedback({ type: 'error', message: 'Vui lòng nhập mã giới thiệu.' });
      return;
    }

    setIsClaiming(true);
    const response = await api.referral.claim(claimCode.trim());

    if (response.success && response.data) {
      setClaimCode('');
      setFeedback({ type: 'success', message: response.message });
      setReferral((current) => current ? {
        ...current,
        has_claimed_referral: true,
        claimed_referral: response.data.claim,
      } : current);
      const refreshedResponse = await api.referral.getMyCode();

      if (refreshedResponse.success && refreshedResponse.data) {
        applyReferralResponse(refreshedResponse.data);
      }
    } else {
      setFeedback({ type: 'error', message: response.message || 'Không thể sử dụng mã giới thiệu.' });
    }

    setIsClaiming(false);
  };

  return (
    <div>
      <DashboardHeader
        title="Giới Thiệu Bạn Bè"
        description="Mời đồng đội tham gia SportZone. Điểm thưởng được ghi nhận khi booking đầu tiên hoàn thành."
      />

      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {isLoading && (
          <Card>
            <CardContent className="flex min-h-64 items-center justify-center p-8 text-sm text-neutral-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Đang tải chương trình giới thiệu...
            </CardContent>
          </Card>
        )}

        {!isLoading && error && (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
              <AlertCircle className="h-9 w-9 text-rose-500" strokeWidth={1.5} />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Không thể tải Referral Program</p>
                <p className="mt-1 text-sm text-neutral-500">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadReferral()}>
                Thử lại
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && referral && (
          <>
            <Card className="border-sport-200/60 bg-gradient-to-r from-sport-900/10 via-neutral-50 to-white dark:border-sport-900/40 dark:from-sport-950/20 dark:via-neutral-900 dark:to-neutral-900">
              <CardContent className="flex flex-col items-center justify-between gap-6 p-6 sm:p-8 md:flex-row">
                <div className="space-y-3">
                  <Badge variant="sport" size="md">
                    Chương Trình Đối Tác Giới Thiệu
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                    Nhận <span className="text-sport-600">{referral.reward_policy.referrer_points} điểm</span>{' '}
                    cho mỗi lượt mời đủ điều kiện
                  </h2>
                  <p className="max-w-lg text-xs text-neutral-500 sm:text-sm">
                    Người được giới thiệu nhận {referral.reward_policy.referred_points} điểm. Phần thưởng chuyển sang hoàn tất sau booking đầu tiên thành công.
                  </p>
                </div>

                <div className="min-w-[280px] space-y-3 rounded-xl border border-neutral-200 bg-white p-5 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                    Mã Giới Thiệu Của Bạn
                  </span>
                  <div className="font-mono text-2xl font-extrabold tracking-widest text-neutral-900 dark:text-white">
                    {referral.code}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="text-xs"
                      onClick={() => void copyValue(referral.code, 'code')}
                    >
                      {copiedField === 'code' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedField === 'code' ? 'Đã chép' : 'Chép mã'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => void copyValue(referral.referral_link, 'link')}
                    >
                      {copiedField === 'link' ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      {copiedField === 'link' ? 'Đã chép' : 'Chép link'}
                    </Button>
                  </div>
                  <p className="truncate text-left font-mono text-[10px] text-neutral-400" title={referral.referral_link}>
                    {referral.referral_link}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-sky-50 p-3 text-sky-600 dark:bg-sky-950/40">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Đã giới thiệu</p>
                    <p className="font-mono text-2xl font-bold text-neutral-900 dark:text-white">{referral.total_referrals}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-sport-50 p-3 text-sport-600 dark:bg-sport-950/40">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Điểm đã nhận</p>
                    <p className="font-mono text-2xl font-bold text-neutral-900 dark:text-white">{referral.total_rewards}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-600 dark:bg-amber-950/40">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Thưởng người được mời</p>
                    <p className="font-mono text-2xl font-bold text-neutral-900 dark:text-white">
                      {referral.reward_policy.referred_points} điểm
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-sport-600" />
                  <CardTitle>Sử Dụng Mã Giới Thiệu</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {referral.has_claimed_referral && referral.claimed_referral ? (
                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4 sm:flex-row sm:items-center dark:border-neutral-800 dark:bg-neutral-800/40">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        Bạn đã dùng mã <span className="font-mono text-sport-600">{referral.claimed_referral.code}</span>
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        Người giới thiệu: {referral.claimed_referral.referrer.full_name} · Thưởng của bạn: {referral.claimed_referral.reward_value} điểm
                      </p>
                    </div>
                    <Badge variant={statusPresentation[referral.claimed_referral.status].variant}>
                      {statusPresentation[referral.claimed_referral.status].label}
                    </Badge>
                  </div>
                ) : (
                  <form onSubmit={claimReferral} className="flex max-w-2xl flex-col gap-3 sm:flex-row">
                    <input
                      value={claimCode}
                      onChange={(event) => setClaimCode(event.target.value.toUpperCase())}
                      maxLength={20}
                      placeholder="Nhập mã giới thiệu của bạn bè"
                      className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3.5 py-2 text-sm uppercase text-neutral-900 outline-none transition focus:border-sport-500 focus:ring-2 focus:ring-sport-500/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                    />
                    <Button type="submit" variant="primary" isLoading={isClaiming} disabled={isClaiming}>
                      Xác nhận mã
                    </Button>
                  </form>
                )}

                {feedback && (
                  <div
                    className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                      feedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-400'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lịch Sử Giới Thiệu ({referral.recent_rewards.length})</CardTitle>
              </CardHeader>
              {referral.recent_rewards.length === 0 ? (
                <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <Users className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Chưa có lượt giới thiệu nào</p>
                  <p className="text-xs text-neutral-400">Chia sẻ mã hoặc đường dẫn bên trên để bắt đầu.</p>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-500 dark:border-neutral-800 dark:bg-neutral-800/40">
                      <tr>
                        <th className="px-5 py-3">Người được giới thiệu</th>
                        <th className="px-5 py-3">Ngày ghi nhận</th>
                        <th className="px-5 py-3">Trạng thái</th>
                        <th className="px-5 py-3 text-right">Phần thưởng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {referral.recent_rewards.map((reward) => (
                        <tr key={reward.id}>
                          <td className="px-5 py-3 font-medium text-neutral-900 dark:text-white">
                            {reward.referred_user.full_name}
                          </td>
                          <td className="px-5 py-3 text-xs text-neutral-400">{formatDate(reward.created_at)}</td>
                          <td className="px-5 py-3">
                            <Badge variant={statusPresentation[reward.status].variant}>
                              {statusPresentation[reward.status].label}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-xs font-bold text-sport-600">
                            {formatReward(reward.status, reward.reward_value)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
