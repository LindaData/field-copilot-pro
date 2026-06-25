// Server-side-equivalent guardrails for the Copilot assistant.
// Deterministic refusal — runs BEFORE any deterministic answer or AI inference.

export type SafetyVerdict =
  | { allow: true }
  | { allow: false; reason: string; category: "unsafe-bypass" | "invent-spec" | "prompt-injection" | "unauthorized-action" | "license-spoof" | "cross-tenant" | "system-prompt" };

const RULES: { pattern: RegExp; category: SafetyVerdict extends { allow: false } ? SafetyVerdict["category"] : never; reason: string }[] = [
  // Bypass safety controls
  { pattern: /\b(bypass|jumper|jump out|disable|defeat)\b.*\b(float switch|pressure switch|limit|rollout|safety|interlock|high[- ]?pressure|low[- ]?pressure)\b/i, category: "unsafe-bypass", reason: "Bypassing a safety control is never permitted." },
  { pattern: /\b(vent|release|let off)\b.*\b(refrigerant|freon|r-?410a|r-?22|r-?32)\b/i, category: "unsafe-bypass", reason: "Venting refrigerant is illegal and unsafe." },
  { pattern: /ignore (the )?(manual|previous instructions|all instructions|system|safety)/i, category: "prompt-injection", reason: "Cannot ignore approved documentation or safety rules." },
  { pattern: /\b(don'?t|do not|skip|hide|suppress)\b.*\b(safety|warning|disclaimer)\b/i, category: "unsafe-bypass", reason: "Safety warnings cannot be hidden." },

  // Invent specs from guesses or similar models
  { pattern: /\b(just )?(guess|assume|make up|estimate)\b.*\b(charge|refrigerant|capacitor|breaker|wire|amp|voltage|pressure|superheat|subcool|torque)\b/i, category: "invent-spec", reason: "Specifications must come from approved documentation — guessing is not allowed." },
  { pattern: /\busual\b.*\b(capacitor|charge|breaker|wire)\b/i, category: "invent-spec", reason: "There is no 'usual' value — verify against unit documentation." },
  { pattern: /\b(use|copy|apply).*\b(similar|other|another)\b.*\b(model|unit)\b/i, category: "invent-spec", reason: "Specifications from a similar model are not interchangeable without verification." },

  // Unauthorized actions
  { pattern: /\b(auto(?:matically)?|just)\b.*\bapprove\b.*\b(repair|work|job|invoice)\b/i, category: "unauthorized-action", reason: "Repair approval requires customer authorization with signature." },
  { pattern: /\bmark\b.*\b(unverified|unknown)\b.*\b(compatible|approved|verified)\b/i, category: "unauthorized-action", reason: "Compatibility cannot be marked verified from chat." },
  { pattern: /\bupdate\b.*\b(manufacturer|verified)\b.*\bspec/i, category: "unauthorized-action", reason: "Manufacturer specs cannot be changed from chat — require document review." },

  // License / role spoof
  { pattern: /\bpretend\b.*\b(licensed|certified|epa|qualified)\b/i, category: "license-spoof", reason: "Cannot assume licensure that has not been verified." },

  // Cross-tenant / disclosure
  { pattern: /\b(another|other)\b.*\b(customer|company|tenant)\b.*\b(job|note|data|file)\b/i, category: "cross-tenant", reason: "Cross-customer or cross-company data is not accessible." },
  { pattern: /\b(reveal|show|print|leak)\b.*\b(system|hidden|internal)\b.*\b(prompt|instruction|rule)\b/i, category: "system-prompt", reason: "Internal instructions are not disclosed." },
];

export function classifyPrompt(prompt: string): SafetyVerdict {
  for (const r of RULES) {
    if (r.pattern.test(prompt)) return { allow: false, reason: r.reason, category: r.category };
  }
  return { allow: true };
}

// Known approved spec keys for the seeded Goodman unit. Anything else → abstain.
export const APPROVED_SPEC_KEYS = new Set([
  "mca", "mop", "voltage-range", "v-range", "line-size", "liquid-line", "suction-line",
  "charge", "refrigerant", "tons", "btu", "seer2", "weight", "shipping-weight",
  "comp-rla", "comp-lra", "fan-fla", "fan-hp", "phase", "frequency",
]);
