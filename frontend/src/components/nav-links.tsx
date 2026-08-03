"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Search,
  Send,
  Settings,
} from "lucide-react";

type Counts = { leads: number; searches: number; outreach: number };

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, key: "" },
  { href: "/leads", label: "Leads", icon: Users, key: "leads" },
  { href: "/searches", label: "Searches", icon: Search, key: "searches" },
  { href: "/emails", label: "Outreach", icon: Send, key: "outreach" },
  { href: "/settings", label: "Settings", icon: Settings, key: "" },
] as const;

export function NavLinks({
  counts,
  collapsed = false,
  onNavigate,
}: {
  counts: Counts;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const countFor = (key: string): number | null =>
    key === "leads"
      ? counts.leads
      : key === "searches"
        ? counts.searches
        : key === "outreach"
          ? counts.outreach
          : null;

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon, key }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        const count = countFor(key);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
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
  );
}

export function SidebarStatus({ emailReady }: { emailReady: boolean }) {
  return (
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
  );
}
