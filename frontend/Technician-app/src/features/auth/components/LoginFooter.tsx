'use client';

import React from 'react';

export const LoginFooter = () => {
  return (
    <div className="space-y-6">
      <p className="text-center text-xs text-slate-500 font-medium">
        Gặp sự cố truy cập?{' '}
        <a href="#" className="text-sky-800 font-bold hover:underline">
          Liên hệ quản trị viên
        </a>
      </p>

      <div className="flex justify-center gap-2 pb-2">
        <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
        <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
        <div className="w-10 h-1 bg-slate-200 rounded-full"></div>
      </div>
    </div>
  );
};