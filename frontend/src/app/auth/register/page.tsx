'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { User, Phone, Mail, Lock, Building2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<'customer' | 'owner'>('customer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await api.auth.register({
        full_name: fullName,
        phone,
        email: email || undefined,
        password,
        role,
      });

      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        if (role === 'owner') router.push('/dashboard/owner');
        else router.push('/dashboard/customer');
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setErrorMsg((Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Không thể đăng ký.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend. Vui lòng kiểm tra lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
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
            Tạo Tài Khoản Mới
          </h2>
          <p className="text-xs text-neutral-500">
            Trở thành thành viên hoặc đối tác quản lý sân thể thao.
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Role Tab Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setRole('customer')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  role === 'customer'
                    ? 'bg-white dark:bg-neutral-900 text-sport-600 dark:text-sport-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Khách Hàng Đặt Sân
              </button>
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  role === 'owner'
                    ? 'bg-white dark:bg-neutral-900 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Chủ Cơ Sở / Cụm Sân
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Họ và tên
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 font-mono bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Email (Không bắt buộc)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full text-xs font-semibold"
                isLoading={isLoading}
              >
                Đăng Ký {role === 'owner' ? 'Tài Khoản Chủ Sân' : 'Tài Khoản Khách Hàng'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-neutral-500">
          Đã có tài khoản?{' '}
          <Link href="/auth/login" className="font-semibold text-sport-600 hover:underline">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
