"use client";

import { useEffect, useState } from "react";
import { Menu, X, Radio } from "lucide-react";
import { NavLinks, SidebarStatus } from "@/components/nav-links";

export function MobileMenu({
  counts,
  emailReady,
}: {
  counts: { leads: number; searches: number; outreach: number };
  emailReady: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="size-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col border-r bg-sidebar px-3 py-4 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-2 pb-5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Radio className="size-4" />
                </div>
                <span className="text-sm font-semibold tracking-tight">
                  Pitching Tool
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <NavLinks
              counts={counts}
              onNavigate={() => setOpen(false)}
            />

            <div className="mt-auto px-2">
              <SidebarStatus emailReady={emailReady} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
