import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "./seed";
import type {
  AiFeedback, ArrivalMethod, Authorization, Company, Customer, DiagnosticSession, DiagStepResult,
  DocItem, Equipment, Job, JobPart, JobStage, JobStatus, KnowledgeCase, Measurement,
  PartRequest, PartRequestStatus, Part, PauseRecord, PauseReason, Property,
  UserProfile,
} from "./types";

const KEY = "hvac-copilot-store-v4";

type Role = "guest-tech" | "guest-owner" | "user";

export interface StoreState {
  company: Company;
  users: UserProfile[];
  currentUserId: string;
  role: Role;
  customers: Customer[];
  properties: Property[];
  equipment: Equipment[];
  jobs: Job[];
  parts: Part[];
  jobParts: JobPart[];
  partRequests: PartRequest[];
  auths: Authorization[];
  docs: DocItem[];
  knowledge: KnowledgeCase[];
  diag: Record<string, DiagnosticSession>;
  online: boolean;
  tourSeen: boolean;
  recentEquipmentIds: string[];
  aiFeedback: AiFeedback[];
}

const initialState = (): StoreState => ({
  company: seed.COMPANY,
  users: seed.USERS,
  currentUserId: "u-alex",
  role: "guest-tech",
  customers: seed.CUSTOMERS,
  properties: seed.PROPERTIES,
  equipment: seed.EQUIPMENT,
  jobs: seed.JOBS,
  parts: seed.PARTS,
  jobParts: seed.JOB_PARTS,
  partRequests: [],
  auths: seed.AUTHORIZATIONS,
  docs: seed.DOCS,
  knowledge: seed.KNOWLEDGE,
  diag: { "j-1": seed.INITIAL_DIAG },
  online: true,
  tourSeen: false,
  recentEquipmentIds: ["eq-1"],
  aiFeedback: [],
});

