'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Addon, localDate } from '@/lib/venues-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatVND, formatDate } from '@/lib/utils';
import { api, apiRequest, SepayPaymentQr } from '@/lib/api';
import type { Booking } from '@/lib/mock-data';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  Tag,
  ArrowRight,
  ArrowLeft,
  QrCode,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  AlertCircle,
  User,
  Phone,
  Mail,
  FileText,
  RefreshCw
} from 'lucide-react';

interface BookingCourt {
  id: number;
  name: string;
  venue_id: number;
  venue_name: string;
  venue_slug: string;
  min_booking_minutes: number;
  slot_minutes: number;
  hourly_rate_standard: number;
  hourly_rate_peak: number;
  peak_start: string;
  peak_end: string;
}

interface BookingSlot {
  time: string;
  start_time: string;
  end_time: string;
  rate: number;
  peak: boolean;
  is_booked: boolean;
  state: 'available' | 'held' | 'booked' | 'past' | 'closed';
  is_own_hold?: boolean;
  hold_expires_at?: string | null;
}

type RecurrencePolicy = Record<'weekly' | 'monthly', { min_occurrences: number; max_occurrences: number; discount_percent: number }>;

const isSlotSelectable = (slot: BookingSlot) =>
  (!slot.is_booked || !!slot.is_own_hold) &&
  slot.state !== 'booked' &&
  slot.state !== 'past' &&
  slot.state !== 'closed' &&
  (slot.state !== 'held' || !!slot.is_own_hold);

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function toISODate(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}
function parseISODate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}
function addDaysISO(value: string, days: number): string {
  const date = parseISODate(value);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}
function addMonthsISO(value: string, months: number): string {
  const date = parseISODate(value);
  date.setMonth(date.getMonth() + months);
  return toISODate(date);
}
function mondayOfISO(value: string): string {
  const date = parseISODate(value);
  const dow = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dow);
  return toISODate(date);
}
function weekDatesISO(value: string): string[] {
  const monday = mondayOfISO(value);
  return Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
}
function monthDatesISO(value: string): string[] {
  const date = parseISODate(value);
  const count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return Array.from(
    { length: count },
    (_, i) => toISODate(new Date(date.getFullYear(), date.getMonth(), i + 1, 12)),
  );
}

