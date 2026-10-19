'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MOCK_VENUES } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatVND } from '@/lib/utils';
import {
  MapPin,
  Clock,
  Phone,
  Star,
  CheckCircle2,
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  Share2
} from 'lucide-react';

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const slug = params.slug as string;

  const venue = MOCK_VENUES.find((v) => v.slug === slug) || MOCK_VENUES[0];

  const handleBookCourt = (courtId: number) => {
    const target = `/booking/${courtId}`;
    if (!isLoading && !user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(target)}`);
      return;
    }
    router.push(target);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Venue Hero Banner */}
      <div className="rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-neutral-900 text-white relative">
        <div className="h-72 sm:h-96 w-full relative">
          <img
            src={venue.image}
            alt={venue.name}
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-6 sm:bottom-8 left-6 sm:left-8 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="sport">Cơ sở tiêu chuẩn SportZone</Badge>
                <Badge variant="warning" className="font-bold">
                  ★ {venue.rating} ({venue.review_count} đánh giá)
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {venue.name}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sport-400 shrink-0" />
                {venue.address}, {venue.ward}, {venue.district}, {venue.city}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-xs text-neutral-300 hidden md:block text-right">
                <span className="block text-neutral-400">Giờ hoạt động</span>
                <strong className="text-white text-sm font-mono">{venue.open_time} - {venue.close_time}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Court Lists */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
              Danh Sách Sân Đấu Tại Cơ Sở ({venue.courts?.length || 0} sân)
            </h2>
            <p className="text-xs text-neutral-500">
              Chọn sân để xem slot giờ trống và tiến hành đặt sân online.
            </p>
          </div>

          <div className="space-y-4">
            {venue.courts?.map((court) => (
              <Card key={court.id} hoverEffect className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sport-600 bg-sport-50 dark:bg-sport-950 px-2 py-0.5 rounded">
                      {court.code}
                    </span>
                    <Badge variant={court.indoor ? 'info' : 'neutral'} size="sm">
                      {court.indoor ? 'Trong nhà' : 'Ngoài trời'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                    {court.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Mặt sân: {court.surface_type} • Sức chứa: {court.capacity || 4} người
                  </p>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
                  <div className="text-right">
                    <div className="text-xs text-neutral-400">Giờ thường / Peak</div>
                    <div className="text-sm font-bold font-mono text-neutral-900 dark:text-white">
                      {formatVND(court.hourly_rate_standard)} <span className="text-amber-600">/ {formatVND(court.hourly_rate_peak)}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => handleBookCourt(court.id)}
                  >
                    Đặt Sân Này
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Description & Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Mô Tả & Quy Định Thi Đấu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <p>{venue.description}</p>
              <ul className="list-disc pl-4 space-y-1 text-neutral-500">
                <li>Vui lòng mang giày thể thao đế mềm hoặc đế chuyên dụng tránh hư hại mặt sân.</li>
                <li>Khách hàng vui lòng check-in bằng mã QR tại quầy lễ tân trước giờ đấu 10 phút.</li>
                <li>Hỗ trợ hủy và hoàn tiền 100% nếu thông báo trước 6 tiếng so với giờ bắt đầu.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Amenities & Quick Contact */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tiện Ích Tại Cơ Sở</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                {venue.amenities?.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                    <CheckCircle2 className="w-4 h-4 text-sport-500 shrink-0" strokeWidth={1.5} />
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông Tin Liên Hệ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span className="font-semibold text-neutral-900 dark:text-white font-mono">{venue.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>Mở cửa: {venue.open_time} - {venue.close_time}</span>
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  <Share2 className="w-3.5 h-3.5" />
                  Chia sẻ cơ sở này
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
