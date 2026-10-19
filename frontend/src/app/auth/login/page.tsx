'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { getSafeRedirect, getDashboardByRole, savePendingRedirect } from '@/lib/auth-redirect';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, AlertCircle, ShieldCheck, Building2, User, Info } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const redirectPath = getSafeRedirect(searchParams.get('redirect'));
  const resetSuccess = searchParams.get('reset') === 'success';

  const [loginField, setLoginField] = useState('minhanh@example.com');
  const [password, setPassword] = useState('password');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await api.auth.login({
        login: loginField,
        password,
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        router.push(redirectPath || getDashboardByRole(res.data.user.role));
      } else {
        setErrorMsg(res.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
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

  const fillDemoAccount = (email: string) => {
    setLoginField(email);
    setPassword('password');
    setErrorMsg('');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 font-bold text-lg">
              <span className="text-sport-500 font-extrabold">S</span>
              <span className="text-xs">Z</span>
            </div>
            <span className="font-bold text-xl text-neutral-900 dark:text-white">SportZone</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Đăng Nhập Hệ Thống
          </h2>
          <p className="text-xs text-neutral-500">
            Đăng nhập để vào bảng điều khiển vai trò Khách hàng, Chủ sân hoặc Quản trị viên.
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6 space-y-4">
            {redirectPath && (
              <div className="p-3 bg-sky-50 border border-sky-200 text-sky-700 text-xs rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Vui lòng đăng nhập để tiếp tục đặt sân.</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0" />
                <span>Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Email hoặc Số điện thoại
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
                  <input
                    type="text"
                    required
                    value={loginField}
                    onChange={(e) => setLoginField(e.target.value)}
                    placeholder="VD: minhanh@example.com hoặc 0912345678"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                    Mật khẩu
                  </label>
                  <Link href="/auth/forgot-password" className="text-[11px] text-neutral-400 hover:text-sport-600">
                    Quên mật khẩu?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full text-xs font-semibold py-2.5"
                isLoading={isLoading}
              >
                Đăng Nhập
              </Button>
            </form>

            {/* Social Login */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                <span className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">Hoặc tiếp tục với</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSocialLoading !== null}
                  onClick={() => handleSocialLogin('google')}
                  className="py-2 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isSocialLoading === 'google' ? 'Đang chuyển...' : 'Google'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSocialLoading !== null}
                  onClick={() => handleSocialLogin('facebook')}
                  className="py-2 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
                  </svg>
                  <span>{isSocialLoading === 'facebook' ? 'Đang chuyển...' : 'Facebook'}</span>
                </button>
              </div>
            </div>

            {/* Quick Demo Accounts Selection */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <span className="text-[11px] font-semibold text-neutral-400 block text-center uppercase tracking-wider">
                Điền nhanh tài khoản mẫu (Password: password)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('minhanh@example.com')}
                  className="py-1.5 px-2 rounded-lg border border-neutral-200 text-[11px] hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <User className="w-3 h-3 text-sport-500" strokeWidth={1.5} />
                  <span>Khách Hàng</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('owner1@sportzone.local')}
                  className="py-1.5 px-2 rounded-lg border border-neutral-200 text-[11px] hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <Building2 className="w-3 h-3 text-sky-500" strokeWidth={1.5} />
                  <span>Chủ Sân</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@sportzone.local')}
                  className="py-1.5 px-2 rounded-lg border border-neutral-200 text-[11px] hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900 text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-500" strokeWidth={1.5} />
                  <span>Admin</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-500">
          Chưa có tài khoản?{' '}
          <Link
            href={redirectPath ? `/auth/register?redirect=${encodeURIComponent(redirectPath)}` : '/auth/register'}
            className="font-semibold text-sport-600 hover:underline"
          >
            Đăng ký tham gia ngay
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
