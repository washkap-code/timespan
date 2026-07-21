import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askCopilot } from "@/lib/anthropic";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const SYSTEM_PROMPT = `You are TimeSpan Copilot, a planning assistant embedded in the TimeSpan scheduling and routing platform.

You help users understand and improve their solve results (shift schedules, task plans, field service routes, pickup & delivery routes). You will be given the constraint breakdown, metrics, and score from the user's most recent solve, plus their question.

Rules:
- Ground every recommendation strictly in the data provided. Never invent numbers, customer names, or facts not present in the context.
- If the context is missing or empty, say so and ask the user to run a solve first.
- Be concrete: name the specific constraint codes (e.g. "H2", "S1") driving the issue, and suggest a specific, actionable change (add a resource, widen a time window, adjust a weight, add capacity).
- Keep responses under 200 words unless the user asks for more detail.
- You are not a lawyer or financial advisor — if asked about pricing, contracts, or compliance, stick to what TimeSpan's own docs and pricing page say rather than giving legal/financial advice.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(request);
  const limitResult = rateLimit(`copilot:${user.id}`, 15, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please slow down and try again shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil((limitResult.resetAt - Date.now()) / 1000).toString() } }
    );
  }
  rateLimit(`copilot-ip:${ip}`, 45, 60_000);

  let body: { question?: string; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) return NextResponse.json({ error: "A question is required." }, { status: 400 });
  if (question.length > 2000) return NextResponse.json({ error: "Question is too long." }, { status: 400 });

  const contextText = body.context ? JSON.stringify(body.context).slice(0, 8000) : "No recent solve context was provided.";

  try {
    const answer = await askCopilot(SYSTEM_PROMPT, [
      { role: "user", content: `Solve context (JSON):\n${contextText}\n\nQuestion: ${question}` },
    ]);
    return NextResponse.json({ answer });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Copilot request failed." }, { status: 502 });
  }
}
