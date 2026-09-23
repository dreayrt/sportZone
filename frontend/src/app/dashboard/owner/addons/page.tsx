'use client';

import React, { useState } from 'react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { MOCK_ADDONS, Addon } from '@/lib/mock-data';
import { formatVND } from '@/lib/utils';
import { Plus, ShoppingBag, Edit2 } from 'lucide-react';

export default function OwnerAddonsPage() {
  const [addons, setAddons] = useState<Addon[]>(MOCK_ADDONS);

  return (
    <div>
      <DashboardHeader
        title="Quản Lý Dịch Vụ & Đồ Uống Đi Kèm"
        description="Quản lý danh mục nước giải khát, thuê vợt, thuê bóng và dịch vụ trọng tài tại cơ sở."
        actions={
          <Button variant="primary" size="sm" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Thêm Mặt Hàng
          </Button>
        }
      />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {addons.map((item) => (
            <Card key={item.id} hoverEffect>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant={item.category === 'drink' ? 'info' : item.category === 'equipment' ? 'sport' : 'warning'}>
                    {item.category === 'drink' ? 'Đồ uống' : item.category === 'equipment' ? 'Dụng cụ' : 'Dịch vụ'}
                  </Badge>
                  <span className="font-mono text-xs text-neutral-400">{item.code}</span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-neutral-900 dark:text-white leading-snug">
                    {item.name}
                  </h4>
                  <p className="text-xs text-neutral-400 mt-0.5">Đơn vị: {item.unit}</p>
                </div>

                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">Đơn giá</span>
                    <span className="font-mono font-bold text-sm text-sport-600">
                      {formatVND(item.price)}
                    </span>
                  </div>
                  {item.stock_quantity !== undefined && (
                    <div className="text-right">
                      <span className="text-[11px] text-neutral-400 block">Tồn kho</span>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                        {item.stock_quantity}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
