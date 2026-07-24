#!/usr/bin/env bash
# One-command clean-feed launcher for the 3-minute live finale demo.
# Presents from the LAPTOP rendering locally (never over RDP). Fallback ladder if
# this fails on stage: (1) terminal-narration mode against /api/gate curls,
# (2) the pre-recorded verified video, (3) staged screenshots in docs/screenshots.
set -euo pipefail

PORT="${PORT:-3000}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$HERE"

echo "==> Killing anything stale on :$PORT (by PORT, never pkill -f)"
if command -v fuser >/dev/null 2>&1; then fuser -k "${PORT}/tcp" 2>/dev/null || true; fi
sleep 1

echo "==> Building prod (deterministic mock world = clean, always-green feed)"
FAAFO_FORCE_MOCK=1 pnpm build >/tmp/faafo-finale-build.log 2>&1 || {
  echo "BUILD FAILED — see /tmp/faafo-finale-build.log"; tail -20 /tmp/faafo-finale-build.log; exit 1; }

echo "==> Starting server on 0.0.0.0:$PORT (mock world)"
FAAFO_FORCE_MOCK=1 HOSTNAME=0.0.0.0 PORT="$PORT" pnpm start >/tmp/faafo-finale-server.log 2>&1 &
SRV=$!

echo "==> Pre-warming ONLY the setup path (never the money beat — the BLOCK lands live)"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then break; fi
  sleep 0.5
done
curl -s "http://localhost:${PORT}/" >/dev/null 2>&1 || true
curl -s "http://localhost:${PORT}/?demo=benign-build" >/dev/null 2>&1 || true

HEALTH="$(curl -s "http://localhost:${PORT}/api/health" || echo '{}')"
echo
echo "================= READY ================="
echo " Open:  http://localhost:${PORT}"
echo " Health: ${HEALTH}"
echo " Server pid: ${SRV}  (kill with: fuser -k ${PORT}/tcp)"
echo " Demo beats:"
echo "   1. /                       (problem + flow)"
echo "   2. click 'Run the test suite'   -> ALLOW"
echo "   3. click 'Prompt-injected beacon' -> BLOCK  <-- money beat, live"
echo "   4. click 'Run full suite'   -> 100% catch-rate"
echo "========================================="
wait "$SRV"
