import "server-only";
import { groqGenerate } from "@/lib/ai/groq";
import { geminiGenerate } from "@/lib/ai/gemini";

export type AiProvider = "groq" | "gemini" | "claude" | "none";

/** Which AI provider is configured, based on available env keys. */
export function activeProvider(): AiProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude"; // wired later
  return "none";
}

/**
 * Generate text with the configured provider.
 * Returns null when no provider is configured (caller falls back to a template).
 * Swappable: add/reorder providers here without touching callers.
 */
export async function generateText(prompt: string): Promise<string | null> {
  switch (activeProvider()) {
    case "groq":
      return groqGenerate(prompt);
    case "gemini":
      return geminiGenerate(prompt);
    // case "claude": return claudeGenerate(prompt);  // upgrade later
    default:
      return null;
  }
}