interface Ctx {
  state: StoreState;
  setState: (updater: (s: StoreState) => StoreState) => void;
  reset: () => void;
  setRole: (r: Role, userId?: string) => void;
  updateJob: (id: string, patch: Partial<Job>) => void;
  setJobStatus: (id: string, s: JobStatus) => void;
  ensureDiag: (jobId: string) => DiagnosticSession;
  saveStep: (jobId: string, result: DiagStepResult, nextStepId?: string) => void;
  goToStep: (jobId: string, stepId: string) => void;
  reviseStep: (jobId: string, stepId: string) => void; // marks later steps needs-review
  clearInvalidation: (jobId: string, stepId: string) => void;
  saveMeasurement: (jobId: string, m: Measurement) => void;
  setHypothesis: (jobId: string, h: string, c: "Low" | "Medium" | "High") => void;
  completeDiag: (jobId: string) => void;
  addJobPart: (jp: JobPart) => void;
  removeJobPart: (jobId: string, partId: string) => void;
  setAuth: (a: Authorization) => void;
  addDoc: (d: DocItem) => void;
  promoteDoc: (id: string) => void;
  toggleOnline: () => void;
  markTourSeen: () => void;
  touchEquipment: (id: string) => void;
  // arrival
  setArrival: (jobId: string, method: ArrivalMethod, ts?: string) => void;
  setArrivalDetected: (jobId: string, ts: string) => void;
  // pauses
  startPause: (jobId: string, reason: PauseReason, stage: JobStage, notes?: string) => void;
  endPause: (jobId: string) => void;
  // part requests
  addPartRequest: (pr: PartRequest) => void;
  updatePartRequest: (id: string, patch: Partial<PartRequest>) => void;
  // AI feedback
  addAiFeedback: (fb: AiFeedback) => void;
  markAiFeedbackReviewed: (id: string, reviewed: boolean) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<StoreState>(() => {
    if (typeof window === "undefined") return initialState();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...initialState(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return initialState();
  });

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  const setState = useCallback((updater: (s: StoreState) => StoreState) => {
    setStateRaw((s) => updater(s));
  }, []);

  const api: Ctx = useMemo(() => ({
    state,
    setState,
    reset: () => setStateRaw(initialState()),
    setRole: (r, userId) => setStateRaw((s) => ({ ...s, role: r, currentUserId: userId ?? (r === "guest-owner" ? "u-owner" : "u-alex") })),
    updateJob: (id, patch) => setStateRaw((s) => ({ ...s, jobs: s.jobs.map((j) => j.id === id ? { ...j, ...patch } : j) })),
    setJobStatus: (id, st) => setStateRaw((s) => ({ ...s, jobs: s.jobs.map((j) => j.id === id ? { ...j, status: st } : j) })),
    ensureDiag: (jobId) => {
      const existing = state.diag[jobId];
      if (existing) return existing;
      const fresh: DiagnosticSession = { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [], visitedStepIds: ["A"], invalidatedStepIds: [] };
      setStateRaw((s) => ({ ...s, diag: { ...s.diag, [jobId]: fresh } }));
      return fresh;
    },
    saveStep: (jobId, result, nextStepId) => setStateRaw((s) => {
      const d = s.diag[jobId] ?? { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [], visitedStepIds: [], invalidatedStepIds: [] };
      // merge: replace prior result for this step (re-answer)
      const prior = d.results.find((r) => r.stepId === result.stepId);
      const results = [...d.results.filter((r) => r.stepId !== result.stepId), result];
      // clear needs-review for this step
      const invalidated = (d.invalidatedStepIds ?? []).filter((id) => id !== result.stepId);
      const visited = Array.from(new Set([...(d.visitedStepIds ?? []), result.stepId, ...(nextStepId ? [nextStepId] : [])]));
      // if re-answering a previously-answered step and answer changed, mark later visited steps as needs-review
      let nextInvalidated = invalidated;
      if (prior && (prior.answer ?? "") !== (result.answer ?? "")) {
        const laterIdx = (d.visitedStepIds ?? []).indexOf(result.stepId);
        const laterSteps = (d.visitedStepIds ?? []).slice(laterIdx + 1).filter((id) => id !== result.stepId);
        nextInvalidated = Array.from(new Set([...invalidated, ...laterSteps]));
      }
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, results, currentStepId: nextStepId ?? d.currentStepId, visitedStepIds: visited, invalidatedStepIds: nextInvalidated } } };
    }),
    goToStep: (jobId, stepId) => setStateRaw((s) => {
      const d = s.diag[jobId]; if (!d) return s;
      const visited = Array.from(new Set([...(d.visitedStepIds ?? []), stepId]));
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, currentStepId: stepId, visitedStepIds: visited } } };
    }),
    reviseStep: (jobId, stepId) => setStateRaw((s) => {
      const d = s.diag[jobId]; if (!d) return s;
      const idx = (d.visitedStepIds ?? []).indexOf(stepId);
      if (idx === -1) return s;
      const later = (d.visitedStepIds ?? []).slice(idx + 1);
      const invalidated = Array.from(new Set([...(d.invalidatedStepIds ?? []), ...later]));
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, currentStepId: stepId, invalidatedStepIds: invalidated } } };
    }),
    clearInvalidation: (jobId, stepId) => setStateRaw((s) => {
      const d = s.diag[jobId]; if (!d) return s;
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, invalidatedStepIds: (d.invalidatedStepIds ?? []).filter((x) => x !== stepId) } } };
    }),
    saveMeasurement: (jobId, m) => setStateRaw((s) => {
      const d = s.diag[jobId] ?? { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [], visitedStepIds: [], invalidatedStepIds: [] };
      const measurements = [...d.measurements.filter((x) => x.id !== m.id), m];
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, measurements } } };
    }),
    setHypothesis: (jobId, h, c) => setStateRaw((s) => {
      const d = s.diag[jobId]; if (!d) return s;
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, hypothesis: h, confidence: c } } };
    }),
    completeDiag: (jobId) => setStateRaw((s) => {
      const d = s.diag[jobId]; if (!d) return s;
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, completed: true } } };
    }),
    addJobPart: (jp) => setStateRaw((s) => ({ ...s, jobParts: [...s.jobParts.filter((x) => !(x.jobId === jp.jobId && x.partId === jp.partId)), jp] })),
    removeJobPart: (jobId, partId) => setStateRaw((s) => ({ ...s, jobParts: s.jobParts.filter((x) => !(x.jobId === jobId && x.partId === partId)) })),
    setAuth: (a) => setStateRaw((s) => ({ ...s, auths: [...s.auths.filter((x) => x.jobId !== a.jobId), a] })),
    addDoc: (d) => setStateRaw((s) => ({ ...s, docs: [d, ...s.docs] })),
    promoteDoc: (id) => setStateRaw((s) => ({
      ...s,
      docs: s.docs.map((d) => {
        if (d.id !== id) return d;
        const next: Record<DocItem["status"], DocItem["status"]> = {
          Uploaded: "Processing", Processing: "Needs Review", "Needs Review": "Approved", Approved: "Approved",
        };
        return { ...d, status: next[d.status] };
      }),
    })),
    toggleOnline: () => setStateRaw((s) => ({ ...s, online: !s.online })),
    markTourSeen: () => setStateRaw((s) => ({ ...s, tourSeen: true })),
    touchEquipment: (id) => setStateRaw((s) => ({ ...s, recentEquipmentIds: [id, ...(s.recentEquipmentIds ?? []).filter((x) => x !== id)].slice(0, 6) })),
    setArrival: (jobId, method, ts) => setStateRaw((s) => ({
      ...s,
      jobs: s.jobs.map((j) => j.id === jobId ? { ...j, arrivedAt: ts ?? new Date().toISOString(), arrivalMethod: method, status: j.status === "Completed" ? j.status : "On Site" } : j),
    })),
    setArrivalDetected: (jobId, ts) => setStateRaw((s) => ({
      ...s, jobs: s.jobs.map((j) => j.id === jobId && !j.arrivalDetectedAt ? { ...j, arrivalDetectedAt: ts } : j),
    })),
    startPause: (jobId, reason, stage, notes) => setStateRaw((s) => ({
      ...s,
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        if ((j.pauses ?? []).some((p) => !p.endedAt)) return j; // already paused
        const rec: PauseRecord = {
          id: `pa-${Date.now()}`, startedAt: new Date().toISOString(),
          reason, notes, stage, userId: s.currentUserId,
          billable: reason !== "Lunch / break",
        };
        return { ...j, pauses: [...(j.pauses ?? []), rec] };
      }),
    })),
    endPause: (jobId) => setStateRaw((s) => ({
      ...s,
      jobs: s.jobs.map((j) => {
        if (j.id !== jobId) return j;
        const pauses = (j.pauses ?? []).map((p) => p.endedAt ? p : { ...p, endedAt: new Date().toISOString() });
        return { ...j, pauses };
      }),
    })),
    addPartRequest: (pr) => setStateRaw((s) => ({ ...s, partRequests: [pr, ...s.partRequests] })),
    updatePartRequest: (id, patch) => setStateRaw((s) => ({
      ...s,
      partRequests: s.partRequests.map((p) => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p),
    })),
    addAiFeedback: (fb) => setStateRaw((s) => ({ ...s, aiFeedback: [fb, ...(s.aiFeedback ?? [])] })),
    markAiFeedbackReviewed: (id, reviewed) => setStateRaw((s) => ({ ...s, aiFeedback: (s.aiFeedback ?? []).map((f) => f.id === id ? { ...f, reviewed } : f) })),
  }), [state, setState]);

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}

export function useCurrentUser() {
  const { state } = useStore();
  return state.users.find((u) => u.id === state.currentUserId)!;
}

// Helpers exported for components
export function jobPausedMs(job: Job, now = Date.now()): number {
  const legacy = job.pausedMs ?? 0;
  const legacyActive = job.pausedAt ? now - +new Date(job.pausedAt) : 0;
  const fromRecords = (job.pauses ?? []).reduce((sum, p) => {
    const end = p.endedAt ? +new Date(p.endedAt) : now;
    return sum + Math.max(0, end - +new Date(p.startedAt));
  }, 0);
  return legacy + legacyActive + fromRecords;
}

export function jobActivePause(job: Job): PauseRecord | undefined {
  return (job.pauses ?? []).find((p) => !p.endedAt);
}
