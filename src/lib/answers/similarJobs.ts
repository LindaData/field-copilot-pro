import type { Equipment, Job, KnowledgeCase } from "@/lib/types";
import type { SimilarJobHit } from "./types";

interface Ctx {
  equipment?: Equipment;
  allEquipment: Equipment[];
  jobs: Job[];
  knowledge: KnowledgeCase[];
  currentJobId?: string;
}

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
}

const STOP = new Set(["the", "and", "for", "with", "this", "that", "what", "should", "from"]);

export function findSimilarJobs(question: string, ctx: Ctx): SimilarJobHit[] {
  const qTokens = tokens(question).filter((t) => !STOP.has(t));
  const eq = ctx.equipment;
  const errMatch = question.match(/\b([0-9]+f)\b/i)?.[1].toUpperCase();

  const hits: SimilarJobHit[] = [];

  for (const k of ctx.knowledge) {
    const reasons: string[] = [];
    let score = 0;
    const kModel = k.model.toLowerCase();
    if (eq) {
      if (kModel.includes(eq.model.toLowerCase()) || kModel.includes(eq.family.toLowerCase())) { score += 5; reasons.push("Exact/family model match"); }
      else if (kModel.includes(eq.manufacturer.toLowerCase())) { score += 2; reasons.push("Same manufacturer"); }
    }
    const text = `${k.symptom} ${k.cause} ${k.fix} ${k.title}`.toLowerCase();
    const overlap = qTokens.filter((t) => text.includes(t)).length;
    if (overlap > 0) { score += overlap; reasons.push(`${overlap} symptom term match`); }
    if (errMatch && text.includes(errMatch.toLowerCase())) { score += 3; reasons.push(`Error code ${errMatch} mentioned`); }
    if (k.approved) { reasons.push("Approved case"); }
    if (score > 0) {
      hits.push({
        knowledgeId: k.id, title: k.title, model: k.model,
        symptom: k.symptom, cause: k.cause, fix: k.fix,
        technician: k.technician, approved: k.approved, score, reasons,
      });
    }
  }

  for (const j of ctx.jobs) {
    if (j.id === ctx.currentJobId) continue;
    const eqJ = ctx.allEquipment.find((e) => e.id === j.equipmentId);
    if (!eqJ) continue;
    let score = 0;
    const reasons: string[] = [];
    if (eq) {
      if (eqJ.model === eq.model) { score += 5; reasons.push("Exact model match"); }
      else if (eqJ.family === eq.family) { score += 2; reasons.push("Same family"); }
    }
    const overlap = qTokens.filter((t) => j.complaint.toLowerCase().includes(t)).length;
    if (overlap > 0) { score += overlap; reasons.push(`${overlap} symptom term match`); }
    if (score > 0) {
      hits.push({
        jobId: j.id, title: j.complaint, model: `${eqJ.manufacturer} ${eqJ.model}`,
        symptom: j.complaint, score, reasons, approved: j.status === "Completed",
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, 5);
}
