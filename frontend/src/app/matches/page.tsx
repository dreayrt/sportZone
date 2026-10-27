'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { api, MatchPostItem } from '@/lib/api';
import { MatchPostCard } from '@/components/matches/MatchPostCard';
import { Button } from '@/components/ui/Button';

interface SportCategoryOption {
  id: number;
  name: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchPostItem[]>([]);
  const [categories, setCategories] = useState<SportCategoryOption[]>([]);
  const [sportCategoryId, setSportCategoryId] = useState('');
  const [city, setCity] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [date, setDate] = useState('');
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    const response = await api.sportCategories.getAll();
    if (response.success) {
      const data = Array.isArray(response.data) ? response.data : response.data?.data;
      setCategories(data || []);
    }
  };

  const loadMatches = async () => {
    setIsLoading(true);
    setError('');
    const params: Record<string, string> = {};
    if (sportCategoryId) params.sport_category_id = sportCategoryId;
    if (city.trim()) params.city = city.trim();
    if (skillLevel) params.skill_level = skillLevel;
    if (date) params.date = date;
    if (keyword.trim()) params.keyword = keyword.trim();

    const response = await api.matches.list(params);
    if (response.success) {
      setMatches(response.data?.data || []);
    } else {
      setError(response.message || 'Không tải được danh sách kèo.');
      setMatches([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategories();
    loadMatches();
  }, []);

  const submitFilters = (event: React.FormEvent) => {
    event.preventDefault();
    loadMatches();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sport-600 dark:text-sport-400">Cộng đồng thể thao</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">Tìm người chơi cùng</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">Khám phá kèo đang mở hoặc đăng bài tìm thêm đồng đội.</p>
        </div>
        <Link href="/matches/new">
          <Button variant="primary" className="gap-2"><Plus className="w-4 h-4" />Đăng kèo mới</Button>
        </Link>
      </div>

      <form onSubmit={submitFilters} className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <label className="md:col-span-2">
          <span className="sr-only">Từ khóa</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Tìm theo tiêu đề, địa điểm..." className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
          </div>
        </label>
        <select value={sportCategoryId} onChange={(event) => setSportCategoryId(event.target.value)} className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm">
          <option value="">Tất cả môn</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Khu vực / thành phố" className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
        <select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)} className="px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm">
          <option value="">Mọi trình độ</option>
          <option value="beginner">Mới chơi</option>
          <option value="intermediate">Trung bình</option>
          <option value="advanced">Nâng cao</option>
        </select>
        <div className="flex gap-2">
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Ngày chơi" className="min-w-0 flex-1 px-2 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm" />
          <Button type="submit" variant="secondary" aria-label="Lọc kèo"><SlidersHorizontal className="w-4 h-4" /></Button>
        </div>
      </form>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {isLoading ? (
        <div className="py-16 text-center text-sm text-neutral-500">Đang tải các kèo đang mở...</div>
      ) : matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {matches.map((match) => <MatchPostCard key={match.id} match={match} />)}
        </div>
      ) : (
        <div className="py-16 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">Chưa có kèo phù hợp</p>
          <p className="mt-1 text-sm text-neutral-500">Thử đổi bộ lọc hoặc đăng kèo để tìm người chơi cùng.</p>
        </div>
      )}
    </div>
  );
}
