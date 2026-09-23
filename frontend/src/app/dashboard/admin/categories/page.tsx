'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_CATEGORIES, SportCategory } from '@/lib/mock-data';
import { Plus, Edit2, CircleDot } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<SportCategory[]>(MOCK_CATEGORIES);

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Danh Mục Môn Thể Thao"
        description="Định cấu hình các bộ môn hỗ trợ đặt sân trên hệ thống SportZone."
        actions={
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Thêm Môn Mới
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Card key={cat.id} hoverEffect className="overflow-hidden">
              <div className="h-32 relative overflow-hidden bg-neutral-900">
                <img
                  src={cat.banner_image}
                  alt={cat.name}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-3 left-4 text-white">
                  <span className="font-mono text-[10px] uppercase font-bold text-sport-400 block">
                    Code: {cat.code}
                  </span>
                  <h4 className="font-bold text-base">{cat.name}</h4>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                <p className="text-xs text-neutral-500 line-clamp-2">
                  {cat.description}
                </p>
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400">
                    Sân hoạt động: <strong className="text-neutral-800 dark:text-neutral-200">{cat.court_count || 12}</strong>
                  </span>
                  <Button variant="outline" size="sm" className="h-6 text-[11px] px-2 gap-1">
                    <Edit2 className="w-3 h-3" />
                    Sửa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
