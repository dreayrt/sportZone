"use client";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <p className="p-6 text-sm text-neutral-500" role="status">Đang kiểm tra quyền truy cập…</p>;
  if (!user) return <div className="p-6 text-sm">Vui lòng <Link className="font-semibold text-sport-600 underline" href="/auth/login">đăng nhập</Link> bằng tài khoản quản trị viên.</div>;
  if (user.role !== "admin" || user.status !== "active") return <div role="alert" className="p-6 text-sm text-rose-600">Bạn không có quyền truy cập khu vực quản trị. <Link className="underline" href="/">Về trang chủ</Link></div>;
  return <>{children}</>;
}
