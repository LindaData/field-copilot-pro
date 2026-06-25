import type { Source } from "@/lib/types";

export type AnswerConfidence = "high" | "medium" | "low" | "abstain";

export interface SimilarJobHit {
  jobId?: string;
  knowledgeId?: string;
  title: string;
  model: string;
  symptom?: string;
  cause?: string;
  fix?: string;
  technician?: string;
  approved?: boolean;
  score: number;
  reasons: string[]; // human-readable score breakdown
}

export interface Answer {
  answer: string;
  equipmentRef?: { manufacturer: string; model: string; serial?: string };
  source?: Source;                       // omitted when abstaining
  confidence: AnswerConfidence;
  missingInfo?: string[];
  verificationNeeded?: string[];
  nextSafeAction?: string;
  isSimulated: boolean;                  // true unless rendered from a real verified source
  evidenceFor?: string[];
  evidenceAgainst?: string[];
  similar?: SimilarJobHit[];
  /** Tag used by feedback + analytics to group questions */
  topic?: string;
  /** Generator that produced this answer */
  producer: "deterministic" | "ai-gateway" | "rule-block";
}
