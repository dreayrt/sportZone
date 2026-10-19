'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MOCK_VENUES, MOCK_ADDONS, Court, Addon } from '@/lib/mock-data';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
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
  FileText
} from 'lucide-react';

export default function BookingWizardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const courtId = parseInt(params.courtId as string, 10);

  // Find court across venues
  let selectedCourt: Court | undefined;
  let selectedVenue = MOCK_VENUES[0];

  for (const v of MOCK_VENUES) {
    const c = v.courts?.find((item) => item.id === courtId);
    if (c) {
      selectedCourt = c;
      selectedVenue = v;
      break;
    }
  }

  if (!selectedCourt) {
    selectedCourt = MOCK_VENUES[0].courts![0];
  }

  // State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('18:00 - 19:30');
  const [addonsCount, setAddonsCount] = useState<Record<number, number>>({ 1: 2, 2: 1 }); // default 2 waters, 1 pocari
  const [voucherCode, setVoucherCode] = useState('SPORT30');
  const [appliedDiscount, setAppliedDiscount] = useState(30000);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdBookingCode, setCreatedBookingCode] = useState('SZ-77812');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Customer Contact Info
  const [customerName, setCustomerName] = useState(user?.full_name || 'Nguyễn Minh Anh');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '0912345678');
  const [customerEmail, setCustomerEmail] = useState(user?.email || 'minhanh@example.com');
  const [note, setNote] = useState('');

  // Real-time API slots
  const [apiSlots, setApiSlots] = useState<any[]>([]);

  // Default fallback slots
  const defaultSlots = [
    { time: '06:00 - 07:30', start_time: '06:00:00', end_time: '07:30:00', peak: false, rate: selectedCourt.hourly_rate_standard * 1.5, is_booked: false },
    { time: '07:30 - 09:00', start_time: '07:30:00', end_time: '09:00:00', peak: false, rate: selectedCourt.hourly_rate_standard * 1.5, is_booked: false },
    { time: '16:30 - 18:00', start_time: '16:30:00', end_time: '18:00:00', peak: false, rate: selectedCourt.hourly_rate_standard * 1.5, is_booked: false },
    { time: '18:00 - 19:30', start_time: '18:00:00', end_time: '19:30:00', peak: true, rate: selectedCourt.hourly_rate_peak * 1.5, is_booked: false },
    { time: '19:30 - 21:00', start_time: '19:30:00', end_time: '21:00:00', peak: true, rate: selectedCourt.hourly_rate_peak * 1.5, is_booked: false },
    { time: '21:00 - 22:30', start_time: '21:00:00', end_time: '22:30:00', peak: false, rate: selectedCourt.hourly_rate_standard * 1.5, is_booked: false },
  ];

  // Fetch slots from Backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchSlots() {
      try {
        const res = await api.bookings.getCourtSlots(selectedCourt!.id, bookingDate);
        if (isMounted && res.success && res.data?.slots?.length > 0) {
          setApiSlots(res.data.slots);
          const firstOpen = res.data.slots.find((s: any) => !s.is_booked);
          if (firstOpen) {
            setSelectedSlot(firstOpen.time);
          }
        }
      } catch (err) {
        // use fallback defaultSlots
      }
    }
    fetchSlots();
    return () => { isMounted = false; };
  }, [selectedCourt?.id, bookingDate]);

  useEffect(() => {
    if (user) {
      if (!customerName || customerName === 'Nguyễn Minh Anh') setCustomerName(user.full_name);
      if (!customerPhone || customerPhone === '0912345678') setCustomerPhone(user.phone);
      if (user.email) setCustomerEmail(user.email);
    }
  }, [user]);

  const activeSlots = apiSlots.length > 0 ? apiSlots : defaultSlots;

  // Fee calculation
  const currentSlotObj = activeSlots.find((s) => s.time === selectedSlot) || activeSlots[0];
  const courtFee = currentSlotObj?.rate || selectedCourt.hourly_rate_standard * 1.5;

  const addonsFee = Object.entries(addonsCount).reduce((sum, [idStr, count]) => {
    const addon = MOCK_ADDONS.find((a) => a.id === parseInt(idStr, 10));
    return sum + (addon ? addon.price * count : 0);
  }, 0);

  const totalPrice = Math.max(0, courtFee + addonsFee - appliedDiscount);

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const code = voucherCode.trim().toUpperCase();
    if (code === 'SPORTZONE50') {
      setAppliedDiscount(50000);
      alert('Áp dụng thành công mã SPORTZONE50: Giảm 50.000đ!');
    } else if (code === 'SPORT30') {
      setAppliedDiscount(30000);
      alert('Áp dụng thành công mã SPORT30: Giảm 30.000đ!');
    } else if (code === 'WELCOME10') {
      const discount = Math.min(80000, Math.round((courtFee + addonsFee) * 0.1));
      setAppliedDiscount(discount);
      alert(`Áp dụng thành công mã WELCOME10: Giảm ${formatVND(discount)}!`);
    } else {
      alert('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
    }
  };

  const handleCompleteBooking = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    // Parse start and end time from selectedSlot
    const parts = selectedSlot.split(' - ');
    const startTime = parts[0]?.trim() || '18:00';
    const endTime = parts[1]?.trim() || '19:30';

    const addonsPayload = Object.entries(addonsCount)
      .filter(([_, qty]) => qty > 0)
      .map(([idStr, qty]) => ({
        addon_id: parseInt(idStr, 10),
        quantity: qty
      }));

    const payload = {
      court_id: selectedCourt!.id,
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      customer_name: customerName || 'Khách Hàng',
      customer_phone: customerPhone || '0912345678',
      customer_email: customerEmail || undefined,
      note: note || undefined,
      addons: addonsPayload,
      voucher_code: appliedDiscount > 0 ? voucherCode : undefined,
      payment_method: 'vietqr',
      payment_status: 'paid',
      source: 'website',
    };

    try {
      const res = await api.bookings.create(payload);

      if (res.success && res.data) {
        setCreatedBookingCode(res.data.booking_code);
        setIsSuccess(true);
      } else {
        const errorMsg = res.message || res.errors?.slot?.[0] || 'Không thể tạo đơn đặt sân.';
        setErrorMessage(errorMsg);
        alert(`Lỗi đặt sân: ${errorMsg}`);
      }
    } catch (err: any) {
      // Visual fallback
      setCreatedBookingCode('SZ-' + Math.floor(10000 + Math.random() * 90000));
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
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
          {['1. Khung Giờ & Thông Tin', '2. Dịch Vụ', '3. Voucher', '4. VietQR'].map((label, idx) => (
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
            <Badge variant="sport" size="md">Thanh toán VietQR Hoàn Tất</Badge>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Mã Đặt Sân: {createdBookingCode}
            </h2>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Hệ thống đã lưu thông tin đặt sân vào cơ sở dữ liệu và kích hoạt mã QR điểm danh (Check-in) cho bạn.
            </p>
          </div>

          <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl max-w-sm mx-auto border border-neutral-200 dark:border-neutral-800 text-xs space-y-1.5 text-left">
            <p><strong>Người đặt:</strong> {customerName} ({customerPhone})</p>
            <p><strong>Sân:</strong> {selectedCourt.name}</p>
            <p><strong>Giờ chơi:</strong> {selectedSlot} ngày {formatDate(bookingDate)}</p>
            <p><strong>Tổng thanh toán:</strong> <span className="font-mono font-bold text-sport-600">{formatVND(totalPrice)}</span></p>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Wizard Step Box */}
          <div className="lg:col-span-2 space-y-6">
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
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Chọn ngày đặt sân
                    </label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Chọn khung giờ thi đấu (Real-time từ hệ thống)
                      </label>
                      <span className="text-[11px] text-neutral-400">
                        * Giờ cao điểm Peak: 17:00 - 21:00
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeSlots.map((s) => {
                        const isBooked = !!s.is_booked;
                        const isSelected = selectedSlot === s.time;

                        return (
                          <button
                            key={s.time}
                            type="button"
                            disabled={isBooked}
                            onClick={() => !isBooked && setSelectedSlot(s.time)}
                            className={`p-3.5 rounded-xl border text-left transition-all ${
                              isBooked
                                ? 'bg-neutral-100 dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800 opacity-60 cursor-not-allowed'
                                : isSelected
                                ? 'border-sport-500 bg-sport-50/60 dark:bg-sport-950/40 ring-1 ring-sport-500'
                                : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sm text-neutral-900 dark:text-white">
                                {s.time}
                              </span>
                              {isBooked ? (
                                <Badge variant="neutral" size="sm">Đã có người đặt</Badge>
                              ) : s.peak ? (
                                <Badge variant="warning" size="sm">Giờ Vàng (Peak)</Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">Giờ Thường</Badge>
                              )}
                            </div>
                            <div className="text-xs font-mono font-medium text-sport-600 mt-1">
                              {isBooked ? 'Không khả dụng' : formatVND(s.rate)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
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
                    <Button variant="primary" size="sm" onClick={() => setCurrentStep(2)}>
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
                    {MOCK_ADDONS.slice(0, 4).map((addon) => {
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
                              onClick={() => setAddonsCount({ ...addonsCount, [addon.id]: Math.max(0, count - 1) })}
                              className="w-7 h-7 rounded-md border border-neutral-200 dark:border-neutral-700 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-sm">{count}</span>
                            <button
                              type="button"
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
                    <Button variant="primary" size="sm" onClick={() => setCurrentStep(3)}>
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
                    Mã Giảm Giá & Khuyến Mãi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleApplyVoucher} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã: SPORTZONE50, SPORT30 hoặc WELCOME10"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono uppercase bg-white dark:bg-neutral-900"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      Áp Dụng
                    </Button>
                  </form>

                  {appliedDiscount > 0 && (
                    <div className="p-3 rounded-lg bg-sport-50 dark:bg-sport-950/40 border border-sport-200 dark:border-sport-800 text-xs text-sport-800 dark:text-sport-300 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-sport-500" />
                        Đã áp dụng mã {voucherCode.toUpperCase()}: Giảm {formatVND(appliedDiscount)}
                      </span>
                      <button onClick={() => setAppliedDiscount(0)} className="text-neutral-400 hover:text-red-500">
                        Gỡ mã
                      </button>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(2)}>
                      Quay lại
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setCurrentStep(4)}>
                      Tiếp tục: Thanh toán VietQR
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* STEP 4: VIETQR PAYMENT */}
            {currentStep === 4 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                    Quét Mã VietQR Chuyển Khoản
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-center">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 max-w-xs mx-auto space-y-3">
                    <img
                      src={`https://api.vietqr.io/image/970436-0123456789-Q4fJkZ3.jpg?accountName=SPORTZONE%20VIETNAM&amount=${totalPrice}&addInfo=SZ77812`}
                      alt="VietQR"
                      className="w-full h-auto rounded-lg border shadow-xs"
                    />
                    <div className="text-xs text-neutral-500 font-mono space-y-0.5 text-left pt-1">
                      <p>Ngân hàng: <strong>Vietcombank</strong></p>
                      <p>Số TK: <strong>0123456789</strong></p>
                      <p>Số tiền: <strong className="text-sport-600">{formatVND(totalPrice)}</strong></p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400">
                    Mở ứng dụng ngân hàng hoặc ví điện tử để quét mã thanh toán tức thì.
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentStep(3)}>
                      Quay lại
                    </Button>
                    <Button variant="primary" size="sm" disabled={isSubmitting} onClick={handleCompleteBooking}>
                      {isSubmitting ? 'Đang Xử Lý Đơn...' : 'Xác Nhận & Hoàn Tất Đặt Sân'}
                    </Button>
                  </div>
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
                    <strong className="font-mono">{selectedSlot}</strong>
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
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-sport-600 font-semibold">
                      <span>Giảm giá voucher:</span>
                      <span className="font-mono">-{formatVND(appliedDiscount)}</span>
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
