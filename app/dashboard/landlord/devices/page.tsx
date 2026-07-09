'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor } from 'lucide-react';

export default function DevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">设备管理</h1>
        <p className="text-muted-foreground mt-1">管理餐饮门店设备资产与维护记录</p>
      </div>

      <div className="flex justify-center">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              功能预告
            </CardTitle>
            <CardDescription>设备管理模块正在开发中</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Monitor className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <p className="text-xl font-semibold text-muted-foreground">功能即将上线</p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                届时将支持设备台账、巡检维护、故障报修等功能
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
