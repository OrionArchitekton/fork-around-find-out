import type { BlastRadius, NetworkAttempt } from "./types";

// Turn the raw observations captured from a fork run into a structured
// BlastRadius. The sandbox reports file state as a "before" and "after" listing
// (path -> sha256-ish digest); we diff them here rather than trusting the
// command to self-report what it changed.

export interface FileSnapshot {
  /** path -> content digest. Absence in `after` means the file was deleted. */
  [path: string]: string;
}

export interface RawObservation {
  before: FileSnapshot;
  after: FileSnapshot;
  bytesWritten: number;
  exitCode: number | null;
  /** Raw "host:port" strings sniffed from the fork's egress. */
  networkEgress: string[];
  secretsRead: string[];
  /** False if any capture step failed: forces policy to fail closed. */
  measurementComplete: boolean;
  /**
   * Where the agent's workspace physically lives inside the world. The policy
   * allowlist is "the agent's workspace", and its absolute path is
   * tier-dependent (`/workspace` on some, `/home/daytona/workspace` on others),
   * so the observer reports it rather than the policy assuming it.
   */
  workspaceRoot?: string;
  /** Identifier of the disposable world the action ran in (live mode). */
  worldId?: string;
  /** How isolation was obtained: a fork of a warm base, or a fresh sandbox. */
  isolation?: "fork" | "fresh-world";
  /**
   * True when a network call was intercepted rather than performed, so the
   * command's control flow diverged from what it would do for real and
   * anything downstream of that call went unmeasured.
   */
  executionTruncated?: boolean;
}

export function parseNetworkAttempt(raw: string): NetworkAttempt | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const idx = trimmed.lastIndexOf(":");
  if (idx <= 0) return { host: trimmed, port: 0 };
  const host = trimmed.slice(0, idx);
  const port = Number.parseInt(trimmed.slice(idx + 1), 10);
  return { host, port: Number.isFinite(port) ? port : 0 };
}

export function diffSnapshots(
  before: FileSnapshot,
  after: FileSnapshot,
): Pick<BlastRadius, "filesCreated" | "filesModified" | "filesDeleted"> {
  const filesCreated: string[] = [];
  const filesModified: string[] = [];
  const filesDeleted: string[] = [];

  for (const path of Object.keys(after)) {
    if (!(path in before)) filesCreated.push(path);
    else if (before[path] !== after[path]) filesModified.push(path);
  }
  for (const path of Object.keys(before)) {
    if (!(path in after)) filesDeleted.push(path);
  }

  return {
    filesCreated: filesCreated.sort(),
    filesModified: filesModified.sort(),
    filesDeleted: filesDeleted.sort(),
  };
}

export function computeBlastRadius(obs: RawObservation): BlastRadius {
  const { filesCreated, filesModified, filesDeleted } = diffSnapshots(
    obs.before ?? {},
    obs.after ?? {},
  );

  const networkEgress = (obs.networkEgress ?? [])
    .map(parseNetworkAttempt)
    .filter((n): n is NetworkAttempt => n !== null);

  return {
    filesCreated,
    filesModified,
    filesDeleted,
    bytesWritten: Math.max(0, obs.bytesWritten ?? 0),
    exitCode: obs.exitCode ?? null,
    networkEgress,
    secretsRead: Array.from(new Set(obs.secretsRead ?? [])).sort(),
    // If the caller could not fully observe the run, the measurement is
    // incomplete regardless of what partial data came back.
    measurementComplete: obs.measurementComplete === true,
    executionTruncated: obs.executionTruncated === true,
  };
}
