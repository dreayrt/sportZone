'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Check, MapPin, Users, X } from 'lucide-react';
import { api, MatchPostItem } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatDate, formatVND } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const skillLabels: Record<MatchPostItem['skill_level'], string> = {
  all: 'Mọi trình độ',
  beginner: 'Mới chơi',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const matchId = Number(params.id);
  const [match, setMatch] = useState<MatchPostItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadMatch = useCallback(async () => {
    if (!Number.isInteger(matchId) || matchId < 1) {
      setError('Mã kèo không hợp lệ.');
      setIsLoading(false);
      return;
    }

    const response = await api.matches.get(matchId);
    if (response.success) {
      setMatch(response.data);
      setError('');
    } else {
      setError(response.message || 'Không tải được thông tin kèo.');
    }
    setIsLoading(false);
  }, [matchId]);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

  const runAction = async (action: () => Promise<{ success: boolean; message: string }>) => {
    setIsSubmitting(true);
    setError('');
    const response = await action();
    if (!response.success) {
      setError(response.message || 'Thao tác chưa thực hiện được.');
    } else {
      setMessage(response.message);
      await loadMatch();
    }
    setIsSubmitting(false);
  };

  const joinMatch = () => {
    if (!user) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/matches/${matchId}`)}`);
      return;
    }
    runAction(() => api.matches.join(matchId));
  };

  if (isLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-neutral-500">Đang tải thông tin kèo...</div>;
  }

  if (!match) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p role="alert" className="text-sm text-red-600">{error || 'Không tìm thấy kèo này.'}</p>
        <Link href="/matches" className="text-sm font-medium text-sport-600">Quay lại cộng đồng ghép kèo</Link>
      </div>
    );
  }

  const isCreator = Boolean(match.is_creator || match.user_id === user?.id);
  const application = match.my_application;
  const location = match.venue?.name || match.location_note || 'Chưa ghi địa điểm';
  const pendingMembers = match.pending_members || [];
  const acceptedMembers = match.accepted_members || [];
  const memberLimit = match.required_members + 1;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link href="/matches" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" />Quay lại danh sách kèo
      </Link>

      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <p className="text-xs font-semibold uppercase tracking-wide text-sport-600">{match.sport_category?.name || 'Thể thao'}</p>
              <CardTitle className="text-2xl">{match.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {match.description && <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap">{match.description}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3"><CalendarDays className="w-4 h-4 mt-0.5 text-sport-600" /><div><p className="text-neutral-500">Thời gian</p><p className="mt-0.5 font-medium">{formatDate(match.match_date)} · {match.start_time.slice(0, 5)}–{match.end_time.slice(0, 5)}</p></div></div>
                <div className="flex items-start gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3"><MapPin className="w-4 h-4 mt-0.5 text-sport-600" /><div><p className="text-neutral-500">Địa điểm</p><p className="mt-0.5 font-medium">{location}{match.venue?.city ? `, ${match.venue.city}` : ''}</p></div></div>
                <div className="flex items-start gap-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3"><Users className="w-4 h-4 mt-0.5 text-sport-600" /><div><p className="text-neutral-500">Số người</p><p className="mt-0.5 font-medium">{match.current_members}/{memberLimit} người</p></div></div>
                <div className="rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-3"><p className="text-neutral-500">Trình độ · chi phí</p><p className="mt-0.5 font-medium">{skillLabels[match.skill_level]} · {match.estimated_cost_per_person ? `${formatVND(match.estimated_cost_per_person)}/người` : 'Chưa xác định'}</p></div>
              </div>
              <p className="text-xs text-neutral-500">Người đăng: {match.creator?.full_name || 'Thành viên SportZone'}</p>
            </CardContent>
          </Card>

          {acceptedMembers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Thành viên đã được duyệt</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {acceptedMembers.map((member) => <span key={member.id} className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs">{member.user.full_name}</span>)}
              </CardContent>
            </Card>
          )}

          {isCreator && pendingMembers.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Yêu cầu đang chờ duyệt</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {pendingMembers.map((member) => (
                  <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 last:border-0 pb-3 last:pb-0">
                    <div><p className="text-sm font-medium">{member.user.full_name}</p>{member.message && <p className="mt-1 text-xs text-neutral-500">{member.message}</p>}</div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="primary" disabled={isSubmitting} onClick={() => runAction(() => api.matches.accept(matchId, member.id))}><Check className="w-3.5 h-3.5 mr-1" />Duyệt</Button>
                      <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => runAction(() => api.matches.reject(matchId, member.id))}><X className="w-3.5 h-3.5 mr-1" />Từ chối</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader><CardTitle className="text-base">Tham gia kèo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm"><span className="text-neutral-500">Trạng thái</span><strong>{match.status === 'open' ? 'Đang mở' : match.status === 'full' ? 'Đã đủ người' : match.status === 'cancelled' ? 'Đã hủy' : 'Đã kết thúc'}</strong></div>
            {isCreator ? (
              <p className="text-xs leading-5 text-neutral-500">Đây là kèo bạn đã đăng. Các yêu cầu tham gia sẽ xuất hiện ở danh sách bên cạnh.</p>
            ) : application?.status === 'accepted' ? (
              <div className="space-y-3"><p className="text-sm text-emerald-700">Bạn đã được duyệt tham gia kèo này.</p><Button variant="outline" className="w-full" disabled={isSubmitting} onClick={() => runAction(() => api.matches.leave(matchId))}>Rút khỏi kèo</Button></div>
            ) : application?.status === 'pending' ? (
              <div className="space-y-3"><p className="text-sm text-amber-700">Yêu cầu của bạn đang chờ chủ kèo duyệt.</p><Button variant="outline" className="w-full" disabled={isSubmitting} onClick={() => runAction(() => api.matches.leave(matchId))}>Rút yêu cầu</Button></div>
            ) : match.status === 'open' ? (
              <Button variant="primary" className="w-full" disabled={isSubmitting} onClick={joinMatch}>Xin tham gia kèo</Button>
            ) : (
              <p className="text-xs text-neutral-500">Kèo hiện không nhận thêm thành viên.</p>
            )}
            {match.contact_phone && <p className="text-xs text-neutral-500">Số liên hệ do người đăng cung cấp: <strong>{match.contact_phone}</strong></p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
