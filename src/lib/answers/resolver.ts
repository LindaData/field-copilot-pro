import type { Equipment, Spec } from "@/lib/types";
import type { Answer } from "./types";
import { manufacturerDocsForEquipment, sourceForManufacturerRecord } from "@/lib/manufacturerSources";
// Inline safety classifier (previously @/lib/qa/safety)
function classifyPrompt(q: string): { allow: boolean; reason?: string; category?: string } {
  const s = q.toLowerCase();
  if (/\b(bypass|disable|defeat)\b.*\b(safety|limit|switch|interlock)\b/.test(s))
    return { allow: false, reason: "Bypassing safety devices is not permitted.", category: "safety-bypass" };
  if (/\b(refrigerant|r-?(22|410a|32|454b))\b.*\b(vent|release|dump)\b/.test(s))
    return { allow: false, reason: "Venting refrigerant is illegal under EPA Section 608.", category: "epa-violation" };
  return { allow: true };
}

const ABSTAIN_NEXT = "Verify on nameplate, manufacturer documentation, or escalate to a senior technician.";

function abstain(question: string, equipment?: Equipment, reason = "Not found in approved documentation for this unit."): Answer {
  return {
    answer: reason,
    equipmentRef: equipment ? { manufacturer: equipment.manufacturer, model: equipment.model, serial: equipment.serial } : undefined,
    confidence: "abstain",
    missingInfo: ["Approved manufacturer source for this exact question and model."],
    verificationNeeded: ["Pull the unit's spec sheet or installation manual and confirm directly."],
    nextSafeAction: equipment ? ABSTAIN_NEXT : "Identify the equipment model (scan the nameplate) before asking equipment-specific questions.",
    isSimulated: true,
    producer: "deterministic",
    topic: detectTopic(question),
  };
}

function fromSpec(question: string, equipment: Equipment, spec: Spec, topic: string): Answer {
  return {
    answer: `${spec.label}: ${spec.value}`,
    equipmentRef: { manufacturer: equipment.manufacturer, model: equipment.model, serial: equipment.serial },
    source: spec.source,
    confidence: spec.source.kind === "manufacturer_verified" ? "high" : "medium",
    isSimulated: false,
    producer: "deterministic",
    topic,
    nextSafeAction:
      topic === "mca" ? "Confirm the installed breaker does not exceed Maximum Overcurrent Protection."
      : topic === "voltage" ? "Measure line voltage at the disconnect and confirm it falls inside this range under load."
      : topic === "line-size" ? "Confirm the installed line set matches before brazing or sealing connections."
      : undefined,
  };
}

function detectTopic(q: string): string {
  const t = q.toLowerCase();
  if (t.match(/\b(mca|ampacity)\b/)) return "mca";
  if (t.match(/\b(mop|mocp|overcurrent|breaker)\b/)) return "mop";
  if (t.match(/voltage|volt\b/)) return "voltage";
  if (t.match(/line size|liquid line|suction line|line set/)) return "line-size";
  if (t.match(/refrigerant|charge|r-?410|r-?32/)) return "charge";
  if (t.match(/capacitor|µf|uf|microfarad/)) return "capacitor";
  if (t.match(/error code|fault code|\b[0-9]+f\b/)) return "error-code";
  if (t.match(/wiring|diagram|schematic/)) return "wiring";
  if (t.match(/document|manual|literature|source|spec sheet|submittal|product page|official/)) return "documentation";
  if (t.match(/what changed|since last|previous visit|last visit/)) return "delta";
  if (t.match(/what next|next step|verify next|what should i (verify|do|check)/)) return "next-step";
  if (t.match(/compress(or|ion)|rla|lra/)) return "compressor";
  if (t.match(/fan motor|condenser fan/)) return "fan-motor";
  if (t.match(/filter drier|drier/)) return "drier";
  return "general";
}

interface Ctx {
  equipment?: Equipment;
  allEquipment: Equipment[];
  currentJobId?: string;
  diagCurrentStepId?: string;
}

