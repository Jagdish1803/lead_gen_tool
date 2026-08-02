import "server-only";

/**
 * Groq client (free, fast, OpenAI-compatible). Runs Llama models.
 * https://console.groq.com/docs/api-reference
 */
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export async function groqGenerate(prompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Missing GROQ_API_KEY");
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const MAX_ATTEMPTS = 4;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 400,
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      // Rate limited — wait out Retry-After (or back off) and retry.
      if (res.status === 429 && attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = parseFloat(res.headers.get("retry-after") ?? "");
        const waitMs = Number.isFinite(retryAfter)
          ? Math.min(retryAfter * 1000 + 500, 30_000)
          : (attempt + 1) * 4000;
        await sleep(waitMs);
        continue;
      }

      if (!res.ok) {
        throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Groq returned no text");
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Groq: exhausted retries (rate limited)");
}
