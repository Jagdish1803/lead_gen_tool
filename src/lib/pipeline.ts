import "server-only";
import { sql } from "@/lib/db";
import { runAuditor } from "@/lib/auditor";
import { runWriter } from "@/lib/writer";
import { runEmailFinder } from "@/lib/email-finder";
import { runEmailWriter } from "@/lib/email-writer";
import { runEmailSender, isEmailConfigured } from "@/lib/email-sender";

/**
 * Server-side pipeline runner. Runs detached (fire-and-forget) so it keeps
 * going even after the browser tab is closed, as long as the server is up.
 * Progress is kept in a process-global so any request can read it.
 */

export interface PipelineProgress {
  running: boolean;
  stage: string;
  done: number;
  total: number;
  note: string | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const g = globalThis as unknown as { __pipeline?: PipelineProgress };
if (!g.__pipeline) {
  g.__pipeline = {
    running: false,
    stage: "",
    done: 0,
    total: 0,
    note: null,
    startedAt: null,
    finishedAt: null,
  };
}
const state = g.__pipeline;

export function getPipelineProgress(): PipelineProgress {
  return { ...state };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** How much work is left across the whole pipeline (0 = fully done). */
async function totalPending(): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    select (
      (select count(*) from businesses where status in ('found','audited')) +
      (select count(*) from businesses where website is not null and email is null) +
      (select count(*) from businesses b where b.email is not null and b.email <> ''
        and not exists (select 1 from messages m where m.business_id = b.id and m.channel = 'email')) +
      (select count(*) from messages where channel = 'email' and direction = 'outbound' and status = 'queued')
    )::int as n
  `;
  return r.n;
}

/** Drain one stage: run its batch repeatedly until nothing is left. */
async function runStage(
  name: string,
  batch: () => Promise<{ done: number; remaining: number }>,
): Promise<void> {
  state.stage = name;
  state.done = 0;
  state.total = 0;
  for (let i = 0; i < 5000; i++) {
    let r: { done: number; remaining: number };
    try {
      r = await batch();
    } catch (err) {
      // Never break the pipeline on a transient error — note it and retry.
      state.note = `${name}: ${err instanceof Error ? err.message : String(err)}`;
      await sleep(1500);
      continue;
    }
    state.done += r.done;
    state.total = state.done + r.remaining;
    if (r.remaining === 0) break;
  }
}

async function runAll(): Promise<void> {
  try {
    // Repeat the full sequence a few times so leads added mid-run are caught.
    for (let round = 0; round < 30; round++) {
      await runStage("Auditing websites", async () => {
        const r = await runAuditor({ limit: 6 });
        return { done: r.audited, remaining: r.remaining };
      });
      await runStage("Writing WhatsApp messages", async () => {
        const r = await runWriter({ limit: 6 });
        return { done: r.written, remaining: r.remaining };
      });
      await runStage("Finding emails", async () => {
        const r = await runEmailFinder({ limit: 8 });
        return { done: r.processed, remaining: r.remaining };
      });
      await runStage("Drafting emails", async () => {
        const r = await runEmailWriter({ limit: 6 });
        return { done: r.written, remaining: r.remaining };
      });
      if (isEmailConfigured()) {
        await runStage("Sending emails", async () => {
          const r = await runEmailSender({ limit: 6 });
          return { done: r.sent, remaining: r.remaining };
        });
      }
      if ((await totalPending()) === 0) break;
    }
    state.note = null;
  } catch (err) {
    state.note = `Pipeline error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    state.running = false;
    state.stage = "Done";
    state.finishedAt = Date.now();
  }
}

/** Start the pipeline in the background (no-op if already running). */
export function startPipeline(): void {
  if (state.running) return;
  state.running = true;
  state.stage = "Starting…";
  state.done = 0;
  state.total = 0;
  state.note = null;
  state.startedAt = Date.now();
  state.finishedAt = null;
  // Detached — do NOT await. Keeps running after the response returns.
  void runAll();
}
