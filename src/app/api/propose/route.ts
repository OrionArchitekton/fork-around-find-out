import { NextResponse } from "next/server";
import { makeBrain } from "@/lib/llm";
import { loadConfig } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/propose — the agent brain turns a natural-language task into a
// concrete shell action. This is the LIVE AI path; the action it returns is
// then meant to be sent to /api/gate (never executed directly).
export async function POST(req: Request) {
  let task = "";
  try {
    const body = await req.json();
    task = typeof body?.task === "string" ? body.task : "";
  } catch {
    /* empty task falls through */
  }
  if (!task.trim()) {
    return NextResponse.json({ error: "missing task" }, { status: 400 });
  }
  try {
    const brain = makeBrain(loadConfig());
    const action = await brain.propose(task);
    return NextResponse.json({ brain: brain.name, action });
  } catch (e) {
    return NextResponse.json(
      { error: "propose_error", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
