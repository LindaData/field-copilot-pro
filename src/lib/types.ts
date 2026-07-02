export type SourceKind =
  | "manufacturer_verified"
  | "company_sop"
  | "prior_job"
  | "technician_observation"
  | "demo_inference"
  | "fictional_demo"
  | "verification_required";

export type VerificationStatus =
  | "Manufacturer Verified"
  | "Approved Company SOP"
  | "Technician Observation"
  | "Prior Demo Job"
  | "Fictional Demo Data"
  | "Demo Equipment — Specifications Not Verified"
  | "Verification Required";



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
  unit?: string;
  group: "Capacity" | "Compressor" | "Fan" | "Refrigeration" | "Electrical" | "Physical" | "Certifications";
  source: Source;
  /** Linked DocItem id (preferred) */
  sourceDocumentId?: string;
  sourcePage?: number | string;
  verificationStatus?: VerificationStatus;
  approvedBy?: string;
  approvedAt?: string;
  reviewNotes?: string;
  lastReviewedAt?: string;
  conflicts?: string;
  notes?: string;
}

export interface ErrorCode {
  code: string;
  meaning: string;
  likelyCauses: string[];
  safeChecks: string[];
  source: Source;
  sourceDocumentId?: string;
  sourcePage?: number | string;
  trigger?: string;
  approvedInterpretation?: string;
  approvedStartingPoint?: string;
  safetyConsiderations?: string;
  alternativeCauses?: string[];
  approvedBy?: string;
  approvedAt?: string;
  lastReviewedAt?: string;
  approvalNotes?: string;
}

export interface BomItem {
  ref: string;          // e.g. "C1"
  description: string;  // e.g. "Dual-run capacitor"
  specHint?: string;    // e.g. "40/5 µF 440 V"
  approvedPartIds?: string[];
  source: Source;
  manufacturerPartNumber?: string;
  applicability?: string;
  serialApplicability?: string;
  supersededBy?: string;
  approvedSubstitute?: string;
  sourceDocumentId?: string;
  sourcePage?: number | string;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  compatibilityStatus?: "Verified" | "Likely" | "Unknown" | "Not Compatible";
  stockStatus?: "In Stock" | "Order Required" | "Backordered";
  supplier?: string;
  installationNotes?: string;
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
  systemId?: string;
  parentEquipmentId?: string;
  role?: import("./systems").EquipmentRole;
  category?: import("./systems").EquipmentCategory;
  fuelType?: import("./systems").FuelType;
  verificationStatus?: VerificationStatus;
  nameplatePhotoId?: string;
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

export interface SystemRecord {
  id: string;
  customerId: string;
  propertyId: string;
  nickname: string;
  configuration: import("./systems").SystemConfiguration;
  serviceClass: import("./systems").ServiceClass;
  fuelType: import("./systems").FuelType;
  equipmentIds: string[];
  accessoryIds: string[];
  installDate?: string;
  warrantyActive?: boolean;
  notes?: string;
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

export type PropertyType =
  | "Single-family" | "Townhome" | "Condo" | "Retail" | "Office"
  | "Restaurant" | "Warehouse" | "Multi-unit";

export interface Customer {
  id: string; name: string; phone: string; email?: string;
  city?: string;
  maintenancePlan?: boolean;
  commPreference?: "Phone" | "Text" | "Email";
  isDemo?: boolean;
}
export interface Property {
  id: string; customerId: string; address: string; accessNotes?: string;
  city?: string;
  propertyType?: PropertyType;
  serviceClass?: import("./systems").ServiceClass;
  parkingNotes?: string;
  pets?: string;
  warrantyActive?: boolean;
  /** Dispatch-sourced access code. Current demo surfaces it to technicians for arrival readiness. */
  gateCode?: string;
  lat?: number; lng?: number; geofenceRadiusFt?: number;
}

export type JobStatus =
  | "Unassigned" | "Scheduled" | "En Route" | "Near Destination"
  | "On Site" | "Diagnosing" | "Paused" | "Waiting for Customer"
  | "Waiting for Approval" | "Waiting for Parts" | "Repairing"
  | "Verifying" | "Documentation" | "Completed" | "Follow-Up" | "Cancelled";


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
  systemId?: string;
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
  /** Full job title shown on profile and detail screens (e.g. "Co-Owner & General Manager"). */
  fullTitle?: string;
  avatarColor: string;
  active?: boolean;
}

export interface Company {
  name: string;
  phone: string;
  address: string;
  laborRate: number;
  tax: number;
  establishedYear?: number;
  weekdayHours?: string;
  weekendHours?: string;
  services?: string[];
  serviceAreas?: string[];
  logoDataUrl?: string;
  brandPrimary?: string;
  brandAccent?: string;
}


export interface Photo {
  id: string;
  jobId?: string;
  equipmentId?: string;
  customerId?: string;
  kind: "Nameplate" | "Before" | "After" | "Issue" | "Other";
  caption?: string;
  /** Tailwind class used as a placeholder swatch (no binary in the demo). */
  swatchClass?: string;
  capturedAt: string;
  capturedBy: string;
}

export interface CustomerFeedback {
  id: string;
  jobId: string;
  customerId: string;
  technicianId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  communication?: 1 | 2 | 3 | 4 | 5;
  timeliness?: 1 | 2 | 3 | 4 | 5;
  explanationClarity?: 1 | 2 | 3 | 4 | 5;
  cleanliness?: 1 | 2 | 3 | 4 | 5;
  overall?: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  testimonialOk?: boolean;
  submittedAt: string;
}

export interface TechFeedback {
  id: string;
  jobId?: string;
  technicianId: string;
  diagnosticStepId?: string;
  helpful?: boolean;
  confusing?: boolean;
  incorrect?: boolean;
  unsafe?: boolean;
  missingSource?: boolean;
  suggestedImprovement?: string;
  voiceNotePlaceholder?: string;
  submittedAt: string;
}

export interface ServiceReport {
  id: string;
  jobId: string;
  customerId: string;
  technicianId: string;
  summary: string;
  recommendations?: string[];
  generatedAt: string;
}

