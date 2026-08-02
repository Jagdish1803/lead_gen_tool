"use client";

import { useEffect, useState } from "react";
import { Radio, PanelLeftClose, PanelLeft } from "lucide-react";
import { NavLinks, SidebarStatus } from "@/components/nav-links";

export function Sidebar({
  counts,
  emailReady,
}: {
  counts: { leads: number; searches: number; outreach: number };
  emailReady: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
  }

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r bg-sidebar py-4 md:flex ${
        collapsed ? "w-16 px-2" : "w-60 px-3"
      }`}
    >
      <div className="flex items-center gap-2 px-2 pb-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Radio className="size-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight">
            Pitching Tool
          </span>
        )}
      </div>

      <NavLinks counts={counts} collapsed={collapsed} />

      <div className="mt-auto flex flex-col gap-2 px-2">
        {!collapsed && <SidebarStatus emailReady={emailReady} />}
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {collapsed ? (
            <PanelLeft className="size-3.5" />
          ) : (
            <>
              <PanelLeftClose className="size-3.5" /> Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
