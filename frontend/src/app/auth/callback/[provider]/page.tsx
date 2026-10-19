'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { api, setStoredToken } from '@/lib/api';
import { getDashboardByRole, consumePendingRedirect } from '@/lib/auth-redirect';
import { Card, CardContent } from '@/components/ui/Card';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function SocialCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [errorMsg, setErrorMsg] = useState('');

  const provider = params.provider as string;

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        setErrorMsg(decodeURIComponent(error));
        return;
      }

      if (!token) {
        setErrorMsg('Không nhận được token xác thực từ máy chủ.');
        return;
      }

      // Lưu token tạm, sau đó lấy thông tin user
      setStoredToken(token);
      if (typeof window !== 'undefined') {
        localStorage.setItem('sz_auth_token', token);
      }

      try {
        const res = await api.auth.me();
        if (res.success && res.data) {
          login(token, res.data);
          router.push(consumePendingRedirect() || getDashboardByRole(res.data.role));
        } else {
          setErrorMsg('Không thể lấy thông tin tài khoản.');
        }
      } catch {
        setErrorMsg('Không thể kết nối đến máy chủ backend.');
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="shadow-elevated">
          <CardContent className="p-8 text-center space-y-4">
            {errorMsg ? (
              <>
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                <Link
                  href="/auth/login"
                  className="inline-block text-xs font-semibold text-sport-600 hover:underline"
                >
                  Quay lại trang đăng nhập
                </Link>
              </>
            ) : (
              <>
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-sport-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
                  Đang đăng nhập bằng {provider === 'google' ? 'Google' : 'Facebook'}...
                </h2>
                <p className="text-xs text-neutral-500">
                  Vui lòng đợi trong giây lát, đang xác thực tài khoản của bạn.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
