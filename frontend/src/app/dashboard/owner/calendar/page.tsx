'use client';

import React, { useState, useEffect } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_VENUES, MOCK_BOOKINGS, Court } from '@/lib/mock-data';
import { formatVND, formatDate } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  User,
  Check,
  RotateCcw,
  Phone,
  AlertCircle
} from 'lucide-react';

export default function OwnerCalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const venue = MOCK_VENUES[0]; // SportZone Chấn Hưng Complex
  const [courts, setCourts] = useState<Court[]>(venue.courts || []);
  const [matrixData, setMatrixData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Counter Booking Modal State
  const [isCounterModalOpen, setIsCounterModalOpen] = useState(false);
  const [counterCourtId, setCounterCourtId] = useState<number>(courts[0]?.id || 1);
  const [counterStartTime, setCounterStartTime] = useState('08:00');
  const [counterEndTime, setCounterEndTime] = useState('09:30');
  const [counterCustomerName, setCounterCustomerName] = useState('');
  const [counterCustomerPhone, setCounterCustomerPhone] = useState('');
  const [counterNote, setCounterNote] = useState('Khách đặt trực tiếp tại quầy');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hourly slots from 06:00 to 22:00
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  const fetchTimeline = async () => {
    setIsLoading(true);
    try {
      const res = await api.bookings.getTimeline({ venue_id: venue.id, date: selectedDate });
      if (res.success && res.data) {
        if (res.data.courts?.length > 0) {
          setCourts(res.data.courts);
        }
        if (res.data.matrix?.length > 0) {
          setMatrixData(res.data.matrix);
        }
      }
    } catch {
      // Fallback to local evaluation
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedDate]);

  // Adjust Date
  const handleShiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Helper check peak hour
  const isPeakHour = (time: string) => {
    const hour = parseInt(time.split(':')[0], 10);
    return hour >= 17 && hour <= 21;
  };

  // Helper booking slot from matrix or fallback
  const getSlotInfo = (courtId: number, slotHour: string) => {
    if (matrixData.length > 0) {
      const row = matrixData.find((r) => r.hour === slotHour);
      if (row && row.slots?.[courtId]) {
        return row.slots[courtId];
      }
    }

    // Mock fallback
    if (courtId === 1 && (slotHour === '18:00' || slotHour === '19:00')) {
      return {
        is_booked: true,
        customer_name: 'Nguyễn Minh Anh',
        customer_phone: '0912345678',
        booking_code: 'SZ-77812',
        status: 'confirmed',
        payment_status: 'paid',
        checked_in: false,
      };
    }
    if (courtId === 4 && slotHour === '07:00') {
      return {
        is_booked: true,
        customer_name: 'Lê Thu Trang',
        customer_phone: '0988111222',
        booking_code: 'SZ-66021',
        status: 'completed',
        payment_status: 'paid',
        checked_in: true,
      };
    }
    return { is_booked: false };
  };

  // Open modal on empty slot click
  const handleSlotClick = (courtId: number, slotHour: string, isBooked: boolean) => {
    if (isBooked) return;
    setCounterCourtId(courtId);
    setCounterStartTime(slotHour);

    const startH = parseInt(slotHour.split(':')[0], 10);
    const endH = startH + 1;
    const endMinute = '30';
    setCounterEndTime(`${String(endH).padStart(2, '0')}:${endMinute}`);
    setIsCounterModalOpen(true);
  };

  // Handle Counter Booking Submit
  const handleCounterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.bookings.create({
        court_id: counterCourtId,
        booking_date: selectedDate,
        start_time: counterStartTime,
        end_time: counterEndTime,
        customer_name: counterCustomerName || 'Khách Tại Quầy',
        customer_phone: counterCustomerPhone || '0900000000',
        note: counterNote,
        payment_method: 'cash',
        payment_status: 'paid',
        source: 'counter',
      });

      if (res.success) {
        alert(`Tạo đơn tại quầy thành công! Mã đơn: ${res.data?.booking_code}`);
        setIsCounterModalOpen(false);
        setCounterCustomerName('');
        setCounterCustomerPhone('');
        fetchTimeline();
      } else {
        alert(res.message || 'Lỗi tạo đơn tại quầy.');
      }
    } catch {
      alert('Tạo đơn tại quầy thành công (Demo Mode)!');
      setIsCounterModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Lưới Lịch Sân Theo Thời Gian Thực"
        description="Quản lý slot giờ thi đấu trực quan, phân biệt khung giờ thường & giờ cao điểm (Peak Hours), nhận khách tại quầy nhanh."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleShiftDate(-1)} className="gap-1 text-xs">
              <ChevronLeft className="w-3.5 h-3.5" />
              Hôm trước
            </Button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono"
            />
            <Button variant="outline" size="sm" onClick={() => handleShiftDate(1)} className="gap-1 text-xs">
              Hôm sau
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCounterCourtId(courts[0]?.id || 1);
                setIsCounterModalOpen(true);
              }}
              className="gap-1.5 text-xs ml-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo Đơn Tại Quầy
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Legend */}
        <div className="flex items-center justify-between gap-4 text-xs text-neutral-600 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-neutral-900 dark:text-white">Chú thích:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-white border border-neutral-300 dark:bg-neutral-800"></span>
              <span>Giờ thường trống</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-50 border border-amber-300 dark:bg-amber-950/40"></span>
              <span>Giờ vàng Peak (17h-21h)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-sport-500 text-white"></span>
              <span>Đã đặt & Đã thanh toán</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-600 text-white"></span>
              <span>Đã điểm danh vào sân</span>
            </div>
          </div>

          <span className="text-[11px] text-neutral-400 italic">
            * Nhấp vào ô trống để tạo đơn nhận khách nhanh tại quầy
          </span>
        </div>

        {/* Court Timeline Matrix Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-neutral-100 dark:bg-neutral-800/80 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="py-3 px-4 text-xs font-bold text-neutral-500 w-24 border-r border-neutral-200 dark:border-neutral-700">
                    Khung giờ
                  </th>
                  {courts.map((court) => (
                    <th key={court.id} className="py-3 px-4 text-xs font-bold text-neutral-900 dark:text-white min-w-[200px] border-r last:border-r-0 border-neutral-200 dark:border-neutral-700">
                      <div>{court.name}</div>
                      <div className="text-[11px] font-normal text-neutral-500 font-mono">
                        {formatVND(court.hourly_rate_standard)} / giờ
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {timeSlots.map((slot) => {
                  const isPeak = isPeakHour(slot);

                  return (
                    <tr key={slot} className="hover:bg-neutral-50/40 transition-colors">
                      <td className={`py-3 px-4 font-mono text-xs font-bold border-r border-neutral-200 dark:border-neutral-700 ${
                        isPeak ? 'text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : 'text-neutral-600 dark:text-neutral-400'
                      }`}>
                        {slot}
                        {isPeak && <span className="block text-[9px] uppercase tracking-wider font-semibold">PEAK</span>}
                      </td>

                      {courts.map((court) => {
                        const booking = getSlotInfo(court.id, slot);

                        if (booking.is_booked) {
                          return (
                            <td key={court.id} className="p-2 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 bg-sport-50/50 dark:bg-sport-950/20">
                              <div className={`p-2 rounded-lg text-xs space-y-1 shadow-2xs border ${
                                booking.checked_in
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-sport-600 text-white border-sport-500'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-[11px]">
                                    {booking.booking_code}
                                  </span>
                                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-sm">
                                    {booking.checked_in ? 'Đã check-in' : 'Đã xác nhận'}
                                  </span>
                                </div>
                                <div className="font-semibold truncate">
                                  {booking.customer_name}
                                </div>
                                {booking.customer_phone && (
                                  <div className="text-[10px] opacity-80 font-mono">
                                    {booking.customer_phone}
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={court.id}
                            onClick={() => handleSlotClick(court.id, slot, false)}
                            className={`p-2 border-r last:border-r-0 border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer group ${
                              isPeak ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-100/40' : 'hover:bg-neutral-100/60 dark:hover:bg-neutral-850'
                            }`}
                          >
                            <div className="h-12 rounded-lg border border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-300 dark:text-neutral-700 group-hover:border-sport-400 group-hover:text-sport-500 transition-all text-xs font-medium">
                              <span className="hidden group-hover:inline flex items-center gap-1 text-[11px]">
                                <Plus className="w-3 h-3" /> Đặt tại quầy
                              </span>
                              <span className="group-hover:hidden text-[10px]">Trống</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Counter Booking Modal */}
        {isCounterModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sport-100 dark:bg-sport-950 text-sport-600 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    Tạo Đơn Đặt Sân Tại Quầy Tiếp Tân
                  </h3>
                </div>
                <button
                  onClick={() => setIsCounterModalOpen(false)}
                  className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCounterSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Chọn sân thi đấu *
                  </label>
                  <select
                    value={counterCourtId}
                    onChange={(e) => setCounterCourtId(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-semibold"
                  >
                    {courts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({formatVND(c.hourly_rate_standard)}/h)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Giờ bắt đầu *
                    </label>
                    <input
                      type="time"
                      required
                      value={counterStartTime}
                      onChange={(e) => setCounterStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Giờ kết thúc *
                    </label>
                    <input
                      type="time"
                      required
                      value={counterEndTime}
                      onChange={(e) => setCounterEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Tên khách hàng *
                    </label>
                    <input
                      type="text"
                      required
                      value={counterCustomerName}
                      onChange={(e) => setCounterCustomerName(e.target.value)}
                      placeholder="VD: Anh Tuấn"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      type="text"
                      required
                      value={counterCustomerPhone}
                      onChange={(e) => setCounterCustomerPhone(e.target.value)}
                      placeholder="0901234567"
                      className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-medium text-neutral-600 dark:text-neutral-400 block mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={counterNote}
                    onChange={(e) => setCounterNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCounterModalOpen(false)}
                  >
                    Hủy Bỏ
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang Tạo Đơn...' : 'Xác Nhận Nhận Khách'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
