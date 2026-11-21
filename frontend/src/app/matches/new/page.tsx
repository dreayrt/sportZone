'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Clock, MapPin, Minus, Phone, Plus, Users, Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';

interface SportCategoryOption {
  id: number;
  name: string;
}

const SKILLS = [
  { value: 'all', label: 'Mọi trình độ' },
  { value: 'beginner', label: 'Mới chơi' },
  { value: 'intermediate', label: 'Trung bình' },
  { value: 'advanced', label: 'Nâng cao' },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Section({ step, title, desc, children }: { step: number; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sport-600 text-sm font-bold text-white">{step}</span>
        <div>
          <h2 className="text-base font-semibold leading-8">{title}</h2>
          <p className="text-sm text-neutral-500 -mt-1">{desc}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function formatDate(value: string): string {
  if (!value) return '--';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
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

  const inputClass =
    'w-full h-11 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-sm placeholder:text-neutral-400 transition focus:outline-none focus:border-sport-500 focus:ring-2 focus:ring-sport-500/20';
  const iconInputClass = `${inputClass} pl-10`;
  const iconClass = 'absolute left-3 top-3 h-5 w-5 text-neutral-400 pointer-events-none';
  const members = Math.min(50, Math.max(1, Number(requiredMembers) || 1));
  const sportName = categories.find((c) => String(c.id) === sportCategoryId)?.name;
  const skillLabel = SKILLS.find((s) => s.value === skillLevel)?.label;
  const costText = estimatedCost ? `${Number(estimatedCost).toLocaleString('vi-VN')}đ / người` : 'Chưa rõ';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <Link href="/matches" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" />
        Quay lại cộng đồng
      </Link>
      <div className="mt-4 mb-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-sport-600">Cộng đồng SportZone</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">Đăng bài tìm người chơi</h1>
        <p className="mt-1 text-sm text-neutral-500">Điền thời gian, địa điểm và số người bạn muốn tìm thêm.</p>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="space-y-5">
          <Section step={1} title="Thông tin kèo" desc="Tiêu đề, môn chơi và trình độ mong muốn">
            <Field label="Tiêu đề" required>
              <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ví dụ: Tìm thêm 2 người đánh cầu lông tối thứ Sáu" className={inputClass} />
            </Field>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                Môn thể thao <span className="text-red-500">*</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = String(c.id) === sportCategoryId;
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSportCategoryId(String(c.id))}
                      aria-pressed={active}
                      className={`px-4 h-10 rounded-full border text-sm font-medium transition ${active ? 'bg-sport-600 border-sport-600 text-white shadow-sm' : 'border-neutral-200 dark:border-neutral-700 hover:border-sport-400'}`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-sm font-medium">Trình độ</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800">
                {SKILLS.map((s) => (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => setSkillLevel(s.value)}
                    aria-pressed={skillLevel === s.value}
                    className={`h-9 rounded-lg text-sm font-medium transition ${skillLevel === s.value ? 'bg-white dark:bg-neutral-950 shadow-sm text-sport-700' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section step={2} title="Thời gian & địa điểm" desc="Khi nào và gặp nhau ở đâu">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Ngày chơi" required>
                <div className="relative">
                  <CalendarDays className={iconClass} />
                  <input required type="date" min={getToday()} value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className={iconInputClass} />
                </div>
              </Field>
              <Field label="Bắt đầu" required>
                <div className="relative">
                  <Clock className={iconClass} />
                  <input required type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={iconInputClass} />
                </div>
              </Field>
              <Field label="Kết thúc" required>
                <div className="relative">
                  <Clock className={iconClass} />
                  <input required type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={iconInputClass} />
                </div>
              </Field>
            </div>
            <Field label="Địa điểm hoặc ghi chú" required>
              <div className="relative">
                <MapPin className={iconClass} />
                <input required maxLength={255} value={locationNote} onChange={(e) => setLocationNote(e.target.value)} placeholder="Tên sân, khu vực hoặc địa chỉ hẹn" className={iconInputClass} />
              </div>
            </Field>
          </Section>

          <Section step={3} title="Người chơi & liên hệ" desc="Số người cần tìm, chi phí và cách liên hệ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-sm font-medium">
                  Số người cần tìm thêm <span className="text-red-500">*</span>
                </span>
                <div className="flex items-center h-11 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                  <button type="button" aria-label="Giảm" onClick={() => setRequiredMembers(String(Math.max(1, members - 1)))} className="h-full w-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    required
                    type="number"
                    min={1}
                    max={50}
                    value={requiredMembers}
                    onChange={(e) => setRequiredMembers(e.target.value)}
                    className="h-full flex-1 min-w-0 text-center text-sm font-semibold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button type="button" aria-label="Tăng" onClick={() => setRequiredMembers(String(Math.min(50, members + 1)))} className="h-full w-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Field label="Chi phí dự kiến mỗi người">
                <div className="relative">
                  <Wallet className={iconClass} />
                  <input type="number" min={0} value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} placeholder="Để trống nếu chưa rõ" className={`${iconInputClass} pr-8`} />
                  <span className="absolute right-3 top-3 text-sm text-neutral-400">đ</span>
                </div>
              </Field>
            </div>
            <Field label="Số điện thoại liên hệ">
              <div className="relative">
                <Phone className={iconClass} />
                <input maxLength={20} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Số điện thoại để người chơi liên hệ" className={iconInputClass} />
              </div>
            </Field>
            <Field label="Mô tả thêm">
              <textarea maxLength={2000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Trình độ, dụng cụ cần chuẩn bị hoặc lưu ý khác" className={`${inputClass} h-auto py-3 resize-y`} />
            </Field>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-24 space-y-4">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
            <div className="bg-sport-600 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-white">Xem trước bài đăng</div>
            <div className="p-5 space-y-3">
              <h3 className="font-semibold leading-snug break-words">{title.trim() || 'Tiêu đề bài đăng'}</h3>
              <div className="flex flex-wrap gap-1.5">
                {sportName && <span className="rounded-full bg-sport-50 text-sport-700 px-2.5 py-1 text-xs font-medium">{sportName}</span>}
                <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium">{skillLabel}</span>
              </div>
              <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
                <li className="flex gap-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400" />
                  {formatDate(matchDate)} · {startTime} - {endTime}
                </li>
                <li className="flex gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400" />
                  <span className="break-words min-w-0">{locationNote.trim() || 'Chưa có địa điểm'}</span>
                </li>
                <li className="flex gap-2">
                  <Users className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400" />
                  Cần thêm {members} người
                </li>
                <li className="flex gap-2">
                  <Wallet className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400" />
                  {costText}
                </li>
              </ul>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/matches" className="shrink-0">
              <Button type="button" variant="outline" className="h-11">Hủy</Button>
            </Link>
            <Button type="submit" variant="primary" className="h-11 flex-1" disabled={isSubmitting || !sportCategoryId}>
              {isSubmitting ? 'Đang đăng...' : 'Đăng kèo'}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
