import type {
  BlastRadius,
  PolicyContext,
  PolicyDecision,
  PolicyFinding,
  PolicyRule,
  Verdict,
} from "./types";

// Verdict severity ordering. Higher = more restrictive. The gateway takes the
// most severe verdict any rule votes for (fail toward caution).
const SEVERITY: Record<Verdict, number> = { ALLOW: 0, QUARANTINE: 1, BLOCK: 2 };

export function moreSevere(a: Verdict, b: Verdict): Verdict {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

function isOutside(path: string, allowlist: string[]): boolean {
  return !allowlist.some((root) => path === root || path.startsWith(root));
}

/**
 * Hosts are NOT paths: a prefix test lets an attacker register a domain that
 * starts with an allowlisted one. `pypi.org.evil.com` starts with `pypi.org`,
 * so a prefix check would wave the exfiltration straight through. Match the
 * host exactly, or as a subdomain on a dot boundary.
 */
function hostOutside(host: string, allowlist: string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return !allowlist.some((entry) => {
    const a = entry.toLowerCase().replace(/^\.+|\.$/g, "");
    return h === a || h.endsWith(`.${a}`);
  });
}

/**
 * The default policy. These rules encode the "Rule of Two" intuition: a single
 * action that both touches a secret AND reaches the network is an exfiltration
 * shape and is blocked outright, even if each half looks benign alone.
 *
 * Rules are data, not hard-coded branches, so a deployment can add/remove them
 * and the demo can show the exact rule that fired.
 */
export const DEFAULT_RULES: PolicyRule[] = [
  {
    id: "fail-closed-incomplete-measurement",
    severity: "BLOCK",
    description:
      "The fork run did not return a trustworthy blast-radius reading; blocking rather than guessing.",
    test: (br) => !br.measurementComplete,
  },
  {
    id: "exfiltration-secret-plus-egress",
    severity: "BLOCK",
    description:
      "Action read a sensitive file AND opened a network connection: the classic exfiltration pattern.",
    test: (br) => br.secretsRead.length > 0 && br.networkEgress.length > 0,
  },
  {
    id: "destructive-delete-outside-workspace",
    severity: "BLOCK",
    description:
      "Action deleted files outside the write allowlist (irreversible in the real world).",
    test: (br, ctx) =>
      br.filesDeleted.some((p) => isOutside(p, ctx.writeAllowlist)),
  },
  {
    id: "write-outside-workspace",
    severity: "QUARANTINE",
    description:
      "Action created or modified files outside the write allowlist.",
    test: (br, ctx) =>
      [...br.filesCreated, ...br.filesModified].some((p) =>
        isOutside(p, ctx.writeAllowlist),
      ),
  },
  {
    id: "unapproved-network-egress",
    severity: "QUARANTINE",
    description:
      "Action reached a network host that is not on the allowlist.",
    test: (br, ctx) =>
      br.networkEgress.some((n) => hostOutside(n.host, ctx.networkAllowlist)),
  },
  {
    id: "secret-access",
    severity: "QUARANTINE",
    description: "Action read a sensitive file (no egress observed).",
    test: (br) => br.secretsRead.length > 0,
  },
];

/**
 * Evaluate a blast radius against a policy. Pure and deterministic: same inputs,
 * same verdict, every time. The verdict is the most severe of all fired rules;
 * with nothing fired and a complete measurement, the action is ALLOWed (merged).
 */
export function evaluate(
  br: BlastRadius,
  ctx: PolicyContext,
  rules: PolicyRule[] = DEFAULT_RULES,
): PolicyDecision {
  const findings: PolicyFinding[] = [];
  let verdict: Verdict = "ALLOW";

  for (const rule of rules) {
    let fired = false;
    try {
      fired = rule.test(br, ctx);
    } catch {
      // A rule that throws is treated as firing at its declared severity :
      // a broken safety check must never silently pass an action.
      fired = true;
    }
    if (fired) {
      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        description: rule.description,
      });
      verdict = moreSevere(verdict, rule.severity);
    }
  }

  return { verdict, findings, merged: verdict === "ALLOW" };
}
