/**
 * Central action-authority guardrails. Returns whether the AI surface is
 * allowed to perform `action` on its own. The default is always `false` for
 * anything that mutates customer-visible state, spend, or safety posture.
 */
export type AiAction =
  | "approve-repair"
  | "close-job"
  | "change-verified-spec"
  | "mark-part-compatible"
  | "authorize-spend"
  | "bypass-safety"
  | "send-customer-comms";

export interface CanAiCtx {
  ownerAutoSendComms?: boolean; // default false
}

export interface CanAiResult {
  allowed: boolean;
  reason: string;
}

export function canAi(action: AiAction, ctx: CanAiCtx = {}): CanAiResult {
  switch (action) {
    case "approve-repair":
      return { allowed: false, reason: "AI may not approve repairs. Technician or customer must confirm." };
    case "close-job":
      return { allowed: false, reason: "AI may not close jobs. Technician must mark complete after verification." };
    case "change-verified-spec":
      return { allowed: false, reason: "AI may not change a manufacturer-verified specification." };
    case "mark-part-compatible":
      return { allowed: false, reason: "AI may not mark a part compatible. A qualified technician must verify." };
    case "authorize-spend":
      return { allowed: false, reason: "AI may not authorize spend. Owner or customer approval required." };
    case "bypass-safety":
      return { allowed: false, reason: "AI may not bypass any safety acknowledgment." };
    case "send-customer-comms":
      return ctx.ownerAutoSendComms
        ? { allowed: true, reason: "Owner has enabled AI-initiated customer messages." }
        : { allowed: false, reason: "AI-initiated customer messages are disabled. Owner must enable in settings." };
  }
}
