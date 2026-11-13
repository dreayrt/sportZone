'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSafeRedirect, getDashboardByRole, getRequiredRoleForPath, savePendingRedirect } from '@/lib/auth-redirect';
import { Button } from '@/components/ui/Button';
import { AlertCircle, Info, Lock, Mail } from 'lucide-react';
import { FacebookLogo } from '@phosphor-icons/react/dist/csr/FacebookLogo';
import { GoogleLogo } from '@phosphor-icons/react/dist/csr/GoogleLogo';
import { TurnstileWidget } from '@/components/auth/TurnstileWidget';
import { AuthShell, authFieldErrorClass, authInputClass, authLabelClass } from '@/components/auth/AuthShell';

const PHONE_RE = /^(0|\+84)\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const redirectPath = getSafeRedirect(searchParams.get('redirect'));
  const resetSuccess = searchParams.get('reset') === 'success';

  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const normalizeLogin = (value: string) => {
    const trimmed = value.trim();
    return EMAIL_RE.test(trimmed) ? trimmed : trimmed.replace(/[\s.-]/g, '');
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const normalized = normalizeLogin(loginField);

    if (!normalized) {
      errors.login = 'Vui lòng nhập email hoặc số điện thoại.';
    } else if (normalized.length < 3 || normalized.length > 150) {
      errors.login = 'Email hoặc số điện thoại phải từ 3 đến 150 ký tự.';
    } else if (!EMAIL_RE.test(normalized) && !PHONE_RE.test(normalized)) {
      errors.login = 'Email hoặc số điện thoại không đúng định dạng.';
    }

    if (!password) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (password.length > 255) {
      errors.password = 'Mật khẩu không được vượt quá 255 ký tự.';
    }

    if (captchaRequired && !captchaToken) {
      errors.captcha = 'Vui lòng xác nhận captcha.';
    }

    return errors;
  };

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaResetKey((key) => key + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.login({
        login: normalizeLogin(loginField),
        password,
        ...(captchaRequired && captchaToken ? { 'cf-turnstile-response': captchaToken } : {}),
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);

        const role = res.data.user.role;
        const redirectRole = redirectPath ? getRequiredRoleForPath(redirectPath) : null;
        const canUseRedirect = !!redirectPath && (redirectRole === null || redirectRole === role || role === 'admin');
        router.push(canUseRedirect ? redirectPath! : getDashboardByRole(role));
      } else {
        const needsCaptcha = res.errors?.captcha_required === true;
        setCaptchaRequired(needsCaptcha);
        setErrorMsg(res.message || 'Thông tin đăng nhập không chính xác.');
        resetCaptcha();
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
      resetCaptcha();
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
        // Giữ redirect để dùng sau khi OAuth callback xong
        savePendingRedirect(redirectPath);
        window.location.href = res.data.url;
      } else {
        setErrorMsg(res.message || `Không thể khởi tạo đăng nhập ${provider}. Vui lòng cấu hình OAuth credentials.`);
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
            Đăng nhập
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Tiếp tục đến bảng điều khiển của bạn.
          </p>
        </header>

        {redirectPath && (
          <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>Vui lòng đăng nhập để tiếp tục đặt sân.</span>
          </div>
        )}

        {resetSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Info className="h-4 w-4 shrink-0" />
            <span>Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="login" className={authLabelClass}>
              Email hoặc số điện thoại
            </label>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.75}
              />
              <input
                id="login"
                type="text"
                required
                autoComplete="username"
                maxLength={150}
                value={loginField}
                onChange={(e) => setLoginField(e.target.value)}
                placeholder="name@example.com hoặc 0912 345 678"
                className={`${authInputClass} pl-9`}
              />
            </div>
            {fieldErrors.login && <p role="alert" className={authFieldErrorClass}>{fieldErrors.login}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className={authLabelClass}>
                Mật khẩu
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-[11px] font-medium text-sport-600 hover:underline dark:text-sport-400"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.75}
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                maxLength={255}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${authInputClass} pl-9 pr-14`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-[11px] font-semibold text-neutral-500 transition hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              >
                {showPassword ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
            {fieldErrors.password && <p role="alert" className={authFieldErrorClass}>{fieldErrors.password}</p>}
          </div>

          {captchaRequired && (
            <div className="space-y-1.5">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-900/60">
                <TurnstileWidget onVerify={setCaptchaToken} resetKey={captchaResetKey} />
              </div>
              {fieldErrors.captcha && (
                <p role="alert" className={`text-center ${authFieldErrorClass}`}>{fieldErrors.captcha}</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full text-sm"
            isLoading={isLoading}
          >
            {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Hoặc tiếp tục với</span>
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
          Chưa có tài khoản?{' '}
          <Link
            href={redirectPath ? `/auth/register?redirect=${encodeURIComponent(redirectPath)}` : '/auth/register'}
            className="font-semibold text-sport-600 hover:underline dark:text-sport-400"
          >
            Đăng ký tham gia ngay
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
