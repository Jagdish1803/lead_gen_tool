import Link from "next/link";
import { Send } from "lucide-react";
import { getShellData } from "@/lib/queries";
import { Sidebar } from "@/components/sidebar";
import { MobileMenu } from "@/components/mobile-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandPalette } from "@/components/command-palette";

export async function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { counts, emailReady } = await getShellData();

  return (
    <div className="flex min-h-screen">
      <Sidebar counts={counts} emailReady={emailReady} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <MobileMenu counts={counts} emailReady={emailReady} />
          {title && (
            <div className="flex items-baseline gap-3">
              <span className="text-base font-semibold">{title}</span>
              {subtitle && (
                <span className="hidden text-sm text-muted-foreground lg:inline">
                  {subtitle}
                </span>
              )}
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <CommandPalette />
            <Link
              href="/leads"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Send className="size-3.5" />
              <span className="hidden sm:inline">Compose outreach</span>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
