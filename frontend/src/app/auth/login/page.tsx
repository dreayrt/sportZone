'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, AlertCircle, ShieldCheck, Building2, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [loginField, setLoginField] = useState('minhanh@example.com');
  const [password, setPassword] = useState('password');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        const role = res.data.user.role;
        if (role === 'admin') router.push('/dashboard/admin');
        else if (role === 'owner') router.push('/dashboard/owner');
        else router.push('/dashboard/customer');
      } else {
        setErrorMsg(res.message || 'Thông tin đăng nhập không chính xác.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
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
                  <span className="text-[11px] text-neutral-400 hover:text-neutral-600 cursor-pointer">
                    Quên mật khẩu?
                  </span>
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
          <Link href="/auth/register" className="font-semibold text-sport-600 hover:underline">
            Đăng ký tham gia ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
