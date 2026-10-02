import React from 'react';

interface TaskTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const TaskTabs = ({ activeTab, setActiveTab }: TaskTabsProps) => {
  const tabs = [
    { id: 'today', label: 'Hôm nay' },
    { id: 'new', label: 'Việc mới' },
    { id: 'doing', label: 'Đang làm' },
    { id: 'done', label: 'Đã hoàn tất' },
  ];

  return (
    <div className="flex border-b border-slate-200 bg-white px-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-xs font-medium text-center transition-colors border-b-2 whitespace-nowrap ${
              isActive
                ? 'border-brand-700 text-brand-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};