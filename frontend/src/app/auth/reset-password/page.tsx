'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== passwordConfirmation) {
      setErrorMsg('Xác nhận mật khẩu không khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.auth.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });

      if (res.success) {
        router.push('/auth/login?reset=success');
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setErrorMsg((Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Không thể đặt lại mật khẩu.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="shadow-elevated">
            <CardContent className="p-8 text-center space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Liên kết không hợp lệ. Vui lòng yêu cầu liên kết mới từ trang quên mật khẩu.</span>
              </div>
              <Link href="/auth/forgot-password" className="inline-block text-xs font-semibold text-sport-600 hover:underline">
                Yêu cầu liên kết mới
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            Đặt Lại Mật Khẩu
          </h2>
          <p className="text-xs text-neutral-500">
            Nhập mật khẩu mới cho tài khoản <span className="font-semibold">{email}</span>
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" strokeWidth={1.5} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
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
                Đặt Lại Mật Khẩu
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-500">
          <Link href="/auth/login" className="font-semibold text-sport-600 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
