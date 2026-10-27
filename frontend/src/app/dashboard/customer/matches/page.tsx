'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { MatchPostCard } from '@/components/matches/MatchPostCard';
import { Button } from '@/components/ui/Button';
import { api, MatchPostItem } from '@/lib/api';

type MatchTab = 'created' | 'joined';

export default function CustomerMatchesPage() {
  const [tab, setTab] = useState<MatchTab>('created');
  const [created, setCreated] = useState<MatchPostItem[]>([]);
  const [joined, setJoined] = useState<MatchPostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const [createdResponse, joinedResponse] = await Promise.all([
        api.matches.myCreated(),
        api.matches.myJoined(),
      ]);
      if (createdResponse.success) setCreated(createdResponse.data?.data || []);
      if (joinedResponse.success) {
        setJoined((joinedResponse.data?.data || []).map((item) => item.match_post).filter(Boolean));
      }
      if (!createdResponse.success || !joinedResponse.success) setError('Không tải được danh sách kèo của bạn.');
      setIsLoading(false);
    };
    load();
  }, []);

  const matches = tab === 'created' ? created : joined;

  return (
    <div>
      <DashboardHeader title="Kèo của tôi" description="Theo dõi các kèo bạn đã đăng và các yêu cầu tham gia." actions={<Link href="/matches/new"><Button size="sm">Đăng kèo</Button></Link>} />
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
          <button onClick={() => setTab('created')} className={`px-3 py-2 text-sm border-b-2 ${tab === 'created' ? 'border-sport-500 text-sport-700' : 'border-transparent text-neutral-500'}`}>Kèo đã đăng ({created.length})</button>
          <button onClick={() => setTab('joined')} className={`px-3 py-2 text-sm border-b-2 ${tab === 'joined' ? 'border-sport-500 text-sport-700' : 'border-transparent text-neutral-500'}`}>Kèo đã xin tham gia ({joined.length})</button>
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {isLoading ? <p className="py-12 text-center text-sm text-neutral-500">Đang tải kèo...</p> : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{matches.map((match) => <MatchPostCard key={match.id} match={match} />)}</div>
        ) : (
          <div className="py-14 text-center rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <p className="font-semibold text-neutral-800 dark:text-neutral-200">Chưa có kèo trong mục này</p>
            <Link href={tab === 'created' ? '/matches/new' : '/matches'} className="mt-3 inline-block text-sm font-medium text-sport-600">{tab === 'created' ? 'Đăng kèo đầu tiên' : 'Tìm kèo để tham gia'}</Link>
          </div>
        )}
      </div>
    </div>
  );
}
