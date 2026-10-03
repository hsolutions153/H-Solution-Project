import React from 'react';

interface TaskTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  /** Number of tasks per tab id, shown next to each label. */
  counts?: Record<string, number>;
}

const TABS = [
  { id: 'today', label: 'Hôm nay' },
  { id: 'new', label: 'Việc mới' },
  { id: 'doing', label: 'Đang làm' },
  { id: 'done', label: 'Hoàn tất' },
];

export const TaskTabs = ({ activeTab, setActiveTab, counts }: TaskTabsProps) => {
  return (
    <div className="sticky top-0 z-10 bg-canvas/95 px-4 pt-3 pb-2 backdrop-blur">
      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-control bg-slate-200/70 p-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts?.[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 rounded-lg px-1 py-2 text-[13px] whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-white font-bold text-brand-700 shadow-card'
                  : 'font-medium text-slate-600 hover:text-ink'
              }`}
            >
              {tab.label}
              {count ? (
                <span
                  className={`min-w-5 rounded-full px-1.5 text-[11px] font-bold tabular-nums leading-5 ${
                    isActive ? 'bg-brand-100 text-brand-700' : 'bg-white/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
