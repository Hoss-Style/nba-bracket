"use client";

import { useState, useRef, type ReactNode, type KeyboardEvent } from "react";

export interface HomeTabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface HomeSectionTabsProps {
  tabs: HomeTabItem[];
  defaultId?: string;
  className?: string;
}

export default function HomeSectionTabs({ tabs, defaultId, className = "" }: HomeSectionTabsProps) {
  const firstId = tabs[0]?.id ?? "";
  const initial =
    defaultId && tabs.some((t) => t.id === defaultId) ? defaultId : firstId;
  const [activeId, setActiveId] = useState(initial);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      const next = (index + dir + tabs.length) % tabs.length;
      setActiveId(tabs[next].id);
      tabRefs.current[next]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveId(tabs[0].id);
      tabRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = tabs.length - 1;
      setActiveId(tabs[last].id);
      tabRefs.current[last]?.focus();
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div className={`home-section-tabs ${className}`.trim()}>
      <div className="home-section-tabs-nav" role="tablist" aria-label="Page sections">
        {tabs.map((tab, i) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`home-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`home-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={`home-section-tab ${selected ? "home-section-tab-active" : ""}`}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`home-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`home-tab-${tab.id}`}
          hidden={tab.id !== activeId}
          className="home-section-tab-panel"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
