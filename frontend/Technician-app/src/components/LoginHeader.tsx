'use client';

import React from 'react';

export const LoginHeader = () => {
  return (
    <div className="text-center mb-6">
      <div className="w-14 h-14 bg-sky-800 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl shadow-md mb-3">
        🛠️
      </div>
      <h1 className="text-xl font-extrabold text-sky-900 tracking-tight">
        FieldService Pro
      </h1>
      <p className="text-xs text-slate-500 font-medium mt-1">
        Cổng thông tin Kỹ thuật viên
      </p>
    </div>
  );
};