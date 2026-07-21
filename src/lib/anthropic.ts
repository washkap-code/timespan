/**
 * Minimal server-side Claude API client for TimeSpan Copilot. We call the
 * Messages API directly over fetch rather than pulling in the full SDK, to
 * keep the dependency surface small for a single call site.
 *
 * ANTHROPIC_API_KEY is read from the environment and never sent to the
 * client — Copilot only runs from API routes (src/app/api/copilot).
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5-20250929";

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export async function askCopilot(systemPrompt: string, messages: CopilotMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Copilot is not configured — ANTHROPIC_API_KEY is missing.");
  }

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Copilot request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const textBlock = (data.content ?? []).find((b: { type: string; text?: string }) => b.type === "text");
  return textBlock?.text ?? "No response.";
}
