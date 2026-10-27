import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin, Users } from 'lucide-react';
import { MatchPostItem } from '@/lib/api';
import { formatDate, formatVND } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

const skillLabels: Record<MatchPostItem['skill_level'], string> = {
  all: 'Mọi trình độ',
  beginner: 'Mới chơi',
  intermediate: 'Trung bình',
  advanced: 'Nâng cao',
};

interface MatchPostCardProps {
  match: MatchPostItem;
}

export function MatchPostCard({ match }: MatchPostCardProps) {
  const memberLimit = match.required_members + 1;
  const location = match.venue?.name || match.location_note || 'Chưa ghi địa điểm';

  return (
    <Link href={`/matches/${match.id}`} className="block h-full">
      <Card hoverEffect className="h-full">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sport-600 dark:text-sport-400">
                {match.sport_category?.name || 'Thể thao'}
              </p>
              <h2 className="mt-1 font-semibold text-neutral-900 dark:text-white line-clamp-2">{match.title}</h2>
            </div>
            <Badge variant={match.status === 'open' ? 'success' : 'warning'}>
              {match.status === 'open' ? 'Đang tìm người' : 'Đã đủ người'}
            </Badge>
          </div>

          <div className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400">
            <p className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 shrink-0" />{formatDate(match.match_date)} · {match.start_time.slice(0, 5)}–{match.end_time.slice(0, 5)}</p>
            <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{location}{match.venue?.city ? `, ${match.venue.city}` : ''}</span></p>
            <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5 shrink-0" />{match.current_members}/{memberLimit} người · {skillLabels[match.skill_level]}</p>
          </div>

          <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800 pt-3 text-xs">
            <span className="text-neutral-500">Chi phí dự kiến</span>
            <span className="font-semibold text-neutral-900 dark:text-white">
              {match.estimated_cost_per_person ? `${formatVND(match.estimated_cost_per_person)}/người` : 'Chưa xác định'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>{match.creator?.full_name ? `Đăng bởi ${match.creator.full_name}` : 'Xem chi tiết kèo'}</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
