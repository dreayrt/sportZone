import React from 'react';
import Link from 'next/link';
import { Phone, Mail, Shield, CheckCircle2 } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/60 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center text-white dark:text-neutral-950 font-bold tracking-tighter">
                <span className="text-sport-500 font-bold">S</span>
                <span className="text-xs">Z</span>
              </div>
              <span className="font-bold text-lg text-neutral-900 dark:text-white">SportZone</span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Nền tảng đặt sân thể thao trực tuyến hàng đầu, kết nối người chơi với hơn 500+ cụm sân bóng đá, cầu lông, pickleball và tennis trên toàn quốc.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <CheckCircle2 className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
              <span>Thanh toán VietQR xác nhận tức thì</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Môn Thể Thao
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-500 dark:text-neutral-400">
              <li><Link href="/venues?sport=football" className="hover:text-sport-600 transition-colors">Bóng Đá Mini (Sân 5 & 7)</Link></li>
              <li><Link href="/venues?sport=badminton" className="hover:text-sport-600 transition-colors">Cầu Lông Trong Nhà</Link></li>
              <li><Link href="/venues?sport=pickleball" className="hover:text-sport-600 transition-colors">Pickleball Chuẩn USA</Link></li>
              <li><Link href="/venues?sport=tennis" className="hover:text-sport-600 transition-colors">Quần Vợt Decoturf</Link></li>
              <li><Link href="/venues?sport=basketball" className="hover:text-sport-600 transition-colors">Bóng Rổ Sàn Gỗ 5x5</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Hệ Thống & Đối Tác
            </h4>
            <ul className="space-y-2.5 text-sm text-neutral-500 dark:text-neutral-400">
              <li><Link href="/auth/register?role=owner" className="hover:text-sport-600 transition-colors">Đăng Ký Đối Tác Chủ Sân</Link></li>
              <li><Link href="/dashboard/customer/loyalty" className="hover:text-sport-600 transition-colors">Chương Trình Tích Điểm Thể Thao</Link></li>
              <li><Link href="/dashboard/customer/referral" className="hover:text-sport-600 transition-colors">Mã Giới Thiệu Bạn Bè</Link></li>
              <li><Link href="/terms" className="hover:text-sport-600 transition-colors">Chính Sách Hủy & Hoàn Tiền</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-900 dark:text-white mb-4">
              Hỗ Trợ & Hotline
            </h4>
            <div className="flex items-center gap-2.5 text-sm text-neutral-700 dark:text-neutral-300">
              <Phone className="w-4 h-4 text-sport-500" strokeWidth={1.5} />
              <span className="font-semibold text-base">1900 6868</span>
              <span className="text-xs text-neutral-400">(6:00 - 23:00)</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm text-neutral-500">
              <Mail className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
              <span>hotro@sportzone.local</span>
            </div>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-xs text-neutral-600 dark:text-neutral-400">
                <Shield className="w-3.5 h-3.5 text-sport-500" strokeWidth={1.5} />
                <span>Bảo mật giao dịch theo chuẩn SSL/TLS</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© 2026 SportZone Inc. Toàn bộ bản quyền được bảo hộ.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-neutral-600 dark:hover:text-neutral-300">Quyền riêng tư</Link>
            <Link href="/terms" className="hover:text-neutral-600 dark:hover:text-neutral-300">Điều khoản sử dụng</Link>
            <Link href="/audit" className="hover:text-neutral-600 dark:hover:text-neutral-300">Tính minh bạch</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
