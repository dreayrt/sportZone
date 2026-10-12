'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, type AuthUser } from '@/context/AuthContext';
import { api, type NotificationItem, type NotificationListData } from '@/lib/api';
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  RefreshCw,
} from 'lucide-react';

const PAGE_SIZE = 10;

const EMPTY_PAGINATION: NotificationListData['pagination'] = {
  current_page: 1,
  last_page: 1,
  per_page: PAGE_SIZE,
  total: 0,
};

function getNotificationLink(notification: NotificationItem, role: AuthUser['role']): string | null {
  if (notification.reference_type === 'booking') {
    if (role === 'customer') return '/dashboard/customer/bookings';
    if (role === 'owner') return '/dashboard/owner/bookings';
  }

  if (role === 'customer' && notification.type === 'loyalty_points') {
    return '/dashboard/customer/loyalty';
  }

  if (role === 'customer' && notification.type === 'referral_reward') {
    return '/dashboard/customer/referral';
  }

  return null;
}

function formatNotificationTime(value: string | null): string {
  if (!value) return 'Không rõ thời gian';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NotificationDropdown() {
  const router = useRouter();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotifications = useCallback(async (page = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    const response = await api.notifications.getAll({ page, per_page: PAGE_SIZE });

    if (response.success && response.data) {
      setNotifications((current) => {
        if (!append) return response.data.notifications;

        const merged = [...current, ...response.data.notifications];
        return merged.filter(
          (notification, index) => merged.findIndex((item) => item.id === notification.id) === index
        );
      });
      setUnreadCount(response.data.unread_count);
      setPagination(response.data.pagination);
    } else {
      setErrorMessage(response.message || 'Không thể tải danh sách thông báo.');
    }

    setIsLoading(false);
    setIsLoadingMore(false);
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setPagination(EMPTY_PAGINATION);
      return;
    }

    void loadNotifications();
  }, [loadNotifications, user]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((current) => {
      const next = !current;
      if (next && user) void loadNotifications();
      return next;
    });
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    const wasUnread = !notification.is_read;

    if (wasUnread) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, is_read: true, read_at: new Date().toISOString() }
            : item
        )
      );
      setUnreadCount((current) => Math.max(0, current - 1));
    }

    const response = await api.notifications.markAsRead(notification.id);

    if (!response.success || !response.data) {
      if (wasUnread) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: false, read_at: null } : item
          )
        );
        setUnreadCount((current) => current + 1);
      }
      setErrorMessage(response.message || 'Không thể đánh dấu thông báo đã đọc.');
      return;
    }

    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? response.data : item))
    );

    if (user) {
      const link = getNotificationLink(response.data, user.role);
      if (link) {
        setIsOpen(false);
        router.push(link);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    const optimisticReadAt = new Date().toISOString();

    setIsMarkingAll(true);
    setErrorMessage(null);
    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
        read_at: notification.read_at || optimisticReadAt,
      }))
    );
    setUnreadCount(0);

    const response = await api.notifications.markAllAsRead();

    if (!response.success) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setErrorMessage(response.message || 'Không thể đánh dấu tất cả thông báo đã đọc.');
    }

    setIsMarkingAll(false);
  };

  if (!user) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        title="Thông báo"
        aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={toggleDropdown}
        className="relative p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
      >
        <Bell className="w-4 h-4" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[9px] leading-4 font-bold text-white text-center ring-2 ring-white dark:ring-neutral-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Thông báo</h2>
              <p className="text-[11px] text-neutral-500">{unreadCount} thông báo chưa đọc</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAll}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-sport-600 transition-colors hover:bg-sport-50 disabled:cursor-not-allowed disabled:text-neutral-300 dark:text-sport-400 dark:hover:bg-sport-950/40 dark:disabled:text-neutral-700"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-3.5 h-3.5" />
              )}
              Đánh dấu tất cả đã đọc
            </button>
          </div>

          {errorMessage && (
            <div className="m-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 w-4 h-4 shrink-0" />
              <div className="flex-1">
                <p>{errorMessage}</p>
                <button
                  type="button"
                  onClick={() => void loadNotifications()}
                  className="mt-1.5 inline-flex items-center gap-1 font-semibold hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Thử lại
                </button>
              </div>
            </div>
          )}

          <div className="max-h-[26rem] overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-xs text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-sport-500" />
                Đang tải thông báo...
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                <div className="flex w-10 h-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-900">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Chưa có thông báo</p>
                <p className="text-xs text-neutral-400">Các cập nhật mới sẽ xuất hiện tại đây.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void handleNotificationClick(notification)}
                    className={`relative block w-full px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900/70 ${
                      notification.is_read
                        ? 'bg-white dark:bg-neutral-950'
                        : 'bg-sport-50/60 dark:bg-sport-950/20'
                    }`}
                  >
                    {!notification.is_read && (
                      <span className="absolute left-1.5 top-5 w-1.5 h-1.5 rounded-full bg-sport-500" />
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-xs text-neutral-900 dark:text-white ${notification.is_read ? 'font-medium' : 'font-bold'}`}>
                          {notification.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
                          {notification.message}
                        </p>
                        <p className="mt-1.5 text-[10px] text-neutral-400">
                          {formatNotificationTime(notification.created_at)}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="shrink-0 rounded-full bg-sport-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sport-700 dark:bg-sport-950 dark:text-sport-300">
                          Mới
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isLoading && pagination.current_page < pagination.last_page && (
            <div className="border-t border-neutral-100 p-2 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => void loadNotifications(pagination.current_page + 1, true)}
                disabled={isLoadingMore}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-300 dark:text-neutral-300 dark:hover:bg-neutral-900"
              >
                {isLoadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Xem thêm
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
