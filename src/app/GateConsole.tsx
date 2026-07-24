"use client";

import { useState } from "react";
import type { GateResult } from "@/lib/types";

interface ScenarioLite {
  id: string;
  label: string;
  command: string;
  harmful: boolean;
}

interface SuiteSummary {
  total: number;
  correct: number;
  catchRate: number;
  passRate: number;
  logged: boolean;
  experimentUrl?: string;
  decisions: { scenarioId: string; label: string; harmful: boolean; verdict: string; correct: boolean }[];
}

const STEPS = ["Propose", "Fork world", "Run in fork", "Measure blast", "Decide"];

export default function GateConsole({
  scenarios,
  initialResult,
}: {
  scenarios: ScenarioLite[];
  initialResult?: GateResult | null;
}) {
  const [result, setResult] = useState<GateResult | null>(initialResult ?? null);
  const [busy, setBusy] = useState(false);
  const [task, setTask] = useState("");
  const [suite, setSuite] = useState<SuiteSummary | null>(null);
  const [note, setNote] = useState<string>("");

  async function gate(command: string, tool = "shell", rationale?: string) {
    setBusy(true);
    setSuite(null);
    setNote("");
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, tool, rationale }),
      });
      setResult(await res.json());
    } catch {
      setNote("Gate request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function propose() {
    if (!task.trim()) return;
    setBusy(true);
    setNote("Agent brain is proposing an action…");
    try {
      const res = await fetch("/api/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (data?.action?.command) {
        setNote(`Proposed by ${data.brain}: ${data.action.command}`);
        await gate(data.action.command, data.action.tool, data.action.rationale);
      } else {
        setNote("Brain did not return an action.");
        setBusy(false);
      }
    } catch {
      setNote("Propose request failed.");
      setBusy(false);
    }
  }

  async function runSuite() {
    setBusy(true);
    setResult(null);
    setNote("");
    try {
      const res = await fetch("/api/suite", { method: "POST" });
      const data = await res.json();
      setSuite(data.summary);
    } catch {
      setNote("Suite request failed.");
    } finally {
      setBusy(false);
    }
  }

  const v = result?.decision.verdict;
  const br = result?.blastRadius;

  return (
    <div className="grid">
      <div className="panel">
        <h2>Attack suite</h2>
        {scenarios.map((s) => (
          <button
            key={s.id}
            className="scn"
            disabled={busy}
            onClick={() => gate(s.command)}
          >
            <span className={`dot ${s.harmful ? "harm" : "safe"}`} />
            {s.label}
            <span className="cmd">{s.command}</span>
          </button>
        ))}
        <div style={{ marginTop: 14 }}>
          <button className="act" disabled={busy} onClick={runSuite}>
            ▶ Run full suite → Braintrust
          </button>
        </div>
      </div>

      <div className="panel stage">
        <div className="controls">
          <input
            className="task"
            placeholder="Give the agent a task (e.g. 'back up the .env file')"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && propose()}
            disabled={busy}
          />
          <button className="act" disabled={busy} onClick={propose}>
            Propose → Gate
          </button>
        </div>

        <div className="flowrow">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${result || busy ? "active" : ""}`}>
              {i + 1}. {s}
            </div>
          ))}
        </div>

        {note && <p className="muted" style={{ fontSize: 12 }}>{note}</p>}

        {suite && (
          <div className="suite">
            <div className="suitebar">
              <span className="big">{Math.round(suite.catchRate * 100)}%</span>
              <span className="muted">
                harmful actions caught &nbsp;·&nbsp; {Math.round(suite.passRate * 100)}% benign passed
                &nbsp;·&nbsp; {suite.correct}/{suite.total} correct
              </span>
            </div>
            {suite.decisions.map((d) => (
              <div key={d.scenarioId} className="suiterow">
                <span>
                  <span className={`dot ${d.harmful ? "harm" : "safe"}`} /> {d.label}
                </span>
                <span className={d.correct ? "ok" : "bad"}>
                  {d.verdict} {d.correct ? "✓" : "✗"}
                </span>
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              {suite.logged
                ? "Scored rows logged to the Braintrust project 'fork-around-find-out'."
                : "Scored against the golden attack suite. Set BRAINTRUST_API_KEY to log the scored rows to Braintrust."}
            </p>
          </div>
        )}

        {result && br && (
          <>
            <div className={`verdict ${v}`}>
              <div className="v">
                {v === "ALLOW" ? "✓ ALLOW: cleared to run for real" : v === "QUARANTINE" ? "❖ QUARANTINE: held for review" : "✕ BLOCK: killed in the fork"}
              </div>
              <div className="sub">
                {result.mode === "live" ? (
                  <>
                    Measured on a real Daytona sandbox
                    {result.world?.id ? (
                      <>
                        {" "}
                        <code className="inline">{result.world.id.slice(0, 8)}</code>
                      </>
                    ) : null}
                    {result.world?.isolation === "fork" ? " (forked from a warm base)" : ""}, created
                    and destroyed for this one action.{" "}
                  </>
                ) : (
                  "Measured in the deterministic mock world. "
                )}
                {result.decision.merged
                  ? "Clean blast radius, so it would be cleared to run for real."
                  : "The real world was never touched."}{" "}
                ({result.elapsedMs}ms)
              </div>
            </div>

            <div className="blast">
              <Metric k="Files created" val={br.filesCreated.length} />
              <Metric k="Files modified" val={br.filesModified.length} />
              <Metric k="Files deleted" val={br.filesDeleted.length} hot={br.filesDeleted.length > 0} />
              <Metric k="Net egress" val={br.networkEgress.length} hot={br.networkEgress.length > 0} />
              <Metric k="Secrets read" val={br.secretsRead.length} hot={br.secretsRead.length > 0} />
              <Metric k="Exit code" val={br.exitCode ?? "n/a"} />
            </div>

            {br.networkEgress.length > 0 && (
              <p className="muted" style={{ fontSize: 12 }}>
                egress: {br.networkEgress.map((n) => `${n.host}:${n.port}`).join(", ")}
              </p>
            )}

            <ul className="findings">
              {result.decision.findings.length === 0 && (
                <li className="ALLOW">No policy violations. Action is safe to merge.</li>
              )}
              {result.decision.findings.map((f) => (
                <li key={f.ruleId} className={f.severity}>
                  {f.description}
                  <div className="rid">rule: {f.ruleId} · {f.severity}</div>
                </li>
              ))}
            </ul>
          </>
        )}

        {!result && !suite && (
          <p className="muted">
            Pick an action on the left, or give the agent a task above. It runs in a
            forked sandbox first, so you see the consequences before the real world does.
          </p>
        )}
      </div>
    </div>
  );
}

function Metric({ k, val, hot }: { k: string; val: number | string; hot?: boolean }) {
  return (
    <div className={`metric ${hot ? "hot" : ""}`}>
      <div className="k">{k}</div>
      <div className="val">{val}</div>
    </div>
  );
}
