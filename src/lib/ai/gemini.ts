import "server-only";

/**
 * Minimal Google Gemini client (free tier via Google AI Studio key).
 * REST call — no SDK needed. Returns generated text, or throws on error.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function geminiGenerate(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(`${BASE}/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? "")
      .join("")
      .trim();

    if (!text) throw new Error("Gemini returned no text");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
