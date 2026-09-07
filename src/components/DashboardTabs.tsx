import React, { useRef, useEffect, useState } from "react";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface DashboardTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const DashboardTabs = ({ tabs, activeTab, onTabChange }: DashboardTabsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  useEffect(() => {
    if (containerRef.current) {
      const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);

      // Only select buttons, ignore indicator div
      const tabButtons = Array.from(
        containerRef.current.querySelectorAll("button")
      ) as HTMLElement[];

      const activeButton = tabButtons[activeIndex];

      if (activeButton) {
        setIndicatorStyle({
          left: activeButton.offsetLeft,
          width: activeButton.offsetWidth,
        });
      }
    }
  }, [activeTab, tabs]);

  return (
    <div className="flex items-center justify-center mb-8 px-2">
      <div
        ref={containerRef}
        className="relative bg-gray-100 rounded-full p-1 flex overflow-x-auto no-scrollbar max-w-full"
      >
        {/* Indicator */}
        <div
          className="absolute top-1 bottom-1 bg-primary rounded-full transition-all duration-300 ease-in-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />

        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative z-10 px-3 sm:px-6 py-2 sm:py-3 text-[11px] sm:text-sm font-medium transition-all duration-300 whitespace-nowrap rounded-full ${
              activeTab === tab.id
                ? "text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 1 && (
              <span
                className={`ml-1 sm:ml-2 text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardTabs;
