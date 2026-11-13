'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSafeRedirect, getDashboardByRole, getRequiredRoleForPath, savePendingRedirect } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Building2, Info, Lock, Mail, Phone, User } from 'lucide-react';
import { FacebookLogo } from '@phosphor-icons/react/dist/csr/FacebookLogo';
import { GoogleLogo } from '@phosphor-icons/react/dist/csr/GoogleLogo';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { AuthShell, authFieldErrorClass, authInputClass, authLabelClass } from '@/components/auth/AuthShell';
import { cn } from '@/lib/utils';

const PHONE_RE = /^(0|\+84)\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STRENGTH_LABELS = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];

function getStrength(value: string) {
  if (!value) return 0;

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  return Math.min(score, 4);
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={authLabelClass}>
        {label}
      </label>
      <div className="relative">
        <Lock
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          strokeWidth={1.75}
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          required
          minLength={8}
          maxLength={72}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${authInputClass} pl-9 pr-14`}
        />
        <button
          type="button"
          onClick={() => setVisible((state) => !state)}
          aria-label={visible ? `Ẩn ${label.toLowerCase()}` : `Hiện ${label.toLowerCase()}`}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[11px] font-semibold text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
        >
          {visible ? 'Ẩn' : 'Hiện'}
        </button>
      </div>
      {error && <p role="alert" className={authFieldErrorClass}>{error}</p>}
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const redirectPath = getSafeRedirect(searchParams.get('redirect'));

  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const strength = getStrength(password);

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const normalizedPhone = phone.replace(/[\s.-]/g, '');

    if (fullName.trim().length < 2) {
      errors.full_name = 'Họ và tên phải có ít nhất 2 ký tự.';
    }
    if (!PHONE_RE.test(normalizedPhone)) {
      errors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678 hoặc +84912345678).';
    }
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      errors.email = 'Địa chỉ email không đúng định dạng.';
    }
    if (password.length < 8) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }
    if (password !== passwordConfirm) {
      errors.password_confirmation = 'Xác nhận mật khẩu không khớp.';
    }
    if (!captchaToken) {
      errors.captcha = 'Vui lòng xác nhận captcha.';
    }

    return errors;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.register({
        full_name: fullName.trim(),
        phone: phone.replace(/[\s.-]/g, ''),
        email: email.trim() || undefined,
        password,
        password_confirmation: passwordConfirm,
        role,
        'cf-turnstile-response': captchaToken!,
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);

        const redirectRole = redirectPath ? getRequiredRoleForPath(redirectPath) : null;
        const canUseRedirect = !!redirectPath && (redirectRole === null || redirectRole === role);
        router.push(canUseRedirect ? redirectPath! : getDashboardByRole(role));
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setErrorMsg((Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Không thể đăng ký.');
        setCaptchaToken(null);
        setCaptchaResetKey((key) => key + 1);
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
      setCaptchaToken(null);
      setCaptchaResetKey((key) => key + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setErrorMsg('');
    setIsSocialLoading(provider);
    try {
      const res = await api.auth.getSocialRedirectUrl(provider);
      if (res.success && res.data?.url) {
        savePendingRedirect(redirectPath);
        window.location.href = res.data.url;
      } else {
        setErrorMsg(res.message || `Không thể khởi tạo đăng nhập ${provider}.`);
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <header className="space-y-1.5">
          <h1 className="font-display text-[2rem] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-white">
            Tạo tài khoản
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Chọn vai trò phù hợp để bắt đầu.
          </p>
        </header>

        {redirectPath && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>Tạo tài khoản để tiếp tục đặt sân.</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Chọn vai trò">
          {(
            [
              { value: 'customer', label: 'Khách chơi', icon: User },
              { value: 'owner', label: 'Chủ sân', icon: Building2 },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className={cn(
                'flex h-11 items-center justify-center gap-2 rounded-lg border text-xs font-semibold transition',
                role === value
                  ? 'border-sport-500 bg-sport-50 text-sport-700 ring-1 ring-sport-500/30 dark:bg-sport-950/40 dark:text-sport-300'
                  : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-white'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="full_name" className={authLabelClass}>
              Họ và tên
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.75}
              />
              <input
                id="full_name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                className={`${authInputClass} pl-9`}
              />
            </div>
            {fieldErrors.full_name && <p role="alert" className={authFieldErrorClass}>{fieldErrors.full_name}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className={authLabelClass}>
              Số điện thoại
            </label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.75}
              />
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912 345 678"
                className={`${authInputClass} pl-9`}
              />
            </div>
            {fieldErrors.phone && <p role="alert" className={authFieldErrorClass}>{fieldErrors.phone}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className={authLabelClass}>
              Email <span className="font-normal text-neutral-400">(không bắt buộc)</span>
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.75}
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`${authInputClass} pl-9`}
              />
            </div>
            {fieldErrors.email && <p role="alert" className={authFieldErrorClass}>{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <PasswordField
              id="password"
              label="Mật khẩu"
              value={password}
              onChange={setPassword}
              placeholder="Tối thiểu 8 ký tự"
              autoComplete="new-password"
              error={fieldErrors.password}
            />
            {password.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'h-1 flex-1 rounded-full transition-colors',
                        step <= strength
                          ? strength <= 1
                            ? 'bg-red-500'
                            : strength === 2
                              ? 'bg-amber-500'
                              : strength === 3
                                ? 'bg-sport-400'
                                : 'bg-sport-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      )}
                    />
                  ))}
                </div>
                <span className="w-16 text-right text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {STRENGTH_LABELS[strength]}
                </span>
              </div>
            )}
          </div>

          <PasswordField
            id="password_confirmation"
            label="Xác nhận mật khẩu"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            error={fieldErrors.password_confirmation}
          />

          {role === 'owner' && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>Cơ sở sân tạo mới sẽ ở trạng thái chờ duyệt cho đến khi quản trị viên xác nhận.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <TurnstileWidget onVerify={setCaptchaToken} resetKey={captchaResetKey} theme="auto" />
            {fieldErrors.captcha && (
              <p role="alert" className={`text-center ${authFieldErrorClass}`}>{fieldErrors.captcha}</p>
            )}
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full text-sm" isLoading={isLoading}>
            {isLoading ? 'Đang tạo tài khoản…' : role === 'owner' ? 'Tạo tài khoản chủ sân' : 'Tạo tài khoản khách chơi'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Hoặc đăng ký với</span>
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'google', label: 'Google', Icon: GoogleLogo },
                { id: 'facebook', label: 'Facebook', Icon: FacebookLogo },
              ] as const
            ).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                disabled={isSocialLoading !== null}
                onClick={() => handleSocialLogin(id)}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                <Icon size={16} weight="regular" />
                {isSocialLoading === id ? 'Đang chuyển…' : label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
          Đã có tài khoản?{' '}
          <Link
            href={redirectPath ? `/auth/login?redirect=${encodeURIComponent(redirectPath)}` : '/auth/login'}
            className="font-semibold text-sport-600 hover:underline dark:text-sport-400"
          >
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
