// DemoDataRepository — wraps the existing in-memory StoreState so feature code
// can be migrated to call `repo.*` without changing today's behavior.

import * as seed from "@/lib/seed";
import type {
  AuditLogEntry, DataRepository, FileRef,
} from "./repository";
import type {
  Authorization, Company, Customer, DiagnosticSession, DocItem, Equipment, Job, JobPart,
  KnowledgeCase, Part, PartRequest, Property, UserProfile, AiFeedback,
} from "@/lib/types";

interface DemoState {
  files: FileRef[];
  audit: AuditLogEntry[];
}

const memory: DemoState = { files: [], audit: [] };

// The store is the source of truth in demo mode; pass a snapshot getter so we
// always read the latest StoreState without coupling to React context here.
export function createDemoRepository(getSnapshot: () => {
  company: Company;
  users: UserProfile[];
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
  aiFeedback: AiFeedback[];
}): DataRepository {
  const snap = () => getSnapshot();
  return {
    provider: "demo",
    async getCompany() { return snap().company; },
    async listUsers() { return snap().users; },
    async listCustomers() { return snap().customers; },
    async listProperties() { return snap().properties; },
    async listEquipment() { return snap().equipment; },
    async getEquipment(id) { return snap().equipment.find((e) => e.id === id) ?? null; },
    async listJobs() { return snap().jobs; },
    async getJob(id) { return snap().jobs.find((j) => j.id === id) ?? null; },
    async updateJob() { /* demo writes happen through useStore */ },
    async getDiag(jobId) { return snap().diag[jobId] ?? null; },
    async saveDiag() { /* demo writes happen through useStore */ },
    async listParts() { return snap().parts; },
    async listJobParts(jobId) { return snap().jobParts.filter((jp) => jp.jobId === jobId); },
    async listPartRequests(jobId) { return snap().partRequests.filter((pr) => pr.jobId === jobId); },
    async getAuth(jobId) { return snap().auths.find((a) => a.jobId === jobId) ?? null; },
    async listDocs() { return snap().docs; },
    async listKnowledge() { return snap().knowledge; },
    async listAiFeedback() { return snap().aiFeedback; },
    async listFiles(filter) {
      return memory.files.filter((f) =>
        (!filter?.jobId || f.jobId === filter.jobId) &&
        (!filter?.equipmentId || f.equipmentId === filter.equipmentId)
      );
    },
    async recordFileRef(ref) { memory.files.push(ref); },
    async appendAudit(entry) { memory.audit.push(entry); },
    async listAudit(filter) {
      return memory.audit.filter((a) =>
        (!filter?.targetType || a.targetType === filter.targetType) &&
        (!filter?.targetId || a.targetId === filter.targetId)
      );
    },
  };
}

// Default factory bound to the seed data; useful for non-React callers (tests).
export const defaultDemoRepository = createDemoRepository(() => ({
  company: seed.COMPANY,
  users: seed.USERS,
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
  aiFeedback: [],
}));
