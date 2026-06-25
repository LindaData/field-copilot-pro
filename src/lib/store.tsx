import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as seed from "./seed";
import type {
  Authorization, Company, Customer, DiagnosticSession, DocItem, Equipment, Job,
  JobPart, KnowledgeCase, Part, Property, UserProfile, JobStatus, Measurement, DiagStepResult,
} from "./types";

const KEY = "hvac-copilot-store-v1";

type Role = "guest-tech" | "guest-owner" | "user";

interface StoreState {
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
  auths: Authorization[];
  docs: DocItem[];
  knowledge: KnowledgeCase[];
  diag: Record<string, DiagnosticSession>; // by jobId
  online: boolean;
  tourSeen: boolean;
  recentEquipmentIds: string[];
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
  auths: seed.AUTHORIZATIONS,
  docs: seed.DOCS,
  knowledge: seed.KNOWLEDGE,
  diag: { "j-1": seed.INITIAL_DIAG },
  online: true,
  tourSeen: false,
  recentEquipmentIds: ["eq-1"],
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
  saveMeasurement: (jobId: string, m: Measurement) => void;
  setHypothesis: (jobId: string, h: string, c: "Low" | "Medium" | "High") => void;
  completeDiag: (jobId: string) => void;
  addJobPart: (jp: JobPart) => void;
  setAuth: (a: Authorization) => void;
  addDoc: (d: DocItem) => void;
  promoteDoc: (id: string) => void;
  toggleOnline: () => void;
  markTourSeen: () => void;
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
      const fresh: DiagnosticSession = { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [] };
      setStateRaw((s) => ({ ...s, diag: { ...s.diag, [jobId]: fresh } }));
      return fresh;
    },
    saveStep: (jobId, result, nextStepId) => setStateRaw((s) => {
      const d = s.diag[jobId] ?? { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [] };
      const results = [...d.results.filter((r) => r.stepId !== result.stepId), result];
      return { ...s, diag: { ...s.diag, [jobId]: { ...d, results, currentStepId: nextStepId ?? d.currentStepId } } };
    }),
    saveMeasurement: (jobId, m) => setStateRaw((s) => {
      const d = s.diag[jobId] ?? { id: `ds-${jobId}`, jobId, templateId: "no-cooling-v1", currentStepId: "A", results: [], measurements: [] };
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
