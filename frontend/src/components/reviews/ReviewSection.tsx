'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';
import {
  Star,
  MessageSquare,
  PenSquare,
  User,
  Filter,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ReviewItem {
  id: number;
  rating: number;
  comment: string;
  status: 'visible' | 'hidden';
  created_at: string;
  user: {
    id: number | null;
    name: string;
    avatar?: string | null;
  };
}

interface RatingDistribution {
  '5': number;
  '4': number;
  '3': number;
  '2': number;
  '1': number;
}

interface ReviewSectionProps {
  venueId: number;
  venueSlug: string;
  venueName: string;
  onRatingUpdated?: (newRating: number, newReviewCount: number) => void;
}

export function ReviewSection({
  venueId,
  venueSlug,
  venueName,
  onRatingUpdated,
}: ReviewSectionProps) {
  const { user } = useAuth();

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [distribution, setDistribution] = useState<RatingDistribution>({
    '5': 0,
    '4': 0,
    '3': 0,
    '2': 0,
    '1': 0,
  });

  const [selectedRating, setSelectedRating] = useState<number | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lastPage, setLastPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Lưu callback vào ref để tránh infinite loop khi callback thay đổi reference
  const onRatingUpdatedRef = useRef(onRatingUpdated);
  useEffect(() => {
    onRatingUpdatedRef.current = onRatingUpdated;
  }, [onRatingUpdated]);

  // Fetch reviews from Backend
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.reviews.getVenueReviews(venueId, {
        rating: selectedRating,
        page: currentPage,
        per_page: 5,
      });

      if (res.success && res.data) {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.average_rating ?? 0);
        setTotalReviews(res.data.total_reviews ?? 0);
        if (res.data.rating_distribution) {
          setDistribution(res.data.rating_distribution);
        }
        if (res.data.pagination?.last_page) {
          setLastPage(res.data.pagination.last_page);
        }

        // Báo cho component cha biết rating đã được cập nhật qua ref
        if (onRatingUpdatedRef.current && res.data.average_rating !== undefined) {
          onRatingUpdatedRef.current(res.data.average_rating, res.data.total_reviews);
        }
      }
    } catch {
      // Fallback
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, selectedRating, currentPage]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleRatingFilter = (rating?: number) => {
    setSelectedRating(rating);
    setCurrentPage(1);
  };

  const handleReviewSuccess = () => {
    fetchReviews();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-sport-500" />
            Đánh Giá & Nhận Xét Từ Người Chơi
          </CardTitle>
          <p className="text-xs text-neutral-500 mt-0.5">
            Phản hồi thực tế từ các vận động viên và đội bóng đã trải nghiệm thi đấu tại cơ sở.
          </p>
        </div>

        <div>
          {user ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="gap-1.5 shadow-sm"
            >
              <PenSquare className="w-3.5 h-3.5" />
              Viết Đánh Giá
            </Button>
          ) : (
            <Link href="/auth/login">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <PenSquare className="w-3.5 h-3.5" />
                Đăng nhập để đánh giá
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Rating Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl bg-neutral-50/80 dark:bg-neutral-950/50 border border-neutral-100 dark:border-neutral-800/80 items-center">
          {/* Cột điểm trung bình */}
          <div className="md:col-span-4 text-center md:text-left space-y-2 md:border-r border-neutral-200 dark:border-neutral-800 md:pr-6">
            <span className="text-xs uppercase tracking-wider font-semibold text-neutral-400 block">
              Điểm Đánh Giá Trung Bình
            </span>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-5xl font-black font-mono text-neutral-900 dark:text-white tracking-tight">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-base text-neutral-400 font-medium">/ 5.0</span>
            </div>

            <div className="flex items-center justify-center md:justify-start gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(averageRating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-neutral-300 dark:text-neutral-700'
                  }`}
                  strokeWidth={1.5}
                />
              ))}
            </div>

            <p className="text-xs text-neutral-500">
              Dựa trên <strong>{totalReviews}</strong> lượt đánh giá hợp lệ
            </p>
          </div>

          {/* Cột thanh tiến độ phân bổ sao (5 -> 1) */}
          <div className="md:col-span-8 space-y-2">
            {[5, 4, 3, 2, 1].map((starKey) => {
              const count = distribution[String(starKey) as keyof RatingDistribution] || 0;
              const percent = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
              const isCurrentFilter = selectedRating === starKey;

              return (
                <div
                  key={starKey}
                  onClick={() => handleRatingFilter(isCurrentFilter ? undefined : starKey)}
                  className={`flex items-center gap-3 text-xs cursor-pointer group py-0.5 px-2 rounded-lg transition-colors ${
                    isCurrentFilter
                      ? 'bg-sport-50 dark:bg-sport-950/40 text-sport-700 dark:text-sport-300'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-900/60 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  <span className="w-12 font-medium flex items-center gap-1 shrink-0">
                    {starKey} <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </span>

                  <div className="flex-1 h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCurrentFilter ? 'bg-sport-500' : 'bg-amber-400 group-hover:bg-amber-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <span className="w-14 text-right tabular-nums text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-200">
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <span className="text-xs font-semibold text-neutral-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc theo:
          </span>

          <button
            onClick={() => handleRatingFilter(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedRating === undefined
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
            }`}
          >
            Tất cả ({totalReviews})
          </button>

          {[5, 4, 3, 2, 1].map((s) => {
            const count = distribution[String(s) as keyof RatingDistribution] || 0;
            const isSelected = selectedRating === s;
            return (
              <button
                key={s}
                onClick={() => handleRatingFilter(isSelected ? undefined : s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-sport-500 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <span>{s}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-7 h-7 border-2 border-sport-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400">Đang tải các đánh giá mới nhất...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-12 text-center rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 space-y-2">
              <MessageSquare className="w-8 h-8 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Chưa có đánh giá nào {selectedRating ? `ở mức ${selectedRating} sao` : ''}
              </p>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                Hãy là người đầu tiên trải nghiệm thi đấu và để lại đánh giá cho cơ sở thể thao này!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800/80">
              {reviews.map((r) => {
                const initials = r.user?.name
                  ? r.user.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : 'KH';

                return (
                  <div key={r.id} className="py-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-sport-600 to-emerald-400 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shrink-0">
                          {r.user?.avatar ? (
                            <img
                              src={r.user.avatar}
                              alt={r.user.name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                              {r.user?.name}
                            </span>
                            <Badge variant="sport" size="sm" className="text-[10px] py-0 px-1.5">
                              Đã trải nghiệm
                            </Badge>
                          </div>
                          <span className="text-[11px] text-neutral-400">
                            {formatDate(r.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Stars */}
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= r.rating
                                ? 'text-amber-400 fill-amber-400'
                                : 'text-neutral-200 dark:text-neutral-800'
                            }`}
                            strokeWidth={1.5}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Comment text */}
                    <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed pl-12">
                      {r.comment}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-xs text-neutral-400">
              Trang {currentPage} / {lastPage}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="gap-1 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                disabled={currentPage >= lastPage || isLoading}
                className="gap-1 text-xs"
              >
                Sau
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Review Modal Form */}
      <ReviewFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        venueId={venueId}
        venueName={venueName}
        onSuccess={handleReviewSuccess}
      />
    </Card>
  );
}
