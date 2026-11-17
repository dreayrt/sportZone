'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Addon, localDate } from '@/lib/venues-api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { api, apiRequest, SepayPaymentQr } from '@/lib/api';
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
  state: 'available' | 'booked' | 'past' | 'closed';
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

  // State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [bookingDate, setBookingDate] = useState(localDate);
  const [selectedSlot, setSelectedSlot] = useState('');
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

  // Fetch slots from Backend API
  useEffect(() => {
    if (createdBookingCode) return;
    let isMounted = true;
    setIsSlotsLoading(true);
    setApiSlots([]);
    setSelectedSlot('');
    setSlotsError('');
    async function fetchSlots() {
      const res = await api.bookings.getCourtSlots(courtId, bookingDate);
      if (!isMounted) return;
      if (res.success && res.data) {
        setSelectedCourt(res.data.court);
        setApiSlots(res.data.slots || []);
        setSelectedSlot((current) => res.data.slots.some((slot: BookingSlot) => slot.time === current && !slot.is_booked) ? current : '');
        setSlotsError('');
      } else {
        setApiSlots([]);
        setSelectedSlot('');
        setSlotsError(res.message || 'Không tải được lịch sân. Vui lòng thử lại.');
      }
      setIsSlotsLoading(false);
    }
    fetchSlots();
    const interval = window.setInterval(fetchSlots, 30000);
    return () => { isMounted = false; window.clearInterval(interval); };
  }, [courtId, bookingDate, refreshSlots, createdBookingCode]);

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

  // Fee calculation
  const currentSlotObj = activeSlots.find((s) => s.time === selectedSlot);
  const courtFee = currentSlotObj?.rate ?? 0;

  const addonsFee = Object.entries(addonsCount).reduce((sum, [idStr, count]) => {
    const addon = addons.find((a) => a.id === parseInt(idStr, 10));
    return sum + (addon ? addon.price * count : 0);
  }, 0);

  const subtotal = courtFee + addonsFee;
  const totalPrice = serverBooking?.total_price ?? Math.max(0, subtotal - appliedDiscount);
  const displayedDiscount = serverBooking?.discount_amount ?? appliedDiscount;

  useEffect(() => {
    voucherRequestId.current += 1;
    setAppliedVoucherCode('');
    setAppliedDiscount(0);
    setVoucherMessage('');
  }, [subtotal, bookingDate, selectedSlot, courtId]);

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
    if (!createdBookingCode && (!currentSlotObj || currentSlotObj.is_booked || !customerName.trim() || !customerPhone.trim())) {
      setErrorMessage('Vui lòng chọn khung giờ còn trống, nhập họ tên và số điện thoại liên hệ.');
      setCurrentStep(1);
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let bookingCode = createdBookingCode;
      if (!bookingCode) {
        const startTime = currentSlotObj!.start_time.slice(0, 5);
        const endTime = currentSlotObj!.end_time.slice(0, 5);
        const addonsPayload = Object.entries(addonsCount)
          .filter(([, quantity]) => quantity > 0)
          .map(([id, quantity]) => ({ addon_id: Number(id), quantity }));

        const bookingResponse = await api.bookings.create({
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
        });

        if (!bookingResponse.success || !bookingResponse.data?.booking_code) {
          const details = Object.values(bookingResponse.errors || {}).flat().filter((value): value is string => typeof value === 'string');
          setErrorMessage(details.join(' ') || bookingResponse.message || 'Không thể tạo đơn đặt sân.');
          return;
        }

        bookingCode = bookingResponse.data.booking_code;
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

  const shiftBookingDate = (days: number) => {
    const date = new Date(`${bookingDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    setBookingDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    setErrorMessage('');
  };

  useEffect(() => {
    if (currentStep !== 4 || !createdBookingCode || isSuccess) return;

    const checkStatus = async () => {
      const response = await api.payments.getStatus(createdBookingCode);
      if (!response.success || !response.data) return;

      setPaymentStatus(response.data.payment_status as typeof paymentStatus);
      setTotalPaid(response.data.total_paid || 0);
      setIsPaymentExpired(response.data.is_expired);
      const isClosed = ['cancelled', 'completed', 'no_show'].includes(response.data.status);
      setIsBookingClosed(isClosed);
      setServerBooking((current: any) => current ? { ...current, total_price: response.data.total_price } : current);
      const remainingAmount = Math.max(0, response.data.total_price - response.data.total_paid);
      if (!response.data.is_paid && !response.data.is_expired && !isClosed && paymentQr && paymentQr.amount !== remainingAmount) {
        const qrResponse = await api.payments.generateQr(createdBookingCode);
        if (qrResponse.success && qrResponse.data?.payment) setPaymentQr(qrResponse.data.payment);
      }
      if (response.data.is_paid) setIsSuccess(true);
      if (response.data.status === 'cancelled') setErrorMessage('Đơn đã hết thời gian giữ chỗ. Vui lòng tạo đơn mới.');
    };

    checkStatus();
    const intervalId = window.setInterval(checkStatus, 5000);
    return () => window.clearInterval(intervalId);
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

  // Đang kiểm tra auth hoặc sắp redirect -> hiện loading, tránh nháy nội dung
  if (isAuthLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-xs text-neutral-500">Đang kiểm tra đăng nhập...</p>
      </div>
    );
  }

  if (!selectedCourt) return <div className="max-w-7xl mx-auto px-4 py-16 text-sm text-neutral-500">{slotsError || 'Đang tải thông tin sân...'}{slotsError && <Button className="ml-3" size="sm" onClick={() => setRefreshSlots((value) => value + 1)}>Thử lại</Button>}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
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

      {isSuccess ? (
        <Card className="p-8 text-center space-y-5 border-sport-200 bg-sport-50/20">
          <div className="w-14 h-14 rounded-full bg-sport-500 text-white flex items-center justify-center mx-auto shadow-sm">
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
            <p><strong>Giờ chơi:</strong> {selectedSlot} ngày {formatDate(bookingDate)}</p>
            <p><strong>Tổng thanh toán:</strong> <span className="font-mono font-bold text-sport-600">{formatVND(serverBooking?.total_price ?? totalPrice)}</span></p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/dashboard/customer/bookings">
              <Button variant="primary" size="md" className="gap-2">
                <QrCode className="w-4 h-4" />
                Xem Vé Check-in Của Tôi
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="md">Về Trang Chủ</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] items-start gap-6">
          {/* Main Wizard Step Box */}
          <div className="min-w-0 space-y-6">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" aria-label="Ngày trước" disabled={bookingDate <= localDate()} onClick={() => shiftBookingDate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
                    <label htmlFor="booking-date" className="text-xs text-neutral-500">Ngày đặt sân</label>
                    <input
                      id="booking-date"
                      type="date"
                      min={localDate()}
                      value={bookingDate}
                      onChange={(e) => { if (e.target.value) { setBookingDate(e.target.value); setErrorMessage(''); } }}
                      className="min-w-0 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 tabular-nums"
                    />
                    <Button type="button" variant="outline" size="sm" aria-label="Ngày sau" onClick={() => shiftBookingDate(1)}><ArrowRight className="w-4 h-4" /></Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setBookingDate(localDate())}>Hôm nay</Button>
                    <Button type="button" variant="outline" size="sm" aria-label="Làm mới lịch sân" className="ml-auto" disabled={isSlotsLoading} onClick={() => setRefreshSlots((value) => value + 1)}><RefreshCw className={`w-4 h-4 ${isSlotsLoading ? 'animate-spin' : ''}`} /></Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 dark:bg-neutral-950 px-3 py-3 text-[11px]">
                      <span className="text-neutral-500">Mỗi lượt {selectedCourt.min_booking_minutes} phút · {activeSlots.filter((slot) => !slot.is_booked).length} khung giờ còn trống</span>
                      <div className="flex flex-wrap gap-3">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Còn trống</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-indigo-400" />Đã đặt</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-400" />Không khả dụng</span>
                      </div>
                    </div>

                    {slotsError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{slotsError}</p>}
                    {isSlotsLoading ? <p role="status" className="py-12 text-center text-sm text-neutral-500">Đang tải lịch sân...</p> : activeSlots.length === 0 && !slotsError ? <p className="py-10 text-center text-sm text-neutral-500">Không có khung giờ trong ngày này. Vui lòng chọn ngày khác.</p> : <div role="group" aria-label="Chọn khung giờ thi đấu" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pt-2">
                      {activeSlots.map((s) => {
                        const isBooked = !!s.is_booked;
                        const isSelected = selectedSlot === s.time;

                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={isBooked}
                            aria-pressed={isSelected}
                            aria-label={`${s.time}, ${s.state === 'booked' ? 'đã đặt' : isBooked ? 'không khả dụng' : `${formatVND(s.rate)}${s.peak ? ', cao điểm' : ''}`}`}
                            onClick={() => { setSelectedSlot(s.time); setErrorMessage(''); }}
                            className={`min-w-0 min-h-24 p-3 rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sport-500 focus-visible:ring-offset-2 ${
                              isSelected ? 'border-sport-600 bg-sport-500 text-white'
                                : s.state === 'booked' ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-300 cursor-not-allowed'
                                : isBooked ? 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-500 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-semibold text-xs tabular-nums whitespace-nowrap">{s.time.replace(' - ', ' – ')}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </div>
                            <p className="mt-2 flex items-center gap-1 text-[11px]"><Clock className="h-3 w-3 shrink-0" />{s.state === 'booked' ? 'Đã đặt' : s.state === 'past' ? 'Đã qua giờ' : isBooked ? 'Không khả dụng' : isSelected ? 'Đang chọn' : 'Còn trống'}</p>
                            {!isBooked && <p className={`mt-1 text-[11px] font-semibold tabular-nums ${isSelected ? 'text-white' : 'text-emerald-700 dark:text-emerald-300'}`}>{formatVND(s.rate)}{s.peak && <span className="ml-1 font-normal">· Cao điểm</span>}</p>}
                          </button>
                        );
                      })}
                    </div>}
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

                  <div className="pt-2 flex justify-end">
                    <Button variant="primary" size="sm" disabled={isSlotsLoading || !currentSlotObj || currentSlotObj.is_booked || !customerName.trim() || !customerPhone.trim()} onClick={() => { setErrorMessage(''); setCurrentStep(2); }}>
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
                    {isAddonsLoading && <p role="status" className="py-6 text-sm text-neutral-500">Đang tải dịch vụ...</p>}
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

                  <div className="pt-2 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                      Quay lại
                    </Button>
                    <Button variant="primary" size="sm" disabled={isAddonsLoading} onClick={() => { setErrorMessage(''); setCurrentStep(3); }}>
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
                  <p className="text-sm text-neutral-500">Không có voucher? Bạn vẫn có thể tiếp tục thanh toán theo giá gốc. Giảm giá chỉ được áp dụng khi mã được xác nhận hợp lệ.</p>
                  <form onSubmit={handleApplyVoucher} className="flex gap-2">
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
                    <Button type="submit" variant="secondary" size="sm" disabled={isVoucherValidating || !voucherCode.trim()}>
                      {isVoucherValidating ? 'Đang kiểm tra...' : 'Áp Dụng'}
                    </Button>
                  </form>

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

                  <div className="pt-2 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                      Quay lại
                    </Button>
                    <Button type="button" variant="primary" size="sm" disabled={isSubmitting || isVoucherValidating} onClick={handleStartPayment}>
                      {isSubmitting ? 'Đang tạo đơn...' : appliedVoucherCode ? 'Tạo đơn & thanh toán' : 'Thanh toán không dùng voucher'}
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
                      <img src={paymentQr.qr_image_url} alt="QR thanh toán SePay" className="w-full max-w-[280px] mx-auto h-auto rounded-lg border bg-white shadow-xs" />
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
                      <div className="mt-3"><Button size="sm" variant="secondary" disabled={isSubmitting} onClick={handleStartPayment}>Thử tạo QR lại</Button></div>
                    </div>
                  )}

                  {!isPaymentExpired && !isBookingClosed && <div className="max-w-md mx-auto space-y-2">
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {paymentStatus === 'partial' ? `Đã nhận ${formatVND(totalPaid)}. Đang chờ thanh toán đủ.` : 'Mở ứng dụng ngân hàng để quét mã. Hệ thống tự kiểm tra giao dịch SePay.'}
                    </p>
                    {paymentQr && <p className="text-xs text-neutral-500">Mã đơn {createdBookingCode} · QR còn hiệu lực {Math.floor(paymentSecondsLeft / 60)}:{String(paymentSecondsLeft % 60).padStart(2, '0')}</p>}
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
                    <strong className="font-mono">{formatDate(bookingDate)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Khung giờ:</span>
                    <strong className="tabular-nums">{selectedSlot || 'Chưa chọn'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Tiền sân:</span>
                    <span className="font-mono">{formatVND(courtFee)}</span>
                  </div>
                  {addonsFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Dịch vụ đi kèm:</span>
                      <span className="font-mono">{formatVND(addonsFee)}</span>
                    </div>
                  )}
                  {displayedDiscount > 0 && (
                    <div className="flex justify-between text-sport-600 font-semibold">
                      <span>Giảm giá voucher:</span>
                      <span className="font-mono">-{formatVND(displayedDiscount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-bold text-sm">Tổng thanh toán:</span>
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
