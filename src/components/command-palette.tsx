"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  CornerDownLeft,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { NAV } from "@/components/nav-links";
import { parseArea } from "@/components/leads/lead-utils";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  status: string;
}

type Result =
  | { type: "nav"; label: string; href: string; icon: LucideIcon }
  | { type: "lead"; label: string; sub: string; href: string };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsMac(/mac/i.test(navigator.platform));
  }, []);

  // Global ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Load leads on first open; focus + reset.
  useEffect(() => {
    if (open) {
      if (leads.length === 0) {
        fetch("/api/leads/list", { cache: "no-store" })
          .then((r) => r.json())
          .then((d) => d.ok && setLeads(d.leads))
          .catch(() => {});
      }
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
    setQuery("");
    setActive(0);
  }, [open, leads.length]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const nav: Result[] = NAV.filter(
      (n) => !q || n.label.toLowerCase().includes(q),
    ).map((n) => ({
      type: "nav",
      label: n.label,
      href: n.href,
      icon: n.icon,
    }));
    const leadResults: Result[] = q
      ? leads
          .filter(
            (l) =>
              l.name.toLowerCase().includes(q) ||
              (l.phone ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")),
          )
          .slice(0, 8)
          .map((l) => ({
            type: "lead",
            label: l.name,
            sub: parseArea(l.address) || l.phone || l.status,
            href: `/leads/${l.id}`,
          }))
      : [];
    return [...nav, ...leadResults];
  }, [query, leads]);

  useEffect(() => setActive(0), [query]);

  function select(item: Result) {
    router.push(item.href);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) select(results[active]);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent sm:inline-flex"
      >
        <Search className="size-3.5" />
        <span>Jump to…</span>
        <kbd className="rounded border bg-muted px-1 text-[10px]">
          {isMac ? "⌘" : "Ctrl"}K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-popover shadow-2xl">
            <div className="flex items-center gap-2 border-b px-3">
              <Search className="size-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages and leads…"
                className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No matches.
                </li>
              ) : (
                results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => select(r)}
                      onMouseEnter={() => setActive(i)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${
                        i === active ? "bg-accent" : ""
                      }`}
                    >
                      {r.type === "nav" ? (
                        <r.icon className="size-4 text-muted-foreground" />
                      ) : (
                        <Building2 className="size-4 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {r.label}
                        {r.type === "lead" && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.sub}
                          </span>
                        )}
                      </span>
                      {i === active && (
                        <CornerDownLeft className="size-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
