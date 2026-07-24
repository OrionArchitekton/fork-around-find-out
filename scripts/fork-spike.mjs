#!/usr/bin/env node
// Day-0 sponsor-API spike: prove the load-bearing Daytona primitives on the REAL
// tier before trusting them in the gateway. Run the moment DAYTONA_API_KEY lands:
//   DAYTONA_API_KEY=... node scripts/fork-spike.mjs
// It exits non-zero and prints exactly which primitive failed, so we know whether
// live mode is safe to ship or we stay on the (honest) mock world.

const key = process.env.DAYTONA_API_KEY;
if (!key) {
  console.error("SPIKE FAIL: DAYTONA_API_KEY not set");
  process.exit(2);
}

const CANARY = "SECRET_CANARY_a1f3c0de";

async function main() {
  const mod = await import("@daytonaio/sdk");
  const Daytona = mod.Daytona ?? mod.default?.Daytona ?? mod.default;
  console.log("[1/6] SDK loaded:", typeof Daytona === "function" ? "ok" : "MISSING");
  const daytona = new Daytona({ apiKey: key, apiUrl: process.env.DAYTONA_API_URL });

  console.log("[2/6] creating base world sandbox...");
  const base = await daytona.create({ language: "python" });
  const id = base.id ?? base.sandboxId ?? "(unknown)";
  console.log("      base sandbox:", id);

  const exec = async (sb, cmd) => {
    const p = sb.process ?? sb;
    const fn = p.exec ?? p.executeCommand ?? p.code_run;
    return fn.call(p, cmd);
  };

  console.log("[3/6] seeding + exec...");
  const seed = await exec(
    base,
    `mkdir -p /workspace && printf 'API_KEY=${CANARY}\\n' > /workspace/.env && echo seeded`,
  );
  console.log("      exec result keys:", Object.keys(seed || {}).join(","));
  console.log("      stdout:", (seed.stdout ?? seed.result ?? "").toString().trim());

  console.log("[4/6] FORK the world (the load-bearing primitive)...");
  let fork = null;
  let forkMethod = "none";
  try {
    if (typeof base._experimental_fork === "function") {
      fork = await base._experimental_fork();
      forkMethod = "_experimental_fork";
    } else if (typeof base.fork === "function") {
      fork = await base.fork();
      forkMethod = "fork";
    } else {
      console.log("      no fork method; trying snapshot fallback...");
      if (typeof base.snapshot === "function") {
        const snap = await base.snapshot();
        fork = await daytona.create({ snapshot: snap.id ?? snap });
        forkMethod = "snapshot+create";
      }
    }
  } catch (e) {
    console.error("      FORK ERROR:", e?.message ?? e);
  }
  console.log("      fork method:", forkMethod, "| fork id:", fork?.id ?? "(none)");

  if (!fork) {
    console.error("SPIKE PARTIAL: fork/snapshot unavailable — ship mock world, keep the story honest.");
    await cleanup(base, null);
    process.exit(3);
  }

  console.log("[5/6] run a canary-read in the fork, detect it...");
  const run = await exec(fork, `cat /workspace/.env`);
  const out = (run.stdout ?? run.result ?? "").toString();
  const caught = out.includes(CANARY);
  console.log("      canary detected in fork output:", caught);

  console.log("[6/6] cleanup...");
  await cleanup(base, fork);

  if (caught) {
    console.log("SPIKE PASS: fork + exec + canary detection all work on the live tier. Live mode is safe to ship.");
    process.exit(0);
  }
  console.error("SPIKE PARTIAL: fork worked but canary not detected — check exec output shape.");
  process.exit(4);
}

async function cleanup(base, fork) {
  const del = async (sb) => {
    if (!sb) return;
    const fn = sb.delete ?? sb.remove ?? sb.destroy;
    if (fn) await fn.call(sb).catch(() => {});
  };
  // Delete fork before base (parent is undeletable while forks live).
  await del(fork);
  await del(base);
}

main().catch((e) => {
  console.error("SPIKE FAIL:", e?.message ?? e);
  process.exit(1);
});
