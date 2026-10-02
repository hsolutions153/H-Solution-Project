'use client';

import React from 'react';
import { Globe } from 'lucide-react'; // Import icon Globe

export const LanguageSelector = () => {
  return (
    <div className="flex justify-end pt-2">
      <button 
        type="button" 
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-xs text-slate-700 font-medium transition-colors cursor-pointer"
      >
        <Globe className="size-4 text-slate-600" />
        <span>Tiếng Việt</span>
      </button>
    </div>
  );
};