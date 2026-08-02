"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Search,
  Send,
  Settings,
  Radio,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

export function Sidebar({
  counts,
  emailReady,
}: {
  counts: { leads: number; searches: number; outreach: number };
  emailReady: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
  }

  const nav = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, count: null },
    { href: "/leads", label: "Leads", icon: Users, count: counts.leads },
    { href: "/searches", label: "Searches", icon: Search, count: counts.searches },
    { href: "/emails", label: "Outreach", icon: Send, count: counts.outreach },
    { href: "/settings", label: "Settings", icon: Settings, count: null },
  ];

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r bg-sidebar py-4 md:flex ${
        collapsed ? "w-16 px-2" : "w-60 px-3"
      }`}
    >
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex flex-col gap-0.5">
        {nav.map(({ href, label, icon: Icon, count }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && (
                <>
                  <span>{label}</span>
                  {count != null && (
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer status + collapse */}
      <div className="mt-auto flex flex-col gap-2 px-2">
        {!collapsed && (
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Supabase connected
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${emailReady ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {emailReady ? "SMTP · WhatsApp ready" : "WhatsApp ready"}
            </div>
          </div>
        )}
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