export function resolveAnswer(question: string, ctx: Ctx): Answer {
  const q = question.trim();
  if (!q) return abstain(q, ctx.equipment, "Empty question.");

  // 1) Safety gate first.
  const verdict = classifyPrompt(q);
  if (verdict.allow === false) {
    return {
      answer: `I can't help with that request. ${verdict.reason}`,
      confidence: "abstain",
      isSimulated: true,
      producer: "rule-block",
      nextSafeAction: "Ask your service manager if you believe this is a valid request.",
      topic: `safety:${verdict.category}`,
    };
  }

  const topic = detectTopic(q);
  const eq = ctx.equipment;

  // 2) Equipment-agnostic intents
  if (topic === "next-step") {
    return {
      answer: ctx.diagCurrentStepId
        ? `You are on diagnostic step ${ctx.diagCurrentStepId}. Continue inside the diagnostic tool so measurements and reasoning stay tied to this job.`
        : "Open the diagnostic tool for this job and answer the next prompted check.",
      confidence: "medium",
      isSimulated: true,
      producer: "deterministic",
      nextSafeAction: "Open Diagnostics.",
      topic,
    };
  }

  // 3) Equipment required from here on.
  if (!eq) return abstain(q, undefined, "Open or link a piece of equipment to ask equipment-specific questions.");

  if (topic === "documentation") {
    const docs = manufacturerDocsForEquipment(eq);
    const manualLinks = eq.manualUrls.filter((link) => link.url && link.url !== "#");
    const linkedTitles = [
      ...manualLinks.map((link) => `${link.label} (${link.url})`),
      ...docs
        .filter((doc) => !manualLinks.some((link) => link.url === doc.url))
        .map((doc) => `${doc.manufacturer} - ${doc.title} (${doc.url})`),
    ];
    if (linkedTitles.length > 0) {
      const source = docs[0]
        ? sourceForManufacturerRecord(docs[0])
        : {
            kind: eq.verificationStatus === "Manufacturer Verified" ? "manufacturer_verified" as const : "verification_required" as const,
            title: manualLinks[0].label,
            url: manualLinks[0].url,
          };
      return {
        answer: `Linked official source${linkedTitles.length === 1 ? "" : "s"}: ${linkedTitles.join("; ")}. In this demo, these are source pointers for review; exact service values still require model-specific extraction and approval unless already shown as verified specs.`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        source,
        confidence: "medium",
        isSimulated: true,
        producer: "deterministic",
        verificationNeeded: ["Confirm the exact installed model and nameplate.", "Review the model-specific manual or submittal before promoting numeric specs."],
        nextSafeAction: "Open the linked manufacturer source, find the exact model document, then approve extracted values before use.",
        topic,
      };
    }
    return abstain(q, eq, "No official manufacturer source link is attached to this equipment yet.");
  }

  // 4) Family-only equipment? warn and abstain on numeric specs.
  const hasSpecs = (eq.specs?.length ?? 0) > 0;
  if (!hasSpecs) {
    // Try family-level fallback only as labeled medium-confidence guidance, never numeric specs.
    const family = ctx.allEquipment.find((e) => e.family === eq.family && (e.specs?.length ?? 0) > 0);
    if (family) {
      return {
        answer: `No verified specs are on file for this exact unit. The closest match in your library is ${family.manufacturer} ${family.model} (same family).`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        confidence: "medium",
        isSimulated: true,
        producer: "deterministic",
        verificationNeeded: ["Compare nameplate values before relying on family-level data."],
        nextSafeAction: "Open the family unit's profile and verify the relevant value matches your nameplate before using it.",
        topic,
      };
    }
    return abstain(q, eq, "No verified specs are on file for this unit yet.");
  }

  // 5) Spec lookup by topic
  const specByKey = (key: string) => eq.specs.find((s) => s.key === key);
  if (topic === "mca") {
    const s = specByKey("mca"); if (s) return fromSpec(q, eq, s, topic);
  }
  if (topic === "mop") {
    const s = specByKey("mop"); if (s) return fromSpec(q, eq, s, topic);
  }
  if (topic === "voltage") {
    const s = specByKey("vrange"); if (s) return fromSpec(q, eq, s, topic);
  }
  if (topic === "charge") {
    const s = specByKey("charge"); if (s) return fromSpec(q, eq, s, topic);
  }
  if (topic === "line-size") {
    const liq = specByKey("liq-line"); const suc = specByKey("suc-line");
    if (liq && suc) {
      return {
        answer: `Liquid line ${liq.value}. Suction line ${suc.value}.`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        source: liq.source,
        confidence: "high",
        isSimulated: false,
        producer: "deterministic",
        nextSafeAction: "Confirm the installed line set matches before brazing or sealing connections.",
        topic,
      };
    }
  }
  if (topic === "compressor") {
    const rla = specByKey("rla"); const lra = specByKey("lra");
    if (rla && lra) {
      return {
        answer: `Compressor RLA ${rla.value}, LRA ${lra.value}.`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        source: rla.source,
        confidence: "high",
        isSimulated: false,
        producer: "deterministic",
        topic,
      };
    }
  }
  if (topic === "fan-motor") {
    const hp = specByKey("fan-hp"); const fla = specByKey("fan-fla");
    if (hp && fla) {
      return {
        answer: `Condenser fan motor ${hp.value}, FLA ${fla.value}.`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        source: hp.source,
        confidence: "high",
        isSimulated: false,
        producer: "deterministic",
        topic,
      };
    }
  }
  if (topic === "capacitor") {
    const bomCap = eq.bom?.find((b) => /capacitor/i.test(b.description));
    return {
      answer: bomCap
        ? `The bill of materials lists ${bomCap.ref} — ${bomCap.description}${bomCap.specHint ? ` (${bomCap.specHint})` : ""}. Always verify the printed µF and voltage on the installed component before ordering a replacement — Goodman does not publish the µF rating in the unit spec sheet.`
        : "Capacitor rating is not in the published specs for this unit. Read the printed µF and voltage on the installed component before ordering a replacement.",
      equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
      source: bomCap?.source,
      confidence: "medium",
      isSimulated: !bomCap,
      producer: "deterministic",
      verificationNeeded: ["Printed label on the installed capacitor (µF and voltage)."],
      nextSafeAction: "Photograph the installed capacitor label and match µF / voltage exactly.",
      topic,
    };
  }
  if (topic === "error-code") {
    const m = q.match(/\b([0-9]+f)\b/i)?.[1].toUpperCase();
    if (m && eq.errorCodes) {
      const hit = eq.errorCodes.find((c) => c.code.toUpperCase() === m);
      if (hit) {
        return {
          answer: `Code ${hit.code}: ${hit.meaning}. Likely causes: ${hit.likelyCauses.join("; ")}.`,
          equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
          source: hit.source,
          confidence: "high",
          isSimulated: false,
          producer: "deterministic",
          verificationNeeded: hit.safeChecks,
          nextSafeAction: hit.safeChecks[0],
          topic,
        };
      }
    }
    return abstain(q, eq, `That error code is not in the approved fault-code list for this unit${m ? ` (${m})` : ""}.`);
  }
  if (topic === "wiring") {
    if (eq.wiringDiagrams && eq.wiringDiagrams.length > 0) {
      const wd = eq.wiringDiagrams[0];
      return {
        answer: `Open: ${wd.title}.`,
        equipmentRef: { manufacturer: eq.manufacturer, model: eq.model, serial: eq.serial },
        source: wd.source,
        confidence: "high",
        isSimulated: false,
        producer: "deterministic",
        nextSafeAction: "De-energize before tracing live circuits.",
        topic,
      };
    }
    return abstain(q, eq, "No approved wiring diagram is linked to this unit yet.");
  }

  // 6) Free-text spec search as last resort
  const tok = q.toLowerCase();
  const match = eq.specs.find((s) => s.label.toLowerCase().includes(tok) || s.key.toLowerCase().includes(tok));
  if (match) return fromSpec(q, eq, match, topic);

  return abstain(q, eq);
}
