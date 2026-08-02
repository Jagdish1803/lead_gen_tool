import Link from "next/link";
import { LayoutDashboard, Users, Search, Settings, Radio } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/searches", label: "Searches", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar px-4 py-5 md:flex">
        <div className="flex items-center gap-2 px-2 pb-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Radio className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Pitching Tool
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-3 text-xs text-muted-foreground">
          Phase 0 · foundation
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-6">
          <span className="text-sm font-medium md:hidden">Pitching Tool</span>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500" />
              Not connected to Supabase
            </span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
