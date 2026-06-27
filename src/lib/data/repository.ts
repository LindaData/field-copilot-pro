// Repository abstraction so the app can target Demo, a hosted API, or AWS
// (EC2 + RDS + S3) without rewriting feature code.
//
// Phase A1 ships the interface and the Demo adapter (a thin wrapper around the
// existing in-memory store). HostedApiRepository and AwsApiRepository are
// declared here as stubs so callers can already program against the interface;
// they will be filled in by phases A4 and A6.

import type {
  Authorization, Company, Customer, DiagnosticSession, DocItem, Equipment, Job, JobPart,
  KnowledgeCase, Part, PartRequest, Property, UserProfile, AiFeedback,
} from "@/lib/types";

export type DataProvider = "demo" | "cloud" | "aws";

export interface FileRef {
  id: string;
  companyId: string;
  customerId?: string;
  propertyId?: string;
  equipmentId?: string;
  jobId?: string;
  uploadedBy: string;
  category: "manual" | "spec-sheet" | "wiring" | "label" | "job-photo" | "video" | "voice" | "signature" | "report" | "feedback" | "export";
  originalFilename: string;
  safeFilename: string;
  s3Bucket: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  visibility: "internal" | "customer-shareable";
  processing: "pending" | "ready" | "failed";
  deletedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  at: string;
  detail?: Record<string, unknown>;
}

/**
 * The full data surface the app needs. Adapters MUST implement every method;
 * adapters that can't yet should throw a friendly `RepositoryUnavailableError`
 * so the UI can surface "Not yet configured" instead of a raw stack trace.
 */
export interface DataRepository {
  readonly provider: DataProvider;

  // Identity
  getCompany(): Promise<Company>;
  listUsers(): Promise<UserProfile[]>;

  // Customers & properties
  listCustomers(): Promise<Customer[]>;
  listProperties(): Promise<Property[]>;

  // Equipment
  listEquipment(): Promise<Equipment[]>;
  getEquipment(id: string): Promise<Equipment | null>;

  // Jobs
  listJobs(): Promise<Job[]>;
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, patch: Partial<Job>): Promise<void>;

  // Diagnostics / measurements / observations live inside DiagnosticSession
  getDiag(jobId: string): Promise<DiagnosticSession | null>;
  saveDiag(jobId: string, session: DiagnosticSession): Promise<void>;

  // Parts / inventory / labor / authorizations
  listParts(): Promise<Part[]>;
  listJobParts(jobId: string): Promise<JobPart[]>;
  listPartRequests(jobId: string): Promise<PartRequest[]>;
  getAuth(jobId: string): Promise<Authorization | null>;

  // Knowledge / docs
  listDocs(): Promise<DocItem[]>;
  listKnowledge(): Promise<KnowledgeCase[]>;

  // AI feedback
  listAiFeedback(): Promise<AiFeedback[]>;

  // Files (S3-backed in cloud/aws; in-memory in demo)
  listFiles(filter?: { jobId?: string; equipmentId?: string }): Promise<FileRef[]>;
  recordFileRef(ref: FileRef): Promise<void>;

  // Audit
  appendAudit(entry: AuditLogEntry): Promise<void>;
  listAudit(filter?: { targetType?: string; targetId?: string }): Promise<AuditLogEntry[]>;
}

export class RepositoryUnavailableError extends Error {
  constructor(public readonly provider: DataProvider, public readonly friendlyMessage: string) {
    super(friendlyMessage);
    this.name = "RepositoryUnavailableError";
  }
}