export default function BookingWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const courtId = parseInt(params.courtId as string, 10);

  // Chưa đăng nhập -> đá về login, xong quay lại đúng sân này
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(`/booking/${courtId}`)}`);
    }
  }, [isAuthLoading, user, router, courtId]);

  const [selectedCourt, setSelectedCourt] = useState<BookingCourt | null>(null);
  const selectedVenue = { id: selectedCourt?.venue_id, name: selectedCourt?.venue_name, slug: selectedCourt?.venue_slug };
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonsError, setAddonsError] = useState('');
  const [isAddonsLoading, setIsAddonsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState('');
  const [isSlotsLoading, setIsSlotsLoading] = useState(true);
  const [refreshSlots, setRefreshSlots] = useState(0);
  const voucherRequestId = useRef(0);
  const holdRequestId = useRef(0);
  const holdRef = useRef<string | null>(null);
  const [hold, setHold] = useState<{ token: string; expires_at: string; dates: string[]; discount_percent: number } | null>(null);
  const [holding, setHolding] = useState(false);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState(0);
  const [frequency, setFrequency] = useState<'' | 'weekly' | 'monthly'>('');
  const [occurrences, setOccurrences] = useState(4);
  const [recurrencePolicy, setRecurrencePolicy] = useState<RecurrencePolicy | null>(null);
  const [seriesBookings, setSeriesBookings] = useState<Booking[]>([]);

  // State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [bookingDate, setBookingDate] = useState(localDate);
  const [selectedRange, setSelectedRange] = useState<{ start: string; end: string } | null>(null);
  const [addonsCount, setAddonsCount] = useState<Record<number, number>>({});
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucherCode, setAppliedVoucherCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');
  const [isVoucherValidating, setIsVoucherValidating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('');
  const [paymentQr, setPaymentQr] = useState<SepayPaymentQr | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'partial' | 'paid' | 'refunded'>('unpaid');
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentSecondsLeft, setPaymentSecondsLeft] = useState(0);
  const [isPaymentExpired, setIsPaymentExpired] = useState(false);
  const [isBookingClosed, setIsBookingClosed] = useState(false);
  const [serverBooking, setServerBooking] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Customer Contact Info
  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [note, setNote] = useState('');

  // Real-time API slots
  const [apiSlots, setApiSlots] = useState<BookingSlot[]>([]);
  const [slotView, setSlotView] = useState<'day' | 'week' | 'month'>('day');
  const [weekSlots, setWeekSlots] = useState<Record<string, BookingSlot[]>>({});
  const [monthSlots, setMonthSlots] = useState<Record<string, BookingSlot[]>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Fetch slots from Backend API
  useEffect(() => {
    if (createdBookingCode) return;
    let isMounted = true;
    setIsSlotsLoading(true);
    setApiSlots([]);
    setSelectedRange(null);
    setSlotsError('');
    let fetching = false;
    async function fetchSlots() {
      if (fetching) return;
      fetching = true;
      const res = await api.bookings.getCourtSlots(courtId, bookingDate);
      fetching = false;
      if (!isMounted) return;
      if (res.success && res.data) {
        setSelectedCourt(res.data.court);
        setRecurrencePolicy(res.data.recurrence_policy || null);
        setApiSlots(res.data.slots || []);
        setSelectedRange((current) => {
          if (!current) return null;
          const startIndex = res.data.slots.findIndex((slot: BookingSlot) => slot.time === current.start);
          const endIndex = res.data.slots.findIndex((slot: BookingSlot) => slot.time === current.end);
          if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return null;
          const span = res.data.slots.slice(startIndex, endIndex + 1);
          return span.every(isSlotSelectable) ? current : null;
        });
        setSlotsError('');
      } else {
        setApiSlots([]);
        setSelectedRange(null);
        setSlotsError(res.message || 'Không tải được lịch sân. Vui lòng thử lại.');
      }
      setIsSlotsLoading(false);
    }
    fetchSlots();
    const interval = window.setInterval(() => { if (!document.hidden) void fetchSlots(); }, 3000);
    const onFocus = () => void fetchSlots();
    window.addEventListener('focus', onFocus);
    return () => { isMounted = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, [courtId, bookingDate, refreshSlots, createdBookingCode]);

  // Tải lịch tuần/tháng khi xem theo tuần/tháng
  useEffect(() => {
    if (createdBookingCode || slotView === 'day') return;
    const dates = slotView === 'week' ? weekDatesISO(bookingDate) : monthDatesISO(bookingDate);
    let active = true;
    setCalendarLoading(true);
    Promise.all(dates.map(async (date) => {
      try {
        const res = await api.bookings.getCourtSlots(courtId, date);
        return { date, slots: res.success && res.data ? (res.data.slots || []) as BookingSlot[] : [] };
      } catch {
        return { date, slots: [] as BookingSlot[] };
      }
    })).then((results) => {
      if (!active) return;
      const record: Record<string, BookingSlot[]> = {};
      results.forEach(({ date, slots }) => { record[date] = slots; });
      if (slotView === 'week') setWeekSlots(record);
      else setMonthSlots(record);
      setCalendarLoading(false);
    });
    return () => { active = false; };
  }, [courtId, bookingDate, slotView, refreshSlots, createdBookingCode]);

  useEffect(() => {
    setHold(null);
    setHolding(false);
    return () => {
      holdRequestId.current += 1;
      if (holdRef.current) void api.bookings.releaseHold(holdRef.current);
      holdRef.current = null;
    };
  }, [courtId, bookingDate]);

  useEffect(() => {
    if (!hold || createdBookingCode) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((new Date(hold.expires_at).getTime() - Date.now()) / 1000));
      setHoldSecondsLeft(remaining);
      if (remaining === 0) {
        holdRef.current = null;
        setHold(null);
        setSelectedRange(null);
        setCurrentStep(1);
        setErrorMessage('Hết 5 phút giữ chỗ. Vui lòng chọn lại khung giờ.');
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [hold, createdBookingCode]);

  const clearHold = () => {
    holdRequestId.current += 1;
    if (holdRef.current) void api.bookings.releaseHold(holdRef.current);
    holdRef.current = null;
    setHold(null);
    setSelectedRange(null);
    setHolding(false);
  };

  const selectSlot = async (slot: BookingSlot) => {
    if (holding || !isSlotSelectable(slot)) return;
    setErrorMessage('');

    let next: { start: string; end: string } | null = null;
    if (!selectedRange) {
      next = { start: slot.time, end: slot.time };
    } else {
      const startIndex = activeSlots.findIndex((s) => s.time === selectedRange.start);
      const endIndex = activeSlots.findIndex((s) => s.time === selectedRange.end);
      const clickedIndex = activeSlots.findIndex((s) => s.time === slot.time);
      if (startIndex === -1 || endIndex === -1 || clickedIndex === -1) return;
      if (startIndex === endIndex && clickedIndex === startIndex) {
        clearHold();
        setRefreshSlots((value) => value + 1);
        return;
      }
      let nextStart = startIndex;
      let nextEnd = endIndex;
      if (clickedIndex < startIndex) nextStart = clickedIndex;
      else if (clickedIndex > endIndex) nextEnd = clickedIndex;
      else {
        nextStart = clickedIndex;
        nextEnd = clickedIndex;
      }
      const span = activeSlots.slice(nextStart, nextEnd + 1);
      const blocked = span.find((s) => !isSlotSelectable(s));
      if (blocked) {
        setErrorMessage(`Khung giờ ${blocked.time} không còn trống. Không thể chọn liên tục qua khung giờ đã có người đặt.`);
        return;
      }
      next = { start: activeSlots[nextStart].time, end: activeSlots[nextEnd].time };
    }

    const id = ++holdRequestId.current;
    setHolding(true);
    setSelectedRange(next);
    const startSlot = activeSlots.find((s) => s.time === next!.start);
    const endSlot = activeSlots.find((s) => s.time === next!.end);
    const response = await api.bookings.hold({ court_id: courtId, booking_date: bookingDate,
      start_time: startSlot!.start_time.slice(0, 5), end_time: endSlot!.end_time.slice(0, 5),
      ...(frequency ? { frequency, occurrences } : {}),
    });
    if (id !== holdRequestId.current) {
      if (response.success && response.data) void api.bookings.releaseHold(response.data.token);
      return;
    }
    setHolding(false);
    if (response.success && response.data) {
      holdRef.current = response.data.token;
      setHold(response.data);
    } else {
      clearHold();
      setErrorMessage(Object.values(response.errors || {}).flat().join(' ') || response.message || 'Không thể giữ khung giờ này.');
    }
  };

  useEffect(() => {
    if (!selectedCourt?.venue_id) return;
    let active = true;
    setIsAddonsLoading(true);
    setAddons([]);
    setAddonsCount({});
    setAddonsError('');
    apiRequest<Addon[]>(`/venue-services/${selectedCourt.venue_id}`).then((response) => {
      if (!active) return;
      if (response.success) setAddons(response.data || []);
      else setAddonsError(response.message || 'Không tải được dịch vụ. Bạn vẫn có thể đặt sân không kèm dịch vụ.');
      setIsAddonsLoading(false);
    });
    return () => { active = false; };
  }, [selectedCourt?.venue_id]);

  useEffect(() => {
    if (user) {
      setCustomerName((current) => current || user.full_name);
      setCustomerPhone((current) => current || user.phone || '');
      if (user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  const activeSlots = apiSlots;

  // Calendar views
  const weekDays = weekDatesISO(bookingDate);
  const monthDays = monthDatesISO(bookingDate);
  const monthLeadingBlanks = (parseISODate(monthDays[0]).getDay() + 6) % 7;

  // Fee calculation
  const rangeStartIndex = selectedRange ? activeSlots.findIndex((s) => s.time === selectedRange.start) : -1;
  const rangeEndIndex = selectedRange ? activeSlots.findIndex((s) => s.time === selectedRange.end) : -1;
  const hasValidRange = selectedRange !== null && rangeStartIndex !== -1 && rangeEndIndex !== -1 && rangeEndIndex >= rangeStartIndex;
  const rangeSlotList = hasValidRange ? activeSlots.slice(rangeStartIndex, rangeEndIndex + 1) : [];
  const courtFee = rangeSlotList.reduce((sum, slot) => sum + (slot.rate ?? 0), 0);
  const rangeKey = hasValidRange ? `${selectedRange!.start}|${selectedRange!.end}` : '';

  const addonsFee = Object.entries(addonsCount).reduce((sum, [idStr, count]) => {
    const addon = addons.find((a) => a.id === parseInt(idStr, 10));
    return sum + (addon ? addon.price * count : 0);
  }, 0);

  const bookingCount = frequency ? occurrences : 1;
  const recurringPercent = frequency ? recurrencePolicy?.[frequency].discount_percent ?? 0 : 0;
  const recurringDiscount = Math.round(courtFee * recurringPercent / 100) * bookingCount;
  const subtotal = (courtFee + addonsFee) * bookingCount;
  const totalPrice = serverBooking?.total_price ?? Math.max(0, subtotal - appliedDiscount - recurringDiscount);
  const displayedDiscount = serverBooking?.discount_amount ?? appliedDiscount;

  useEffect(() => {
    voucherRequestId.current += 1;
    setAppliedVoucherCode('');
    setAppliedDiscount(0);
    setVoucherMessage('');
  }, [subtotal, bookingDate, rangeKey, courtId, frequency]);

  const handleApplyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (!code) {
      setAppliedVoucherCode('');
      setAppliedDiscount(0);
      setVoucherMessage('Không dùng voucher. Đơn được tính theo giá gốc.');
      return;
    }

    setIsVoucherValidating(true);
    const requestId = ++voucherRequestId.current;
    setVoucherMessage('');
    const targetVenueId = selectedVenue?.id ? Number(selectedVenue.id) : undefined;
    const targetCourtId = Number(courtId) || undefined;
    const response = await api.vouchers.validate(code, subtotal, targetVenueId, targetCourtId);
    if (requestId !== voucherRequestId.current) { setIsVoucherValidating(false); return; }
    if (response.success && response.data?.valid) {
      setAppliedVoucherCode(response.data.voucher.code);
      setVoucherCode(response.data.voucher.code);
      setAppliedDiscount(response.data.discount_amount);
      setVoucherMessage(response.data.message || `Đã giảm ${formatVND(response.data.discount_amount)}.`);
    } else {
      setAppliedVoucherCode('');
      setAppliedDiscount(0);
      setVoucherMessage(response.message || 'Mã voucher không hợp lệ.');
    }
    setIsVoucherValidating(false);
  };

  const handleStartPayment = async () => {
    if (!createdBookingCode && (!hasValidRange || !rangeSlotList.length || !hold || holding || new Date(hold.expires_at).getTime() <= Date.now() || !customerName.trim() || !customerPhone.trim())) {
      setErrorMessage('Vui lòng chọn khung giờ còn trống, nhập họ tên và số điện thoại liên hệ.');
      setCurrentStep(1);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let bookingCode = createdBookingCode;
      if (!bookingCode) {
        const startTime = rangeSlotList[0].start_time.slice(0, 5);
        const endTime = rangeSlotList[rangeSlotList.length - 1].end_time.slice(0, 5);
        const addonsPayload = Object.entries(addonsCount)
          .filter(([, quantity]) => quantity > 0)
          .map(([id, quantity]) => ({ addon_id: Number(id), quantity }));

        const payload = {
          court_id: selectedCourt!.id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim() || undefined,
          note: note.trim() || undefined,
          addons: addonsPayload,
          voucher_code: appliedVoucherCode || undefined,
          hold_token: hold!.token,
          ...(frequency ? { frequency, occurrences } : {}),
        };
        const result = frequency ? await api.bookings.createRecurring(payload) : await api.bookings.create(payload);
        if (frequency && result.success && result.data?.bookings) setSeriesBookings(result.data.bookings);
        const bookingResponse = frequency && result.success ? { ...result, data: result.data.bookings[0] } : result;

        if (!bookingResponse.success || !bookingResponse.data?.booking_code) {
          const details = Object.values(bookingResponse.errors || {}).flat().filter((value): value is string => typeof value === 'string');
          setErrorMessage(details.join(' ') || bookingResponse.message || 'Không thể tạo đơn đặt sân.');
          if (bookingResponse.errors?.slot || bookingResponse.errors?.hold_token) {
            clearHold();
            setCurrentStep(1);
            setRefreshSlots((value) => value + 1);
          }
          return;
        }

        bookingCode = bookingResponse.data.booking_code;
        holdRef.current = null;
        setHold(null);
        setCreatedBookingCode(bookingCode);
        setServerBooking(bookingResponse.data);
        setPaymentStatus(bookingResponse.data.payment_status || 'unpaid');
        if (bookingResponse.data.payment_status === 'paid') {
          setIsSuccess(true);
          return;
        }
      }

      const qrResponse = await api.payments.generateQr(bookingCode);
      if (!qrResponse.success || !qrResponse.data?.payment?.qr_image_url) {
        setCurrentStep(4);
        setErrorMessage(qrResponse.message || 'Đơn đã tạo nhưng chưa lấy được QR SePay. Hãy thử tạo QR lại.');
        return;
      }

      setPaymentQr(qrResponse.data.payment);
      setIsPaymentExpired(new Date(qrResponse.data.payment.expires_at).getTime() <= Date.now());
      setPaymentStatus(qrResponse.data.booking.payment_status as typeof paymentStatus);
      setCurrentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shiftByView = (dir: -1 | 1) => {
    setErrorMessage('');
    if (slotView === 'day') setBookingDate(addDaysISO(bookingDate, dir));
    else if (slotView === 'week') setBookingDate(addDaysISO(bookingDate, dir * 7));
    else setBookingDate(addMonthsISO(bookingDate, dir));
  };
  const openDay = (date: string) => {
    setBookingDate(date);
    setSlotView('day');
    setErrorMessage('');
  };
  const weekLabel = (() => {
    const dates = weekDatesISO(bookingDate);
    return `${dates[0].slice(8, 10)}/${dates[0].slice(5, 7)} – ${dates[6].slice(8, 10)}/${dates[6].slice(5, 7)}`;
  })();
  const monthLabel = (() => {
    const [year, month] = bookingDate.split('-');
    return `Tháng ${Number(month)}/${year}`;
  })();

  useEffect(() => {
    if (currentStep !== 4 || !createdBookingCode || isSuccess) return;
    let active = true;
    let checking = false;
    const checkStatus = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await api.payments.getStatus(createdBookingCode);
        if (!active || !response.success || !response.data) return;

        setPaymentStatus(response.data.payment_status);
        setTotalPaid(response.data.total_paid || 0);
        setIsPaymentExpired(response.data.is_expired);
        const isClosed = ['cancelled', 'completed', 'no_show'].includes(response.data.status);
        setIsBookingClosed(isClosed);
        setServerBooking((current: any) => current ? { ...current, total_price: response.data.total_price } : current);
        const remainingAmount = Math.max(0, response.data.total_price - response.data.total_paid);
        if (!response.data.is_paid && !response.data.is_expired && !isClosed && paymentQr && paymentQr.amount !== remainingAmount) {
          const qrResponse = await api.payments.generateQr(createdBookingCode);
          if (!active) return;
          if (qrResponse.success && qrResponse.data?.payment) setPaymentQr(qrResponse.data.payment);
        }
        setSeriesBookings((bookings) => bookings.map((booking) => booking.booking_code === createdBookingCode ? { ...booking, payment_status: response.data.payment_status, status: response.data.status } : booking));
        if (response.data.is_paid) setIsSuccess(true);
        if (response.data.status === 'cancelled') setErrorMessage('Đơn đã hết thời gian giữ chỗ. Vui lòng tạo đơn mới.');
      } finally { checking = false; }
    };

    checkStatus();
    const intervalId = window.setInterval(checkStatus, 5000);
    return () => { active = false; window.clearInterval(intervalId); };
  }, [currentStep, createdBookingCode, isSuccess, paymentQr]);

  useEffect(() => {
    if (!paymentQr?.expires_at) return;
    const updateCountdown = () => {
      setPaymentSecondsLeft(Math.max(0, Math.floor((new Date(paymentQr.expires_at).getTime() - Date.now()) / 1000)));
      if (new Date(paymentQr.expires_at).getTime() <= Date.now()) setIsPaymentExpired(true);
    };
    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [paymentQr]);

  const payOccurrence = async (booking: Booking) => {
    setIsSubmitting(true);
    setErrorMessage('');
    setPaymentQr(null);
    setServerBooking(booking);
    setCreatedBookingCode(booking.booking_code);
    setIsSuccess(booking.payment_status === 'paid');
    setPaymentStatus(booking.payment_status);
    setTotalPaid(0);
    setIsPaymentExpired(false);
    setIsBookingClosed(booking.status === 'cancelled');
    setCurrentStep(4);
    try {
      if (booking.payment_status !== 'paid' && booking.status !== 'cancelled') {
        const response = await api.payments.generateQr(booking.booking_code);
        if (response.success && response.data?.payment) setPaymentQr(response.data.payment);
        else setErrorMessage(response.message || 'Chưa lấy được QR thanh toán.');
      }
    } finally { setIsSubmitting(false); }
  };

  // Đang kiểm tra auth hoặc sắp redirect -> hiện skeleton, tránh nháy nội dung
  if (isAuthLoading || !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6" role="status" aria-label="Đang kiểm tra đăng nhập">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-8 w-64 max-w-[60%]" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-1.5 rounded-full" />)}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] items-start gap-6">
          <Skeleton className="h-96 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <span className="sr-only">Đang kiểm tra đăng nhập...</span>
      </div>
    );
  }

  if (!selectedCourt) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {slotsError ? (
          <div className="py-16 text-center text-sm text-neutral-500">
            {slotsError}
            <Button className="ml-3" size="sm" onClick={() => setRefreshSlots((value) => value + 1)}>Thử lại</Button>
          </div>
        ) : (
          <div role="status" aria-label="Đang tải thông tin sân" className="space-y-6 animate-fade-in">
            <div className="space-y-4">
              <Skeleton className="h-4 w-40" />
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-8 w-64 max-w-[60%]" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-1.5 rounded-full" />)}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] items-start gap-6">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/90 p-5 space-y-4">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                  {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="min-h-24 rounded-xl" />)}
                </div>
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <span className="sr-only">Đang tải thông tin sân...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-fade-in">
      {/* Step Indicator */}
      <div className="space-y-4">
        <Link href={`/venues/${selectedVenue.slug}`} className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại cơ sở {selectedVenue.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              Đặt Sân: {selectedCourt.name}
            </h1>
            <p className="text-xs text-neutral-500">{selectedVenue.name}</p>
          </div>
          <Badge variant="sport">Bước {currentStep} / 4</Badge>
        </div>

        {/* Progress Bar */}
        <div className="grid grid-cols-4 gap-2">
          {['1. Khung Giờ & Thông Tin', '2. Dịch Vụ', '3. Voucher', '4. SePay'].map((label, idx) => (
            <div key={label} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  idx + 1 <= currentStep ? 'bg-sport-500' : 'bg-neutral-200 dark:bg-neutral-800'
                }`}
              />
              <span className={`text-[11px] font-medium block truncate ${
                idx + 1 === currentStep ? 'text-neutral-900 dark:text-white font-bold' : 'text-neutral-400'
              }`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {hold && !createdBookingCode && <p role="status" className={`rounded-xl border p-3 text-sm animate-fade-in ${holdSecondsLeft > 0 && holdSecondsLeft < 60 ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 animate-pulse' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        {holding ? 'Đang kiểm tra lịch...' : `Đã giữ ${rangeSlotList.length || hold.dates.length} khung giờ${hold.dates.length > 1 ? ` × ${hold.dates.length} ngày` : ''} cho bạn · còn ${Math.floor(holdSecondsLeft / 60)}:${String(holdSecondsLeft % 60).padStart(2, '0')}.`}
        <button type="button" className="ml-3 underline" disabled={holding} onClick={() => { clearHold(); setCurrentStep(1); setRefreshSlots((value) => value + 1); }}>Hủy giữ chỗ</button>
      </p>}

      {seriesBookings.length > 0 && <Card><CardHeader><CardTitle>Lịch đặt định kỳ của bạn</CardTitle></CardHeader><CardContent className="space-y-3">
        <p className="text-xs text-neutral-500">Tổng cả gói: {formatVND(seriesBookings.reduce((sum, booking) => sum + booking.total_price, 0))}. Thanh toán riêng từng lượt trong 30 phút; lượt chưa thanh toán sẽ được tự giải phóng.</p>
        <div className="divide-y divide-neutral-100">{seriesBookings.map((booking) => <div key={booking.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
          <span>{formatDate(booking.booking_date.slice(0, 10))} · {booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)} · {booking.booking_code}</span>
          <span>{formatVND(booking.total_price)} · {booking.status === 'cancelled' ? 'Đã hủy' : booking.payment_status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}</span>
          <Button size="sm" variant="outline" disabled={isSubmitting || booking.status === 'cancelled'} onClick={() => void payOccurrence(booking)}>{booking.payment_status === 'paid' ? 'Xem lượt' : 'Thanh toán lượt này'}</Button>
        </div>)}</div>
      </CardContent></Card>}

      {isSuccess ? (
        <Card className="p-8 text-center space-y-5 border-sport-200 bg-sport-50/20 animate-fade-in-up">
          <div className="w-14 h-14 rounded-full bg-sport-500 text-white flex items-center justify-center mx-auto shadow-sm animate-scale-in">
            <Check className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <Badge variant="success" size="md">Thanh toán qua SePay hoàn tất</Badge>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Mã Đặt Sân: {createdBookingCode}
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Hệ thống đã xác nhận giao dịch SePay và cập nhật đơn đặt sân của bạn.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl max-w-sm mx-auto border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5 text-left">
            <p><strong>Người đặt:</strong> {customerName} ({customerPhone})</p>
            <p><strong>Sân:</strong> {selectedCourt.name}</p>
            <p><strong>Giờ chơi:</strong> {serverBooking ? `${serverBooking.start_time.slice(0, 5)} – ${serverBooking.end_time.slice(0, 5)}` : hasValidRange ? `${rangeSlotList[0].start_time.slice(0, 5)} – ${rangeSlotList[rangeSlotList.length - 1].end_time.slice(0, 5)}` : '—'} ngày {formatDate(serverBooking?.booking_date.slice(0, 10) || bookingDate)}</p>
            <p><strong>Tổng thanh toán:</strong> <span className="font-mono font-bold text-sport-600">{formatVND(serverBooking?.total_price ?? totalPrice)}</span></p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/dashboard/customer/bookings" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="gap-2 w-full">
                <QrCode className="w-4 h-4" />
                Xem Vé Check-in Của Tôi
              </Button>
            </Link>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" size="md" className="w-full">Về Trang Chủ</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] items-start gap-6">
          {/* Main Wizard Step Box */}
          <div key={currentStep} className="min-w-0 space-y-6 animate-fade-in-up">
            {/* STEP 1: TIME & DATE + CONTACT */}
            {currentStep === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                    Chọn Ngày & Khung Giờ Thi Đấu
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border border-neutral-200 p-4 space-y-3">
                    <label className="block text-xs font-semibold" htmlFor="booking-frequency">Lịch đặt sân</label>
                    <select id="booking-frequency" value={frequency} disabled={holding} onChange={(event) => {
                      clearHold();
                      const next = event.target.value as typeof frequency;
                      setFrequency(next);
                      setOccurrences(next ? recurrencePolicy?.[next].min_occurrences ?? 4 : 4);
                    }} className="w-full rounded-lg border border-neutral-200 bg-white dark:bg-neutral-900 p-2 text-sm">
                      <option value="">Đặt một lần</option>
                      <option value="weekly">Cùng giờ mỗi tuần · giảm {recurrencePolicy?.weekly.discount_percent ?? 0}% tiền sân</option>
                      <option value="monthly">Cùng ngày mỗi tháng · giảm {recurrencePolicy?.monthly.discount_percent ?? 0}% tiền sân</option>
                    </select>
                    {frequency && <>
                      <label className="block text-xs" htmlFor="booking-occurrences">Số lượt (gồm ngày đầu tiên)</label>
                      <select id="booking-occurrences" value={occurrences} disabled={holding} onChange={(event) => { clearHold(); setOccurrences(Number(event.target.value)); }} className="w-full rounded-lg border border-neutral-200 bg-white dark:bg-neutral-900 p-2 text-sm">
                        {Array.from({ length: (recurrencePolicy?.[frequency].max_occurrences ?? 12) - (recurrencePolicy?.[frequency].min_occurrences ?? 4) + 1 }, (_, index) => (recurrencePolicy?.[frequency].min_occurrences ?? 4) + index).map((count) => <option key={count} value={count}>{count} lượt</option>)}
                      </select>
                      <p className="text-xs text-neutral-500">Dịch vụ áp dụng cho từng lượt. Ưu đãi định kỳ không cộng dồn voucher. Tháng không có ngày tương ứng sẽ đặt vào ngày cuối tháng.</p>
                    </>}
                    {hold && frequency && <p className="text-xs text-emerald-700">Các ngày: {hold.dates.map((date) => formatDate(date)).join(' · ')}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" aria-label={slotView === 'day' ? 'Ngày trước' : slotView === 'week' ? 'Tuần trước' : 'Tháng trước'} disabled={slotView === 'day' && bookingDate <= localDate()} onClick={() => shiftByView(-1)}><ArrowLeft className="w-4 h-4" /></Button>
                    {slotView === 'day' ? (
                      <>
                        <label htmlFor="booking-date" className="text-xs text-neutral-500">Ngày đặt sân</label>
                        <input
                          id="booking-date"
                          type="date"
                          min={localDate()}
                          value={bookingDate}
                          onChange={(e) => { if (e.target.value) { setBookingDate(e.target.value); setErrorMessage(''); } }}
                          className="min-w-0 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 tabular-nums"
                        />
                      </>
                    ) : (
                      <span className="px-3 py-2 text-sm font-semibold text-neutral-900 dark:text-white tabular-nums">{slotView === 'week' ? weekLabel : monthLabel}</span>
                    )}
                    <Button type="button" variant="outline" size="sm" aria-label={slotView === 'day' ? 'Ngày sau' : slotView === 'week' ? 'Tuần sau' : 'Tháng sau'} onClick={() => shiftByView(1)}><ArrowRight className="w-4 h-4" /></Button>
                    {slotView === 'day' && <Button type="button" variant="outline" size="sm" onClick={() => setBookingDate(localDate())}>Hôm nay</Button>}
                    <div role="group" aria-label="Chế độ xem lịch" className="flex items-center overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-700">
                      {(['day', 'week', 'month'] as const).map((view) => (
                        <button key={view} type="button" onClick={() => { setSlotView(view); setErrorMessage(''); }} className={`px-3 py-2 text-xs font-medium transition-colors ${slotView === view ? 'bg-sport-500 text-white' : 'bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}>
                          {view === 'day' ? 'Ngày' : view === 'week' ? 'Tuần' : 'Tháng'}
                        </button>
                      ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" aria-label="Làm mới lịch sân" className="ml-auto" disabled={isSlotsLoading || calendarLoading} onClick={() => setRefreshSlots((value) => value + 1)}><RefreshCw className={`w-4 h-4 ${isSlotsLoading || calendarLoading ? 'animate-spin' : ''}`} /></Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 px-3 py-3 text-[11px]">
                      <span className="text-neutral-500">{slotView === 'day' ? <>Mỗi lượt {selectedCourt.min_booking_minutes} phút · {activeSlots.filter((slot) => !slot.is_booked).length} khung giờ còn trống{hasValidRange && <> · <span className="font-semibold text-sport-600">Đã chọn {rangeSlotList.length} khung giờ liên tục</span></>}</> : slotView === 'week' ? 'Bấm khung giờ để mở ngày đó' : 'Bấm ngày để xem chi tiết'}</span>
                      <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Còn trống</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400" />Đã đặt</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" />Đang giữ</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />Không khả dụng</span>
                      </div>
                    </div>

                    {slotView === 'day' ? (
                      <>
                        {slotsError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{slotsError}</p>}
                        {isSlotsLoading ? (
                          <div role="status" aria-label="Đang tải lịch sân" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-2">
                            {Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="min-h-24 rounded-xl" />)}
                            <span className="sr-only">Đang tải lịch sân...</span>
                          </div>
                        ) : activeSlots.length === 0 && !slotsError ? <p className="py-10 text-center text-sm text-neutral-500">Không có khung giờ trong ngày này. Vui lòng chọn ngày khác.</p> : <div role="group" aria-label="Chọn khung giờ thi đấu" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-2">
                          {activeSlots.map((s, index) => {
                            const isBooked = !!s.is_booked;
                            const isSelected = hasValidRange && index >= rangeStartIndex && index <= rangeEndIndex;

                            return (
                              <button
                                key={s.time}
                                type="button"
                                disabled={holding || !isSlotSelectable(s)}
                                aria-pressed={isSelected}
                                aria-label={`${s.time}, ${isSelected ? 'đã chọn' : s.state === 'held' && !s.is_own_hold ? 'đang được giữ' : s.state === 'booked' ? 'đã đặt' : isBooked ? 'không khả dụng' : `${formatVND(s.rate)}${s.peak ? ', cao điểm' : ''}`}`}
                                onClick={() => void selectSlot(s)}
                                style={{ animationDelay: `${Math.min(index, 14) * 25}ms` }}
                                className={`min-w-0 min-h-24 p-3 rounded-xl border text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sport-500 focus-visible:ring-offset-2 animate-fade-in-up ${
                                  isSelected ? 'border-sport-600 bg-sport-500 text-white shadow-md'
                                    : s.state === 'held' ? 'border-amber-200 bg-amber-50 text-amber-800 cursor-not-allowed'
                                    : s.state === 'booked' ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 cursor-not-allowed'
                                    : isBooked ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed'
                                    : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200 active:scale-[0.97]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs tabular-nums whitespace-nowrap">{s.time.replace(' - ', ' – ')}</span>
                                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                                </div>
                                <p className="mt-2 flex items-center gap-1 text-[11px]"><Clock className="h-3 w-3 shrink-0" />{isSelected && hold ? 'Đang giữ cho bạn' : s.state === 'held' ? 'Đang được giữ' : s.state === 'booked' ? 'Đã đặt' : s.state === 'past' ? 'Đã qua giờ' : isBooked ? 'Không khả dụng' : isSelected ? 'Đang kiểm tra...' : 'Còn trống'}</p>
                                {(!isBooked || isSelected) && <p className={`mt-1 text-[11px] font-semibold tabular-nums ${isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatVND(s.rate)}{s.peak && <span className="ml-1 font-normal">· Cao điểm</span>}</p>}
                              </button>
                            );
                          })}
                        </div>}
                      </>
                    ) : slotView === 'week' ? (
                      calendarLoading && Object.keys(weekSlots).length === 0 ? (
                        <div role="status" aria-label="Đang tải lịch tuần" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
                          {Array.from({ length: 7 }, (_, i) => (
                            <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden space-y-1.5 p-1.5">
                              <Skeleton className="h-9 w-full rounded-lg" />
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-full" />
                              <Skeleton className="h-5 w-2/3" />
                            </div>
                          ))}
                          <span className="sr-only">Đang tải lịch tuần...</span>
                        </div>
                      ) : (
                        <div role="group" aria-label="Lịch tuần" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
                          {weekDays.map((d, dayIndex) => {
                            const slots = weekSlots[d] || [];
                            const freeCount = slots.filter((slot) => !slot.is_booked).length;
                            return (
                              <div key={d} className="min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                                <button type="button" onClick={() => openDay(d)} className={`w-full px-2 py-2 text-center text-xs font-semibold border-b border-neutral-100 dark:border-neutral-800 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 ${d === bookingDate ? 'text-sport-600' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                  {DAY_LABELS[dayIndex]}
                                  <span className="block text-[10px] font-normal tabular-nums text-neutral-400">{d.slice(8, 10)}/{d.slice(5, 7)}</span>
                                </button>
                                <div className="max-h-52 space-y-1 overflow-y-auto p-1.5">
                                  {slots.length === 0 ? (
                                    <div className="space-y-1 py-1" aria-hidden="true">
                                      <Skeleton className="h-5 w-full rounded-md" />
                                      <Skeleton className="h-5 w-full rounded-md" />
                                      <Skeleton className="h-5 w-3/4 rounded-md" />
                                    </div>
                                  ) : slots.map((slot) => {
                                    const free = !slot.is_booked;
                                    return (
                                      <button key={slot.time} type="button" title={`${d} · ${slot.time}`} disabled={!free} onClick={() => openDay(d)} className={`w-full truncate rounded-md px-1.5 py-1 text-left text-[10px] tabular-nums ${free ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'}`}>
                                        {slot.start_time.slice(0, 5)}
                                      </button>
                                    );
                                  })}
                                </div>
                                <p className="border-t border-neutral-100 px-2 py-1.5 text-[10px] text-neutral-400 dark:border-neutral-800">{freeCount} trống</p>
                              </div>
                            );
                          })}
                        </div>
                      )
                    ) : (
                      calendarLoading && Object.keys(monthSlots).length === 0 ? (
                        <div role="status" aria-label="Đang tải lịch tháng" className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-2">
                          {Array.from({ length: 28 }, (_, i) => <Skeleton key={i} className="min-h-14 rounded-lg" />)}
                          <span className="sr-only">Đang tải lịch tháng...</span>
                        </div>
                      ) : (
                        <div role="group" aria-label="Lịch tháng" className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-2">
                          {Array.from({ length: monthLeadingBlanks }, (_, i) => <div key={`blank-${i}`} aria-hidden="true" />)}
                          {monthDays.map((d) => {
                            const slots = monthSlots[d] || [];
                            const freeCount = slots.filter((slot) => !slot.is_booked).length;
                            const dowIndex = (parseISODate(d).getDay() + 6) % 7;
                            return (
                              <button key={d} type="button" onClick={() => openDay(d)} className={`min-h-14 rounded-lg border p-1.5 text-left transition-colors ${d === bookingDate ? 'border-sport-500 bg-sport-50 dark:bg-sport-950/30' : 'border-neutral-200 bg-white hover:border-sport-300 dark:border-neutral-800 dark:bg-neutral-900'} ${slots.length > 0 && freeCount === 0 ? 'opacity-55' : ''}`}>
                                <span className={`block text-[10px] font-medium ${d === localDate() ? 'font-bold text-sport-600' : 'text-neutral-400'}`}>{DAY_LABELS[dowIndex]} {d.slice(8, 10)}</span>
                                <span className="mt-1 block text-[10px] text-neutral-500 dark:text-neutral-400">{slots.length ? `${freeCount}/${slots.length} trống` : '…'}</span>
                              </button>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>

                  {/* Customer Information Fields */}
                  <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                      Thông Tin Người Đặt Sân
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                          Họ và tên *
                        </label>
                        <div className="relative">
                          <User className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            required
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Nguyễn Văn A"
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                          Số điện thoại liên hệ *
                        </label>
                        <div className="relative">
                          <Phone className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="0912345678"
                            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-neutral-500 block mb-1">
                        Ghi chú cho ban quản lý sân (tùy chọn)
                      </label>
                      <input
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="VD: Đội mặc áo xanh, cần hỗ trợ còi trọng tài..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                    <Button variant="primary" size="sm" className="w-full sm:w-auto" disabled={isSlotsLoading || holding || !hold || !hasValidRange || !customerName.trim() || !customerPhone.trim()} onClick={() => { setErrorMessage(''); setCurrentStep(2); }}>
                      Tiếp tục: Dịch vụ đi kèm
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 2: ADDONS */}
            {currentStep === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle>Dịch Vụ Đi Kèm (Nước Uống & Thuê Vợt)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {isAddonsLoading && (
                      <div role="status" aria-label="Đang tải dịch vụ" className="space-y-3 py-2">
                        {Array.from({ length: 3 }, (_, i) => (
                          <div key={i} className="py-3 flex items-center justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-40" />
                              <Skeleton className="h-3 w-24" />
                            </div>
                            <Skeleton className="h-8 w-28" />
                          </div>
                        ))}
                        <span className="sr-only">Đang tải dịch vụ...</span>
                      </div>
                    )}
                    {addonsError && <p role="alert" className="py-4 text-sm text-amber-700">{addonsError}</p>}
                    {!isAddonsLoading && !addonsError && addons.length === 0 && <p className="py-6 text-sm text-neutral-500">Cơ sở chưa có dịch vụ đi kèm. Bạn có thể tiếp tục đặt sân.</p>}
                    {addons.map((addon) => {
                      const count = addonsCount[addon.id] || 0;
                      return (
                        <div key={addon.id} className="py-3 flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">
                              {addon.name}
                            </h4>
                            <span className="font-mono text-xs text-sport-600 font-bold">
                              {formatVND(addon.price)} / {addon.unit}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Giảm số lượng ${addon.name}`}
                              disabled={count === 0}
                              onClick={() => setAddonsCount({ ...addonsCount, [addon.id]: Math.max(0, count - 1) })}
                              className="w-7 h-7 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-sm">{count}</span>
                            <button
                              type="button"
                              aria-label={`Tăng số lượng ${addon.name}`}
                              disabled={addon.stock_quantity != null && count >= addon.stock_quantity}
                              onClick={() => setAddonsCount({ ...addonsCount, [addon.id]: count + 1 })}
                              className="w-7 h-7 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setCurrentStep(1)}>
                      Quay lại
                    </Button>
                    <Button variant="primary" size="sm" className="w-full sm:w-auto" disabled={isAddonsLoading} onClick={() => { setErrorMessage(''); setCurrentStep(3); }}>
                      Tiếp tục: Mã giảm giá
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 3: VOUCHER */}
            {currentStep === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                    Mã giảm giá (không bắt buộc)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-neutral-500">{frequency ? `Gói định kỳ tự giảm ${recurringPercent}% tiền sân cho mỗi lượt, không cộng dồn voucher.` : 'Bạn có thể nhập voucher hoặc tiếp tục thanh toán.'}</p>
                  {!frequency && <form onSubmit={handleApplyVoucher} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã voucher"
                      aria-label="Mã voucher (không bắt buộc)"
                      disabled={isVoucherValidating}
                      value={voucherCode}
                      onChange={(e) => {
                        voucherRequestId.current += 1;
                        setVoucherCode(e.target.value);
                        setAppliedVoucherCode('');
                        setAppliedDiscount(0);
                        setVoucherMessage('');
                      }}
                      className="min-w-0 flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono uppercase bg-white dark:bg-neutral-900"
                    />
                    <Button type="submit" variant="secondary" size="sm" className="shrink-0 w-full sm:w-auto" isLoading={isVoucherValidating} disabled={!voucherCode.trim()}>
                      {isVoucherValidating ? 'Đang kiểm tra...' : 'Áp Dụng'}
                    </Button>
                  </form>}

                  {voucherMessage && <p role="status" className={`text-xs ${appliedVoucherCode ? 'text-emerald-700' : 'text-neutral-500'}`}>{voucherMessage}</p>}

                  {appliedVoucherCode && appliedDiscount > 0 && (
                    <div className="p-3 rounded-lg bg-sport-50 dark:bg-sport-950/40 border border-sport-200 dark:border-sport-800 text-xs text-sport-800 dark:text-sport-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-sport-500" />
                        Đã áp dụng mã {appliedVoucherCode}: Giảm {formatVND(appliedDiscount)}
                      </span>
                      <button type="button" onClick={() => { voucherRequestId.current += 1; setVoucherCode(''); setAppliedVoucherCode(''); setAppliedDiscount(0); setVoucherMessage('Đã gỡ voucher. Đơn được tính theo giá gốc.'); }} className="text-neutral-500 hover:text-red-500">
                        Gỡ mã
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setCurrentStep(2)}>
                      Quay lại
                    </Button>
                    <Button type="button" variant="primary" size="sm" className="w-full sm:w-auto" isLoading={isSubmitting} disabled={isVoucherValidating || !hold || holding} onClick={handleStartPayment}>
                      {isSubmitting ? 'Đang tạo đơn...' : frequency ? `Tạo ${occurrences} lượt & thanh toán` : appliedVoucherCode ? 'Tạo đơn & thanh toán' : 'Thanh toán không dùng voucher'}
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: SEPAY PAYMENT */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                    Thanh toán bằng QR SePay
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  {isPaymentExpired || isBookingClosed ? (
                    <div role="alert" className="max-w-sm mx-auto rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 space-y-3">
                      <p>{isPaymentExpired ? 'Đã hết thời gian thanh toán cho đơn này.' : 'Đơn đã kết thúc hoặc đã hủy.'}</p>
                      <p>{totalPaid > 0 ? `Đã ghi nhận ${formatVND(totalPaid)}. Vui lòng liên hệ chủ sân để đối soát, không chuyển thêm tiền.` : 'Vui lòng kiểm tra trạng thái đơn trước khi đặt lại.'}</p>
                      <Link href="/dashboard/customer/bookings" className="inline-block font-semibold underline">Xem đơn đặt sân</Link>
                    </div>
                  ) : paymentQr ? (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 max-w-sm mx-auto space-y-3">
                      <img src={paymentQr.qr_image_url} alt="QR thanh toán SePay" className="w-full max-w-[280px] mx-auto h-auto rounded-lg border bg-white shadow-xs animate-fade-in" />
                      <div className="text-xs text-neutral-600 dark:text-neutral-300 space-y-1 text-left pt-1">
                        <p>Ngân hàng: <strong>{paymentQr.bank_name}</strong></p>
                        <p>Số tài khoản: <strong className="font-mono">{paymentQr.account_no}</strong></p>
                        <p>Chủ tài khoản: <strong>{paymentQr.account_name}</strong></p>
                        <p>Số tiền: <strong className="text-sport-600">{formatVND(paymentQr.amount)}</strong></p>
                        <p>Nội dung chuyển khoản: <strong className="font-mono select-all">{paymentQr.transfer_content}</strong></p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-sm mx-auto rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      Đơn <strong>{createdBookingCode}</strong> đã được tạo. Chưa lấy được QR SePay.
                      <div className="mt-3"><Button size="sm" variant="secondary" isLoading={isSubmitting} onClick={handleStartPayment}>Thử tạo QR lại</Button></div>
                    </div>
                  )}

                  {!isPaymentExpired && !isBookingClosed && <div className="max-w-md mx-auto space-y-2">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {paymentStatus === 'partial' ? `Đã nhận ${formatVND(totalPaid)}. Đang chờ thanh toán đủ.` : 'Mở ứng dụng ngân hàng để quét mã. Hệ thống tự kiểm tra giao dịch SePay.'}
                    </p>
                    {paymentQr && <p className={`text-xs text-neutral-500 ${paymentSecondsLeft > 0 && paymentSecondsLeft < 60 ? 'font-semibold text-red-600 dark:text-red-400 animate-pulse' : ''}`}>Mã đơn {createdBookingCode} · QR còn hiệu lực {Math.floor(paymentSecondsLeft / 60)}:{String(paymentSecondsLeft % 60).padStart(2, '0')}</p>}
                    <p className="text-[11px] text-neutral-400">Trang sẽ tự cập nhật khi webhook SePay xác nhận thanh toán.</p>
                  </div>}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Order Summary Card */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-sm">Tóm Tắt Đơn Đặt Sân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white">{selectedCourt.name}</h4>
                  <p className="text-neutral-500">{selectedVenue.name}</p>
                </div>

                <div className="space-y-2 py-3 border-y border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Khách hàng:</span>
                    <strong className="truncate max-w-[120px]">{customerName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Ngày đặt:</span>
                    <strong className="font-mono">{formatDate(serverBooking?.booking_date.slice(0, 10) || bookingDate)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Khung giờ:</span>
                    <strong className="tabular-nums">{hasValidRange ? `${rangeSlotList[0].start_time.slice(0, 5)} – ${rangeSlotList[rangeSlotList.length - 1].end_time.slice(0, 5)}${rangeSlotList.length > 1 ? ` (${rangeSlotList.length} khung giờ)` : ''}` : 'Chưa chọn'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tiền sân{!serverBooking && frequency ? ` (${bookingCount} lượt)` : ''}:</span>
                    <span className="font-mono">{formatVND(serverBooking?.court_fee ?? courtFee * bookingCount)}</span>
                  </div>
                  {addonsFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Dịch vụ đi kèm:</span>
                      <span className="font-mono">{formatVND(serverBooking?.addons_fee ?? addonsFee * bookingCount)}</span>
                    </div>
                  )}
                  {displayedDiscount > 0 && (
                    <div className="flex justify-between text-sport-600 font-semibold">
                      <span>{frequency ? 'Ưu đãi định kỳ:' : 'Giảm giá voucher:'}</span>
                      <span className="font-mono">-{formatVND(displayedDiscount)}</span>
                    </div>
                  )}
                </div>

                {!serverBooking && recurringDiscount > 0 && <div className="flex justify-between text-sport-600 font-semibold"><span>Ưu đãi định kỳ ({recurringPercent}%):</span><span>-{formatVND(recurringDiscount)}</span></div>}
                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-bold text-sm">{seriesBookings.length ? 'Thanh toán lượt này:' : 'Tổng thanh toán:'}</span>
                  <span className="text-lg font-bold font-mono text-sport-600">
                    {formatVND(totalPrice)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
