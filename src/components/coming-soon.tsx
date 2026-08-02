import { AppShell } from "@/components/app-shell";

export function ComingSoon({
  title,
  phase,
  children,
}: {
  title: string;
  phase: string;
  children?: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-6xl flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
            {phase}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </AppShell>
  );
}
