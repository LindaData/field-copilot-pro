export type SourceKind =
  | "manufacturer_verified"
  | "company_sop"
  | "prior_job"
  | "technician_observation"
  | "demo_inference";

export interface Source {
  kind: SourceKind;
  title: string;
  ref?: string; // page/section
  url?: string;
}

export interface Spec {
  key: string;
  label: string;
  value: string;
  group: "Capacity" | "Compressor" | "Fan" | "Refrigeration" | "Electrical" | "Physical" | "Certifications";
  source: Source;
}

export interface Equipment {
  id: string;
  manufacturer: string;
  model: string;
  serial: string;
  family: string;
  type: string;
  installDate?: string;
  location?: string;
  specs: Spec[];
  manualUrls: { label: string; url: string }[];
}

export interface Customer { id: string; name: string; phone: string; email?: string; }
export interface Property { id: string; customerId: string; address: string; accessNotes?: string; }

export type JobStatus =
  | "Scheduled" | "En Route" | "On Site" | "Diagnosing"
  | "Waiting for Approval" | "Waiting for Parts" | "Completed" | "Follow-Up";

export interface Job {
  id: string;
  customerId: string;
  propertyId: string;
  equipmentId?: string;
  technicianId: string;
  complaint: string;
  status: JobStatus;
  scheduledFor: string; // ISO
  priority: "Low" | "Normal" | "High";
  notes?: string;
  travelStartedAt?: string;
  arrivedAt?: string;
  diagnosisStartedAt?: string;
  pausedAt?: string;
  pausedMs?: number;
  completedAt?: string;
}

export interface Measurement {
  id: string;
  jobId: string;
  stepId: string;
  label: string;
  value: string;
  unit: string;
  withinRange?: boolean;
  rangeNote?: string;
  source: Source;
  ts: string;
}

export interface DiagStepResult {
  stepId: string;
  branch?: string;
  answer?: string;
  ack?: boolean;
  ts: string;
  notes?: string;
}

export interface DiagnosticSession {
  id: string;
  jobId: string;
  templateId: string;
  currentStepId: string;
  results: DiagStepResult[];
  measurements: Measurement[];
  hypothesis?: string;
  confidence?: "Low" | "Medium" | "High";
  completed?: boolean;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  brand: string;
  notes?: string;
  cost: number;
  price: number;
  truckStock: number;
  reorderPoint: number;
  leadTimeDays: number;
  compatibilityNote?: string;
}

export interface JobPart { jobId: string; partId: string; qty: number; }

export interface Authorization {
  jobId: string;
  signedBy?: string;
  signatureDataUrl?: string;
  approvedAt?: string;
  total?: number;
  email?: string;
  decision?: "approved" | "declined";
}

export interface DocItem {
  id: string;
  title: string;
  manufacturer?: string;
  model?: string;
  category: "service_manual" | "installation_manual" | "spec_sheet" | "wiring_diagram" | "service_bulletin" | "company_sop" | "training_guide";
  url: string;
  status: "Uploaded" | "Processing" | "Needs Review" | "Approved";
  uploadedAt: string;
}

export interface KnowledgeCase {
  id: string;
  title: string;
  model: string;
  symptom: string;
  cause: string;
  fix: string;
  technician: string;
  approved: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  role: "Owner" | "ServiceManager" | "SeniorTech" | "Technician" | "Office";
  avatarColor: string;
}

export interface Company { name: string; phone: string; address: string; laborRate: number; tax: number; }
