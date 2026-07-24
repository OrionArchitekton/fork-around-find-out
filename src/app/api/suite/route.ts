import { NextResponse } from "next/server";
import { runSuite } from "@/lib/gateway";

export const runtime = "nodejs";
export const maxDuration = 120;

// POST /api/suite — run the whole attack suite through the gate and return the
// scored summary (catch-rate, pass-rate, per-scenario) plus the Braintrust
// experiment link when a key is configured.
export async function POST() {
  try {
    const { summary, results } = await runSuite();
    return NextResponse.json({ summary, results });
  } catch (e) {
    return NextResponse.json(
      { error: "suite_error", detail: e instanceof Error ? e.message : "unknown" },
      { status: 500 },
    );
  }
}
