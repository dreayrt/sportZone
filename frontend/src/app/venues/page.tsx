'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_VENUES, MOCK_CATEGORIES } from '@/lib/mock-data';
import { formatVND } from '@/lib/utils';
import { MapPin, Search, Trophy, Star } from 'lucide-react';

function VenuesContent() {
  const searchParams = useSearchParams();
  const initialSport = searchParams.get('sport') || 'all';
  const initialCity = searchParams.get('city') || 'all';

  const [selectedSport, setSelectedSport] = useState(initialSport);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVenues = MOCK_VENUES.filter((venue) => {
    // Lọc theo thành phố
    if (selectedCity !== 'all' && venue.city !== selectedCity) return false;

    // Lọc theo môn thể thao
    if (selectedSport !== 'all') {
      const category = MOCK_CATEGORIES.find((c) => c.code === selectedSport);
      if (category) {
        const hasSport = venue.courts?.some((c) => c.sport_category_id === category.id);
        if (!hasSport) return false;
      }
    }

    // Lọc theo từ khóa tìm kiếm (tên sân, quận/huyện)
    if (
      searchQuery &&
      !venue.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !venue.district.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
          Danh Sách Cơ Sở & Sân Thể Thao
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Tìm kiếm và đặt chỗ tại các cụm sân chất lượng cao tại TP. Hồ Chí Minh & Hà Nội.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Tên sân, quận huyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-hidden"
          />
        </div>

        {/* Sport */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <Trophy className="w-4 h-4 text-sport-500 shrink-0" strokeWidth={1.5} />
          <select
            value={selectedSport}
            onChange={(e) => setSelectedSport(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Tất cả môn thể thao</option>
            {MOCK_CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
          <MapPin className="w-4 h-4 text-neutral-400 shrink-0" strokeWidth={1.5} />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full bg-transparent text-xs font-semibold text-neutral-800 dark:text-neutral-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Tất cả thành phố</option>
            <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
            <option value="Hà Nội">Hà Nội</option>
          </select>
        </div>
      </div>

      {/* Venue List */}
      {filteredVenues.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/50">
          <Trophy className="w-10 h-10 mx-auto text-neutral-400 mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Không tìm thấy sân phù hợp</p>
          <p className="text-xs text-neutral-500 mt-1">Vui lòng thử lại với bộ lọc hoặc từ khóa khác.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => (
            <Card key={venue.id} hoverEffect className="overflow-hidden flex flex-col justify-between">
              <div>
                <div className="h-48 relative overflow-hidden bg-neutral-900">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant="warning" className="bg-white/95 dark:bg-neutral-900/95 font-bold shadow-xs">
                      ★ {venue.rating} ({venue.review_count})
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-neutral-900 dark:text-white line-clamp-1">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{venue.address}, {venue.district}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {venue.amenities?.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium"
                      >
                        {amenity.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </div>

              <div className="p-5 pt-0 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Giá từ</span>
                  <span className="text-sm font-bold font-mono text-sport-600">
                    {formatVND(Math.min(...(venue.courts?.map(c => c.hourly_rate_standard) || [90000])))}/h
                  </span>
                </div>
                <Link href={`/venues/${venue.slug}`}>
                  <Button variant="primary" size="sm" className="text-xs">
                    Xem Lịch Sân
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VenuesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-neutral-400">Đang tải danh sách sân...</div>}>
      <VenuesContent />
    </Suspense>
  );
}