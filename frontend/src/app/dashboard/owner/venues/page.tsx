'use client';

import React from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_VENUES } from '@/lib/mock-data';
import { Building2, MapPin, Phone, Mail, Clock, Star, Edit } from 'lucide-react';

export default function OwnerVenuesPage() {
  const venue = MOCK_VENUES[0];

  return (
    <div>
      <DashboardHeader
        title="Thông Tin Cơ Sở & Tiện Ích"
        description="Quản lý địa chỉ, thời gian mở/đóng cửa và tiện ích hiển thị cho khách hàng."
        actions={
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
            <Edit className="w-3.5 h-3.5" />
            Cập Nhật Thông Tin
          </Button>
        }
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Card className="overflow-hidden">
          <div className="h-48 relative overflow-hidden bg-neutral-900">
            <img
              src={venue.image}
              alt={venue.name}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-6 text-white space-y-1">
              <Badge variant="sport">Cơ sở hoạt động</Badge>
              <h2 className="text-xl font-bold">{venue.name}</h2>
              <p className="text-xs text-neutral-300 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {venue.address}, {venue.ward}, {venue.district}, {venue.city}
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-neutral-100 dark:border-neutral-800 pb-6 text-xs">
              <div className="space-y-1">
                <span className="text-neutral-400 block">Thời gian mở cửa</span>
                <span className="font-semibold text-sm flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                  <Clock className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                  {venue.open_time} - {venue.close_time}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block">Hotline liên hệ</span>
                <span className="font-semibold text-sm flex items-center gap-1 text-neutral-800 dark:text-neutral-200">
                  <Phone className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
                  {venue.phone}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-neutral-400 block">Đánh giá trung bình</span>
                <span className="font-semibold text-sm flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {venue.rating} ({venue.review_count} lượt đánh giá)
                </span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mb-3">
                Tiện Ích Cơ Sở Hiện Có ({venue.amenities?.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {venue.amenities?.map((amenity) => (
                  <Badge key={amenity.id} variant="neutral" size="md">
                    {amenity.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
