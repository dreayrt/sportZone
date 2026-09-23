import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'SportZone — Hệ Thống Quản Lý & Đặt Sân Thể Thao Trực Tuyến',
  description: 'Nền tảng thương mại điện tử đặt sân thể thao chuyên nghiệp hàng đầu. Tìm kiếm sân bóng đá, cầu lông, pickleball, tennis nhanh chóng và thanh toán VietQR tức thì.',
  keywords: ['đặt sân thể thao', 'sân bóng đá', 'sân cầu lông', 'sân pickleball', 'thuê sân tennis', 'SportZone'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className="min-h-[100dvh] flex flex-col bg-[#FAFAFA] text-neutral-900 antialiased font-sans selection:bg-sport-500 selection:text-white">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
