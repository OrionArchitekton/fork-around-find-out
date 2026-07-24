import { NextResponse } from "next/server";
import { loadConfig, worldMode } from "@/lib/config";

export const runtime = "nodejs";

// GET /api/health: liveness + which sponsors are wired (names only, no values).
export async function GET() {
  const cfg = loadConfig();
  return NextResponse.json({
    ok: true,
    app: "fork-around-find-out",
    worldMode: worldMode(cfg),
    wired: {
      daytona: Boolean(cfg.daytonaKey),
      braintrust: Boolean(cfg.braintrustKey),
      fireworks: Boolean(cfg.fireworksKey),
      anthropic: Boolean(cfg.anthropicKey),
    },
  });
}
