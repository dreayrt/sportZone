'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Star, X, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: number;
  venueName: string;
  onSuccess: () => void;
}

interface ReviewableBooking {
  id: number;
  booking_code: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  court?: {
    id: number;
    name: string;
    code: string;
  };
}

const RATING_LABELS: Record<number, string> = {
  1: 'Rất tệ',
  2: 'Chưa tốt',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Tuyệt vời',
};

export function ReviewFormModal({
  isOpen,
  onClose,
  venueId,
  venueName,
  onSuccess,
}: ReviewFormModalProps) {
  const { user } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);

  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [reviewableBookings, setReviewableBookings] = useState<ReviewableBooking[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lấy danh sách booking đã completed của user tại venue này
  useEffect(() => {
    if (!isOpen || !user) return;

    let isMounted = true;
    setIsLoadingBookings(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    api.reviews
      .getReviewableBookings(venueId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data?.reviewable_bookings) {
          const list = res.data.reviewable_bookings as ReviewableBooking[];
          setReviewableBookings(list);
          if (list.length > 0) {
            setSelectedBookingId(list[0].id);
          }
        } else {
          setReviewableBookings([]);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setErrorMessage(err?.message || 'Không thể tải thông tin đơn đặt sân.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingBookings(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, venueId, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedBookingId) {
      setErrorMessage('Vui lòng chọn đơn đặt sân bạn đã trải nghiệm.');
      return;
    }

    if (rating < 1 || rating > 5) {
      setErrorMessage('Số sao đánh giá phải từ 1 đến 5 sao.');
      return;
    }

    if (!comment.trim() || comment.trim().length < 10) {
      setErrorMessage('Nội dung nhận xét phải có tối thiểu 10 ký tự.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.reviews.createReview({
        booking_id: selectedBookingId,
        rating,
        comment: comment.trim(),
      });

      if (res.success) {
        setSuccessMessage('Đánh giá của bạn đã được ghi nhận thành công!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        setErrorMessage(res.message || 'Gửi đánh giá không thành công.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Đã có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeStarCount = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Đánh Giá Trải Nghiệm Thi Đấu
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5 truncate max-w-sm">
              Cơ sở: <strong className="text-neutral-700 dark:text-neutral-300">{venueName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isLoadingBookings ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-7 h-7 border-2 border-sport-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400">Đang kiểm tra lịch sử đặt sân của bạn...</p>
            </div>
          ) : reviewableBookings.length === 0 ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  Chưa Đủ Điều Kiện Đánh Giá
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                  Để đảm bảo tính khách quan, bạn cần hoàn thành ít nhất <strong>1 lượt đặt sân (Completed)</strong> tại cơ sở này và chưa từng đánh giá đơn đó trước đây.
                </p>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Đã hiểu
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Chọn đơn đặt sân */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Đơn đặt sân áp dụng
                </label>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {reviewableBookings.map((b) => {
                    const isSelected = selectedBookingId === b.id;
                    return (
                      <div
                        key={b.id}
                        onClick={() => setSelectedBookingId(b.id)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-sport-500 bg-sport-50/50 dark:bg-sport-950/30 text-sport-900 dark:text-sport-200 font-medium'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-sport-600" />
                          <span>
                            Mã: <strong className="font-mono">{b.booking_code}</strong> • {b.court?.name || 'Sân tiêu chuẩn'}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400">
                          {b.booking_date} ({b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chọn mức sao (Interactive Stars) */}
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                  Mức độ hài lòng của bạn
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = starVal <= activeStarCount;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onClick={() => setRating(starVal)}
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          title={`${starVal} sao - ${RATING_LABELS[starVal]}`}
                        >
                          <Star
                            className={`w-7 h-7 transition-colors ${
                              isFilled
                                ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                                : 'text-neutral-300 dark:text-neutral-700'
                            }`}
                            strokeWidth={1.5}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200/60 dark:border-amber-900/40">
                    {activeStarCount} ★ {RATING_LABELS[activeStarCount]}
                  </span>
                </div>
              </div>

              {/* Bình luận */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Nội dung nhận xét
                  </label>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {comment.length}/500 ký tự (tối thiểu 10)
                  </span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Chia sẻ cảm nhận của bạn về chất lượng mặt sân, hệ thống đèn chiếu sáng, thái độ nhân viên hỗ trợ..."
                  className="w-full text-xs p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sport-500/20 focus:border-sport-500 transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                >
                  Gửi Đánh Giá
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
