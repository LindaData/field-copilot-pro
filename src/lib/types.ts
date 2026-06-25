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

export interface ErrorCode {
  code: string;
  meaning: string;
  likelyCauses: string[];
  safeChecks: string[];
  source: Source;
}

export interface BomItem {
  ref: string;          // e.g. "C1"
  description: string;  // e.g. "Dual-run capacitor"
  specHint?: string;    // e.g. "40/5 µF 440 V"
  approvedPartIds?: string[];
  source: Source;
}

export interface WiringDiagram {
  id: string;
  title: string;
  url: string;
  source: Source;
}

export interface Procedure {
  id: string;
  title: string;
  summary: string;
  steps: string[];
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
  errorCodes?: ErrorCode[];
  bom?: BomItem[];
  approvedReplacementPartIds?: string[];
  wiringDiagrams?: WiringDiagram[];
  procedureIds?: string[];
}

export type AiFeedbackCategory =
  | "helpful" | "incorrect" | "unsafe"
  | "missing-info" | "wrong-source" | "better-next-step";

export interface AiFeedback {
  id: string;
  ts: string;
  userId: string;
  jobId?: string;
  equipmentId?: string;
  question: string;
  answerSummary: string;
  confidence: string;
  isSimulated: boolean;
  category: AiFeedbackCategory;
  comment?: string;
  reviewed?: boolean;
}

export interface Customer {
  id: string; name: string; phone: string; email?: string;
  city?: string;
  maintenancePlan?: boolean;
}
export interface Property {
  id: string; customerId: string; address: string; accessNotes?: string;
  city?: string;
  lat?: number; lng?: number; geofenceRadiusFt?: number;
}

export type JobStatus =
  | "Scheduled" | "En Route" | "On Site" | "Diagnosing"
  | "Waiting for Approval" | "Waiting for Parts" | "Completed" | "Follow-Up";

export type ArrivalMethod = "gps-detected" | "tech-confirmed" | "manual" | "office-adjusted";

export type PauseReason =
  | "Lunch / break" | "Waiting for customer" | "Waiting for approval"
  | "Waiting for parts" | "Calling senior technician" | "Researching documentation"
  | "Equipment inaccessible" | "Weather" | "Other";

export type JobStage = "Travel" | "On Site" | "Diagnosis" | "Repair" | "Documentation";

export interface PauseRecord {
  id: string;
  startedAt: string;
  endedAt?: string;
  reason: PauseReason;
  notes?: string;
  stage: JobStage;
  userId: string;
  billable?: boolean;
  locationStatus?: string;
}

export type JobType = "Repair" | "Maintenance" | "Install" | "Inspection" | "Warranty";
export type ServiceCategory = "No Cooling" | "No Heat" | "Leak" | "Noise" | "Tune-Up" | "Install" | "Thermostat" | "Other";
export type BillingType = "Billable" | "Warranty" | "Maintenance Plan";

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
  arrivalMethod?: ArrivalMethod;
  arrivalDetectedAt?: string;
  diagnosisStartedAt?: string;
  /** legacy single-pause fields. New code uses pauses[]. */
  pausedAt?: string;
  pausedMs?: number;
  pauses?: PauseRecord[];
  completedAt?: string;
  // ---- demo metrics (seeded; written by future real flows) ----
  jobType?: JobType;
  serviceCategory?: ServiceCategory;
  billingType?: BillingType;
  isCallback?: boolean;
  originalJobId?: string;
  firstTimeFix?: boolean;
  estimateApproved?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  revenue?: number;
  partsCost?: number;
  laborCost?: number;
  travelMinutes?: number;
  diagnosticMinutes?: number;
  activeLaborMinutes?: number;
  pausedMinutes?: number;
  totalDurationMinutes?: number;
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

export type DiagStepStatus = "complete" | "current" | "skipped" | "needs-review" | "pending";

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
  visitedStepIds?: string[];
  invalidatedStepIds?: string[];
}

export type PartRequestStatus =
  | "Identification Needed" | "Compatibility Review" | "Requested"
  | "Approved" | "Ordered" | "Available at Warehouse"
  | "Assigned to Technician" | "Installed" | "Cancelled";

export interface PartRequest {
  id: string;
  jobId: string;
  customerId: string;
  equipmentId?: string;
  technicianId: string;
  name: string;
  partNumber?: string;
  equipmentModel?: string;
  specs?: string;
  qty: number;
  urgency: "Low" | "Normal" | "High" | "Critical";
  supplier?: string;
  photoDataUrl?: string;
  notes?: string;
  compatibility: "Unknown" | "Likely" | "Verified by qualified user";
  status: PartRequestStatus;
  createdAt: string;
  updatedAt: string;
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
  active?: boolean;
}

export interface Company { name: string; phone: string; address: string; laborRate: number; tax: number; }
