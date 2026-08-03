export function OutreachWeek({
  stats,
  daily,
}: {
  stats: { waSent: number; emailSent: number; replyRate: number };
  daily: { day: string; wa: number; email: number }[];
}) {
  const max = Math.max(1, ...daily.map((d) => d.wa + d.email));

  return (
    <div>
      <div className="flex flex-wrap gap-8">
        <Stat value={stats.waSent} label="WhatsApp sent" tone="text-emerald-500" />
        <Stat value={stats.emailSent} label="Emails sent" tone="text-blue-500" />
        <Stat
          value={`${stats.replyRate}%`}
          label="Reply rate"
          tone="text-foreground"
        />
      </div>

      <div className="mt-5 flex h-28 items-end gap-1.5">
        {daily.map((d, i) => {
          const waH = (d.wa / max) * 100;
          const emH = (d.email / max) * 100;
          return (
            <div
              key={i}
              className="flex h-full flex-1 flex-col justify-end"
              title={`${d.day}: ${d.wa} WhatsApp, ${d.email} email`}
            >
              {d.wa > 0 && (
                <div
                  className="rounded-t-sm bg-blue-500"
                  style={{ height: `${Math.max(waH, 3)}%` }}
                />
              )}
              {d.email > 0 && (
                <div
                  className={`bg-emerald-500 ${d.wa > 0 ? "" : "rounded-t-sm"}`}
                  style={{ height: `${Math.max(emH, 3)}%` }}
                />
              )}
              {d.wa === 0 && d.email === 0 && (
                <div className="h-1 rounded-sm bg-muted" />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>14 days ago</span>
        <span>today</span>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  tone,
}: {
  value: number | string;
  label: string;
  tone: string;
}) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${tone}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
