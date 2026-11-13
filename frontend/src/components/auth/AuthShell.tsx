'use client';

import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { Basketball } from '@phosphor-icons/react/dist/csr/Basketball';
import { SoccerBall } from '@phosphor-icons/react/dist/csr/SoccerBall';
import { TennisBall } from '@phosphor-icons/react/dist/csr/TennisBall';

const HIGHLIGHTS = [
  'Xác nhận đặt sân ngay sau khi thanh toán',
  'Giữ chỗ bằng mã QR, không cần chờ duyệt',
  'Đồng bộ lịch sân cho khách chơi và chủ sân',
];

type GlyphProps = {
  size: number;
  className?: string;
  style?: React.CSSProperties;
  weight?: 'thin' | 'light' | 'regular';
};

function Shuttlecock({ size, className, style }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden
    >
      <ellipse cx="128" cy="58" rx="56" ry="18" />
      <path d="M84 70 104 178" />
      <path d="M172 70 152 178" />
      <path d="M128 76v102" />
      <path d="M97 124h62" />
      <path d="M101 152h54" />
      <circle cx="128" cy="196" r="28" />
    </svg>
  );
}

const PATTERN: Array<GlyphProps & { top: string; left: string; rotate: number; Icon: React.ComponentType<GlyphProps> }> = [
  { Icon: Basketball, top: '7%', left: '2%', size: 54, rotate: -12 },
  { Icon: TennisBall, top: '38%', left: '7%', size: 34, rotate: 14 },
  { Icon: SoccerBall, top: '66%', left: '2.5%', size: 46, rotate: 8 },
  { Icon: Basketball, top: '90%', left: '12%', size: 32, rotate: 22 },
  { Icon: Shuttlecock, top: '12%', left: '91%', size: 46, rotate: -18 },
  { Icon: SoccerBall, top: '44%', left: '93%', size: 36, rotate: 12 },
  { Icon: TennisBall, top: '78%', left: '88%', size: 52, rotate: -6 },
  { Icon: Shuttlecock, top: '92%', left: '70%', size: 30, rotate: 16 },
  { Icon: SoccerBall, top: '1.5%', left: '24%', size: 30, rotate: 10 },
  { Icon: TennisBall, top: '1%', left: '58%', size: 28, rotate: -14 },
];

export const authInputClass =
  'w-full rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-sport-500 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500';

export const authLabelClass = 'text-xs font-semibold text-neutral-700 dark:text-neutral-300';

export const authFieldErrorClass = 'text-[11px] font-medium text-red-600 dark:text-red-400';

function BrandMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/25">
      <span className="font-display text-lg font-bold leading-none text-emerald-300">S</span>
      <span className="text-xs font-semibold leading-none text-white">Z</span>
    </div>
  );
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden px-4 py-6 sm:px-6 lg:py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {PATTERN.map(({ Icon, ...item }, index) => (
          <Icon
            key={index}
            size={item.size}
            weight="light"
            className="absolute text-neutral-900/[0.09] dark:text-white/[0.09]"
            style={{ left: item.left, top: item.top, transform: `rotate(${item.rotate}deg)` }}
          />
        ))}
      </div>

      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-elevated dark:border-neutral-800 dark:bg-neutral-900 lg:grid lg:grid-cols-[1.02fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-[linear-gradient(158deg,#04231C_0%,#065F46_50%,#0B8A63_100%)] p-10 text-white lg:flex lg:flex-col xl:p-12">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="absolute -right-6 top-10 h-48 w-48 rounded-full border border-white/10" />
            <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>

          <Link href="/" className="relative flex items-center gap-2.5">
            <BrandMark />
            <span className="flex items-center gap-1.5 text-lg font-bold tracking-tight">
              SportZone
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
            </span>
          </Link>

          <div className="relative my-auto py-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
              Đặt sân thể thao trực tuyến
            </p>
            <h2 className="mt-4 max-w-sm font-display text-[2.6rem] font-semibold leading-[1.08] tracking-tight">
              Sân đấu của bạn, chỉ cách một cú nhấp.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-50/80">
              Đặt sân theo giờ, giữ chỗ tức thì và quản lý lịch chơi ở một nơi.
            </p>

            <ul className="mt-8 space-y-3">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-emerald-50/90">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-300/20 text-emerald-200">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-[11px] text-emerald-100/60">
            Thanh toán qua SePay · Bảo vệ bằng Cloudflare Turnstile
          </p>
        </aside>

        <div className="p-6 sm:p-9 lg:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
