'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Award, Check, Copy, Gift, History, RefreshCw, Sparkles, Ticket, TrendingUp, X } from 'lucide-react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  api,
  type LoyaltyHistoryData,
  type LoyaltySummaryData,
  type LoyaltyTier,
  type LoyaltyTransaction,
} from '@/lib/api';

const tierLabels: Record<LoyaltyTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
};

const transactionLabels: Record<LoyaltyTransaction['type'], string> = {
  earn: 'Tích điểm',
  redeem: 'Đổi điểm',
  expire: 'Điểm hết hạn',
  bonus: 'Điểm thưởng',
  refund: 'Hoàn điểm',
};

function formatDate(value: string | null): string {
  if (!value) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function CustomerLoyaltyPage() {
  const [summary, setSummary] = useState<LoyaltySummaryData | null>(null);
  const [history, setHistory] = useState<LoyaltyHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Đổi thưởng modal state
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<number>(50);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemedVoucher, setRedeemedVoucher] = useState<{
    code: string;
    name: string;
    discount_value: number;
    ends_at: string;
  } | null>(null);
  const [hasCopiedCode, setHasCopiedCode] = useState(false);

  const loadLoyaltyData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const [summaryResponse, historyResponse] = await Promise.all([
      api.loyalty.getSummary(),
      api.loyalty.getHistory({ per_page: 20 }),
    ]);

    if (!summaryResponse.success || !historyResponse.success) {
      setError(summaryResponse.message || historyResponse.message || 'Không thể tải dữ liệu điểm thưởng.');
      setIsLoading(false);
      return;
    }

    setSummary(summaryResponse.data);
    setHistory(historyResponse.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadLoyaltyData();
  }, [loadLoyaltyData]);

  const handleStartRedeem = () => {
    setRedeemError('');
    setRedeemedVoucher(null);
    setHasCopiedCode(false);
    setSelectedPoints(50);
    setIsRedeemModalOpen(true);
  };

  const handleExecuteRedeem = async () => {
    setIsRedeeming(true);
    setRedeemError('');
    try {
      const response = await api.loyalty.redeem(selectedPoints);
      if (response.success && response.data?.voucher) {
        setRedeemedVoucher(response.data.voucher);
        // Refresh balance and transaction list
        void loadLoyaltyData();
      } else {
        setRedeemError(response.message || 'Không thể đổi điểm thưởng lúc này.');
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setRedeemError(errorObj?.message || 'Có lỗi xảy ra khi đổi điểm.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setHasCopiedCode(true);
      setTimeout(() => setHasCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  };

  const description = summary
    ? `Mỗi ${summary.earning_rule.amount_vnd.toLocaleString('vi-VN')}đ chi tiêu nhận ${summary.earning_rule.points} điểm thưởng SportZone.`
    : 'Theo dõi điểm thưởng, hạng thành viên và lịch sử giao dịch của bạn.';

  return (
    <div>
      <DashboardHeader title="Tích Điểm & Hạng Thành Viên" description={description} />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        {isLoading ? (
          <div className="grid min-h-72 place-items-center rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-col items-center gap-3 text-sm text-neutral-500">
              <RefreshCw className="h-6 w-6 animate-spin text-sport-500" />
              Đang tải thông tin điểm thưởng...
            </div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex min-h-64 flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="h-9 w-9 text-red-500" />
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">Không thể tải Loyalty Program</p>
                <p className="mt-1 text-sm text-neutral-500">{error}</p>
              </div>
              <Button variant="outline" onClick={() => void loadLoyaltyData()}>
                <RefreshCw className="h-4 w-4" />
                Thử lại
              </Button>
            </CardContent>
          </Card>
        ) : summary && history ? (
          <>
            <section className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 p-6 text-white shadow-lg sm:p-8">
              <Sparkles className="absolute -right-8 -top-8 h-40 w-40 text-sport-500/10" />
              <div className="relative z-10 grid gap-7 lg:grid-cols-[1fr_22rem] lg:items-center">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="warning" size="md" className="uppercase font-bold tracking-wider">
                      Hạng {tierLabels[summary.current_tier]}
                    </Badge>
                    <span className="text-xs text-neutral-400">SportZone Athlete Club</span>
                  </div>
                  <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                    <div>
                      <p className="text-4xl font-extrabold tabular-nums">{summary.current_points.toLocaleString('vi-VN')}</p>
                      <p className="mt-1 text-xs text-neutral-400">Điểm có thể sử dụng</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-neutral-200">{summary.lifetime_points.toLocaleString('vi-VN')}</p>
                      <p className="mt-1 text-xs text-neutral-400">Điểm tích lũy trọn đời</p>
                    </div>
                  </div>
                  <p className="max-w-xl text-sm text-neutral-400">
                    {summary.next_tier
                      ? <>Còn <strong className="text-white">{summary.points_to_next_tier.toLocaleString('vi-VN')} điểm</strong> để đạt hạng <strong className="text-white">{tierLabels[summary.next_tier]}</strong>.</>
                      : 'Bạn đã đạt hạng thành viên cao nhất của SportZone.'}
                  </p>
                </div>

                <div className="space-y-3 rounded-xl border border-neutral-700/70 bg-neutral-800/70 p-5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-neutral-300">
                      {summary.next_tier ? `Tiến trình lên ${tierLabels[summary.next_tier]}` : 'Hạng cao nhất'}
                    </span>
                    <span className="text-sport-400">{summary.progress_percent}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-sport-500 transition-all duration-500"
                      style={{ width: `${summary.progress_percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-400">
                    <span>{tierLabels[summary.current_tier]} ({summary.tier_thresholds[summary.current_tier].toLocaleString('vi-VN')})</span>
                    <span>
                      {summary.next_tier
                        ? `${tierLabels[summary.next_tier]} (${summary.tier_thresholds[summary.next_tier].toLocaleString('vi-VN')})`
                        : `${tierLabels[summary.current_tier]}`}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-sport-500" />
                    Đổi Điểm Nhận Ưu Đãi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/60">
                    <Award className="mb-3 h-7 w-7 text-amber-500" />
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {summary.redemption.enabled ? 'Sẵn sàng đổi thưởng' : 'Đổi thưởng chưa khả dụng'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {summary.redemption.reason}
                    </p>
                  </div>
                  <Button
                    className="w-full gap-2"
                    variant="primary"
                    disabled={!summary.redemption.enabled || summary.current_points < 50}
                    onClick={handleStartRedeem}
                  >
                    <Ticket className="h-4 w-4" />
                    Chọn phần thưởng
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-4 w-4 text-neutral-400" />
                    Lịch Sử Giao Dịch Điểm
                  </CardTitle>
                  <Badge variant="neutral">{history.pagination.total} giao dịch</Badge>
                </CardHeader>

                {history.transactions.length === 0 ? (
                  <CardContent className="grid min-h-56 place-items-center text-center">
                    <div>
                      <TrendingUp className="mx-auto h-8 w-8 text-neutral-300" />
                      <p className="mt-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">Chưa có giao dịch điểm</p>
                      <p className="mt-1 text-xs text-neutral-500">Lịch sử tích và đổi điểm sẽ xuất hiện tại đây.</p>
                    </div>
                  </CardContent>
                ) : (
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {history.transactions.map((item) => {
                      const isPositive = item.points > 0;

                      return (
                        <div key={item.id} className="flex items-center justify-between gap-4 p-4 sm:px-5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100 sm:text-sm">
                                {item.reason || transactionLabels[item.type]}
                              </p>
                              <Badge variant={isPositive ? 'success' : 'neutral'}>{transactionLabels[item.type]}</Badge>
                            </div>
                            <p className="mt-1 text-[11px] text-neutral-400">
                              {formatDate(item.created_at)} · Số dư {item.balance_after.toLocaleString('vi-VN')} điểm
                            </p>
                          </div>
                          <span className={`shrink-0 font-mono text-sm font-bold ${isPositive ? 'text-sport-600 dark:text-sport-400' : 'text-neutral-500'}`}>
                            {isPositive ? '+' : ''}{item.points.toLocaleString('vi-VN')} pt
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        ) : null}

        {/* Modal Đổi Điểm Thưởng */}
        {isRedeemModalOpen && summary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => setIsRedeemModalOpen(false)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sport-50 text-sport-600 dark:bg-sport-950/60 dark:text-sport-400">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Đổi Điểm Lấy Voucher</h3>
                  <p className="text-xs text-neutral-500">Số dư hiện tại: <strong className="text-sport-600 dark:text-sport-400">{summary.current_points.toLocaleString('vi-VN')} điểm</strong></p>
                </div>
              </div>

              {redeemedVoucher ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/50">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">🎉 Đổi thưởng thành công!</p>
                    <p className="mt-1 text-sm font-medium text-emerald-900 dark:text-emerald-100">
                      Voucher giảm {redeemedVoucher.discount_value.toLocaleString('vi-VN')}đ
                    </p>

                    <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-400 bg-white p-3 dark:border-emerald-600 dark:bg-neutral-900">
                      <span className="font-mono text-lg font-extrabold tracking-wider text-neutral-900 dark:text-white">
                        {redeemedVoucher.code}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(redeemedVoucher.code)}
                        className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        {hasCopiedCode ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                      Mã có hạn sử dụng 30 ngày. Hãy nhập mã này tại bước thanh toán khi đặt sân.
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      setIsRedeemModalOpen(false);
                      setRedeemedVoucher(null);
                    }}
                  >
                    Đóng
                  </Button>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {redeemError && (
                    <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{redeemError}</span>
                    </div>
                  )}

                  <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Chọn gói ưu đãi bạn muốn đổi:
                  </p>

                  <div className="space-y-2">
                    {[
                      { points: 50, discount: 25000, label: 'Voucher 25.000đ' },
                      { points: 100, discount: 50000, label: 'Voucher 50.000đ' },
                      { points: 200, discount: 100000, label: 'Voucher 100.000đ' },
                    ].map((pkg) => {
                      const canAfford = summary.current_points >= pkg.points;
                      const isSelected = selectedPoints === pkg.points;

                      return (
                        <div
                          key={pkg.points}
                          onClick={() => canAfford && setSelectedPoints(pkg.points)}
                          className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                            !canAfford
                              ? 'cursor-not-allowed opacity-50 border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40'
                              : isSelected
                                ? 'border-sport-500 bg-sport-50/50 dark:border-sport-500 dark:bg-sport-950/30 ring-2 ring-sport-500/20'
                                : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSelected ? 'bg-sport-600 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                              <Ticket className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-neutral-900 dark:text-white">{pkg.label}</p>
                              <p className="text-[11px] text-neutral-500">Giảm trực tiếp khi đặt bất kỳ sân nào</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-sm font-extrabold text-sport-600 dark:text-sport-400">
                              {pkg.points} điểm
                            </span>
                            {!canAfford && (
                              <p className="text-[10px] text-rose-500 font-medium">Chưa đủ điểm</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRedeemModalOpen(false)}
                      disabled={isRedeeming}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleExecuteRedeem}
                      disabled={isRedeeming || summary.current_points < selectedPoints}
                    >
                      {isRedeeming ? (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Đang đổi...
                        </>
                      ) : (
                        `Xác nhận đổi (${selectedPoints} điểm)`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
