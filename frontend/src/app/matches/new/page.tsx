'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface SportCategoryOption {
  id: number;
  name: string;
}

function getToday(): string {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function CreateMatchPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [categories, setCategories] = useState<SportCategoryOption[]>([]);
  const [sportCategoryId, setSportCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [matchDate, setMatchDate] = useState(getToday());
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:30');
  const [locationNote, setLocationNote] = useState('');
  const [skillLevel, setSkillLevel] = useState('all');
  const [requiredMembers, setRequiredMembers] = useState('1');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent('/matches/new')}`);
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    api.sportCategories.getAll().then((response) => {
      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : response.data?.data;
        setCategories(data || []);
        if (data?.length) setSportCategoryId(String(data[0].id));
      }
    });
  }, []);

  useEffect(() => {
    if (user?.phone) setContactPhone(user.phone);
  }, [user]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    const response = await api.matches.create({
      title: title.trim(),
      sport_category_id: Number(sportCategoryId),
      match_date: matchDate,
      start_time: startTime,
      end_time: endTime,
      location_note: locationNote.trim() || undefined,
      skill_level: skillLevel,
      required_members: Number(requiredMembers),
      estimated_cost_per_person: estimatedCost ? Number(estimatedCost) : 0,
      contact_phone: contactPhone.trim() || undefined,
      description: description.trim() || undefined,
    });

    if (response.success && response.data) {
      router.push(`/matches/${response.data.id}`);
    } else {
      setError(response.message || 'Chưa đăng được kèo. Vui lòng kiểm tra lại thông tin.');
    }
    setIsSubmitting(false);
  };

  if (isAuthLoading || !user) {
    return <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-neutral-500">Đang kiểm tra đăng nhập...</div>;
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-5">
      <Link href="/matches" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><ArrowLeft className="w-4 h-4" />Quay lại cộng đồng</Link>
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-wide text-sport-600">Cộng đồng SportZone</p>
          <CardTitle className="text-2xl">Đăng bài tìm người chơi</CardTitle>
          <p className="text-sm text-neutral-500">Điền thời gian, địa điểm và số người bạn muốn tìm thêm.</p>
        </CardHeader>
        <CardContent>
          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5"><span className="text-xs font-medium">Tiêu đề *</span><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Tìm thêm 2 người đánh cầu lông tối thứ Sáu" className={inputClass} /></label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-1.5"><span className="text-xs font-medium">Môn thể thao *</span><select required value={sportCategoryId} onChange={(event) => setSportCategoryId(event.target.value)} className={inputClass}><option value="">Chọn môn</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="block space-y-1.5"><span className="text-xs font-medium">Trình độ</span><select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value)} className={inputClass}><option value="all">Mọi trình độ</option><option value="beginner">Mới chơi</option><option value="intermediate">Trung bình</option><option value="advanced">Nâng cao</option></select></label>
              <label className="block space-y-1.5"><span className="text-xs font-medium">Ngày chơi *</span><input required type="date" min={getToday()} value={matchDate} onChange={(event) => setMatchDate(event.target.value)} className={inputClass} /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block space-y-1.5"><span className="text-xs font-medium">Bắt đầu *</span><input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} className={inputClass} /></label><label className="block space-y-1.5"><span className="text-xs font-medium">Kết thúc *</span><input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className={inputClass} /></label></div>
              <label className="block space-y-1.5"><span className="text-xs font-medium">Số người cần tìm thêm *</span><input required type="number" min={1} max={50} value={requiredMembers} onChange={(event) => setRequiredMembers(event.target.value)} className={inputClass} /></label>
              <label className="block space-y-1.5"><span className="text-xs font-medium">Chi phí dự kiến mỗi người (đ)</span><input type="number" min={0} value={estimatedCost} onChange={(event) => setEstimatedCost(event.target.value)} placeholder="Để trống nếu chưa rõ" className={inputClass} /></label>
            </div>
            <label className="block space-y-1.5"><span className="text-xs font-medium">Địa điểm hoặc ghi chú *</span><input required maxLength={255} value={locationNote} onChange={(event) => setLocationNote(event.target.value)} placeholder="Tên sân, khu vực hoặc địa chỉ hẹn" className={inputClass} /></label>
            <label className="block space-y-1.5"><span className="text-xs font-medium">Số điện thoại liên hệ</span><input maxLength={20} value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} className={inputClass} /></label>
            <label className="block space-y-1.5"><span className="text-xs font-medium">Mô tả thêm</span><textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Trình độ, dụng cụ cần chuẩn bị hoặc lưu ý khác" className={inputClass} /></label>
            <div className="flex justify-end gap-2 pt-2"><Link href="/matches"><Button type="button" variant="outline">Hủy</Button></Link><Button type="submit" variant="primary" disabled={isSubmitting || !sportCategoryId}>{isSubmitting ? 'Đang đăng...' : 'Đăng kèo'}</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
