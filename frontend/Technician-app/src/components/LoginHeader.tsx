'use client';

import React from 'react';
import { BrandLockup } from '@h-mobility/ui';

export const LoginHeader = () => {
  return (
    <div className="mb-7">
      <BrandLockup size={44} product="Kỹ thuật viên" />
      <h1 className="mt-7 text-2xl font-bold tracking-tight text-ink">Đăng nhập</h1>
      <p className="mt-1 text-sm text-slate-600">Xem và xử lý các yêu cầu sửa chữa được giao cho bạn.</p>
    </div>
  );
};
