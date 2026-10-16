'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { User, Phone, Mail, Lock, ShieldCheck, Check, Link2, Unlink, AlertCircle, Loader2, Camera } from 'lucide-react';

const SOCIAL_PROVIDERS = [
  { key: 'google', label: 'Google' },
  { key: 'facebook', label: 'Facebook' },
] as const;

type SocialKey = (typeof SOCIAL_PROVIDERS)[number]['key'];

function CustomerProfileContent() {
  const { user, refreshUser } = useAuth();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [linkLoading, setLinkLoading] = useState<SocialKey | null>(null);

  // Form đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Upload avatar
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setAvatarMsg({ type: 'error', text: 'Chỉ chấp nhận ảnh jpeg, png, gif hoặc webp.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Ảnh không được vượt quá 2MB.' });
      return;
    }

    setAvatarMsg(null);
    setIsUploadingAvatar(true);

    try {
      const res = await api.profile.uploadAvatar(file);
      if (res.success) {
        setAvatarMsg({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
        await refreshUser();
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setAvatarMsg({ type: 'error', text: (Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Upload thất bại.' });
      }
    } catch {
      setAvatarMsg({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const avatarInitial = (user?.full_name || 'S').trim().charAt(0).toUpperCase();

  // Đồng bộ form khi user load xong (AuthContext load async)
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Kết quả từ OAuth link callback (?linked= / ?link_error=)
  useEffect(() => {
    const linked = searchParams.get('linked');
    const linkError = searchParams.get('link_error');
    if (linked) {
      setLinkMsg({ type: 'success', text: `Đã liên kết tài khoản ${linked === 'google' ? 'Google' : 'Facebook'} thành công!` });
      refreshUser();
      window.history.replaceState(null, '', window.location.pathname);
    } else if (linkError) {
      setLinkMsg({ type: 'error', text: decodeURIComponent(linkError) });
      window.history.replaceState(null, '', window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setIsSaving(true);

    try {
      const res = await api.profile.update({
        full_name: fullName,
        email: email || null,
        phone: phone || null,
      });

      if (res.success) {
        await refreshUser();
        setSuccessMsg('Cập nhật thông tin hồ sơ thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setErrorMsg((Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Không thể cập nhật.');
      }
    } catch {
      setErrorMsg('Không thể kết nối đến máy chủ backend.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword !== newPasswordConfirmation) {
      setPwMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp.' });
      return;
    }

    setIsChangingPw(true);

    try {
      const res = await api.profile.changePassword({
        current_password: currentPassword || undefined,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      if (res.success) {
        setPwMsg({ type: 'success', text: res.message || 'Đổi mật khẩu thành công!' });
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirmation('');
        await refreshUser();
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        setPwMsg({ type: 'error', text: (Array.isArray(firstError) ? firstError[0] : firstError) || res.message || 'Không thể đổi mật khẩu.' });
      }
    } catch {
      setPwMsg({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setIsChangingPw(false);
    }
  };

  const getLinkedAccount = (provider: SocialKey) =>
    user?.socialAccounts?.find((a) => a.provider === provider);

  const handleLink = async (provider: SocialKey) => {
    setLinkMsg(null);
    setLinkLoading(provider);
    try {
      const res = await api.auth.linkSocial(provider, window.location.pathname);
      if (res.success && res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setLinkMsg({ type: 'error', text: res.message || `Không thể liên kết ${provider}.` });
      }
    } catch {
      setLinkMsg({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setLinkLoading(null);
    }
  };

  const handleUnlink = async (provider: SocialKey) => {
    if (!confirm(`Hủy liên kết tài khoản ${provider === 'google' ? 'Google' : 'Facebook'}?`)) return;
    setLinkMsg(null);
    setLinkLoading(provider);
    try {
      const res = await api.auth.unlinkSocial(provider);
      if (res.success) {
        setLinkMsg({ type: 'success', text: res.message || 'Đã hủy liên kết thành công.' });
        await refreshUser();
      } else {
        setLinkMsg({ type: 'error', text: res.message || 'Không thể hủy liên kết.' });
      }
    } catch {
      setLinkMsg({ type: 'error', text: 'Không thể kết nối đến máy chủ backend.' });
    } finally {
      setLinkLoading(null);
    }
  };

  return (
    <div>
      <DashboardHeader
        title="Hồ Sơ Cá Nhân"
        description="Quản lý thông tin liên hệ và cài đặt bảo mật cho tài khoản SportZone của bạn."
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                Thông Tin Cơ Bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div className="relative shrink-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt="Ảnh đại diện"
                      className="w-16 h-16 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-sport-100 dark:bg-sport-950 flex items-center justify-center text-2xl font-bold text-sport-600 dark:text-sport-400 border border-neutral-200 dark:border-neutral-700">
                      {avatarInitial}
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 min-w-0">
                  <label
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors ${isUploadingAvatar ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    {user?.avatar ? 'Đổi ảnh đại diện' : 'Tải ảnh đại diện'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      disabled={isUploadingAvatar}
                      onChange={handleAvatarChange}
                    />
                  </label>
                  <p className="text-[11px] text-neutral-400">JPG, PNG, GIF hoặc WEBP, tối đa 2MB.</p>
                  {avatarMsg && (
                    <p className={`text-[11px] font-medium ${avatarMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {avatarMsg.text}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Địa chỉ Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
                  Lưu Thay Đổi
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                Tài Khoản Liên Kết
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-neutral-500">
                Liên kết Google hoặc Facebook để đăng nhập nhanh mà không cần mật khẩu. Một tài khoản có thể liên kết nhiều mạng xã hội.
              </p>

              {linkMsg && (
                <div className={`p-3 border text-xs rounded-lg flex items-center gap-2 ${
                  linkMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {linkMsg.type === 'success'
                    ? <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{linkMsg.text}</span>
                </div>
              )}

              <div className="space-y-2">
                {SOCIAL_PROVIDERS.map(({ key, label }) => {
                  const linked = getLinkedAccount(key);
                  const loading = linkLoading === key;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {key === 'google' ? (
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
                            <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
                          </svg>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                            {label}
                          </div>
                          {linked ? (
                            <div className="text-[11px] text-neutral-500 truncate">
                              {linked.provider_name || linked.provider_email || 'Đã liên kết'}
                            </div>
                          ) : (
                            <div className="text-[11px] text-neutral-400">Chưa liên kết</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {linked && <Badge variant="success">Đã liên kết</Badge>}
                        {linked ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 gap-1"
                            disabled={loading}
                            onClick={() => handleUnlink(key)}
                          >
                            {loading
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Unlink className="w-3 h-3 text-red-500" />}
                            Hủy
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs px-2.5 gap-1"
                            disabled={loading}
                            onClick={() => handleLink(key)}
                          >
                            {loading
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Link2 className="w-3 h-3" />}
                            Liên kết
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
                {user?.has_password ? 'Đổi Mật Khẩu' : 'Đặt Mật Khẩu'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!user?.has_password && (
                <p className="text-xs text-neutral-500">
                  Tài khoản của bạn đăng nhập bằng Google/Facebook và chưa có mật khẩu. Đặt mật khẩu để có thêm cách đăng nhập.
                </p>
              )}

              {pwMsg && (
                <div className={`p-3 border text-xs rounded-lg flex items-center gap-2 ${
                  pwMsg.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {pwMsg.type === 'success'
                    ? <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{pwMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {user?.has_password && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        Mật khẩu hiện tại
                      </label>
                      <input
                        type="password"
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Mật khẩu mới
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPasswordConfirmation}
                      onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-sport-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="outline" size="sm" isLoading={isChangingPw}>
                    {user?.has_password ? 'Cập Nhật Mật Khẩu' : 'Đặt Mật Khẩu'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CustomerProfilePage() {
  return (
    <Suspense>
      <CustomerProfileContent />
    </Suspense>
  );
}
