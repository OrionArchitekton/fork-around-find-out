import { NextResponse } from "next/server";
import { runGateFromEnv } from "@/lib/gateway";
import { loadConfig, worldMode } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/gate — evaluate one proposed action through the fork gateway.
// Body: { command: string, tool?: string, rationale?: string }
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  try {
    const result = await runGateFromEnv(body);
    return NextResponse.json(result);
  } catch (e) {
    // Even an unexpected server error fails closed from the caller's view.
    return NextResponse.json(
      {
        error: "gate_error",
        detail: e instanceof Error ? e.message : "unknown",
        decision: { verdict: "BLOCK", merged: false, findings: [] },
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const cfg = loadConfig();
  return NextResponse.json({ ok: true, mode: worldMode(cfg) });
}
