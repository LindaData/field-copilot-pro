import type {
  Company, Customer, DocItem, Equipment, Job, JobPart, KnowledgeCase, Part,
  Property, Source, Spec, UserProfile, Authorization, DiagnosticSession,
  JobStatus, JobType, ServiceCategory, BillingType,
} from "./types";

const goodmanPdfSource: Source = {
  kind: "manufacturer_verified",
  title: "Goodman SS-GSXN3, Product Specifications",
  ref: "p.3",
  url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf",
};
const goodmanProductSource: Source = {
  kind: "manufacturer_verified",
  title: "Goodman GSXN3 product page",
  url: "https://www.goodmanmfg.com/products/air-conditioners/gsxn3",
};

const mfg = (label: string, value: string, group: Spec["group"], key: string): Spec => ({
  key, label, value, group, source: goodmanPdfSource,
});

export const COMPANY: Company = {
  name: "Caloosa Cooling",
  phone: "(239) 555-0144",
  address: "1820 SE 47th Ter, Cape Coral, FL 33904",
  laborRate: 145,
  tax: 7.0,
};

export const USERS: UserProfile[] = [
  { id: "u-owner", name: "Mike Torres", role: "Owner", avatarColor: "bg-amber-500", active: true },
  { id: "u-alex", name: "Alex Reed", role: "SeniorTech", avatarColor: "bg-blue-600", active: true },
  { id: "u-jordan", name: "Jordan Lee", role: "Technician", avatarColor: "bg-emerald-600", active: true },
  { id: "u-sam", name: "Sam Patel", role: "Technician", avatarColor: "bg-rose-600", active: true },
  { id: "u-pat", name: "Pat Lowry", role: "Technician", avatarColor: "bg-slate-500", active: false },
];

export const CUSTOMERS: Customer[] = [
  { id: "c-1", name: "Linda Hayes", phone: "(239) 555-0188", email: "linda@example.com", city: "Cape Coral", maintenancePlan: true },
  { id: "c-2", name: "Marcus Greene", phone: "(239) 555-0121", city: "Fort Myers" },
  { id: "c-3", name: "Priya Shah", phone: "(239) 555-0133", email: "priya@example.com", city: "Naples" },
  { id: "c-4", name: "Westview Apartments", phone: "(239) 555-0145", city: "Bonita Springs", maintenancePlan: true },
  { id: "c-5", name: "Rivertown Cafe", phone: "(239) 555-0167", city: "Fort Myers" },
  { id: "c-6", name: "Coastal Dental", phone: "(239) 555-0172", email: "ops@coastaldental.example", city: "Cape Coral" },
  { id: "c-7", name: "Banyan Bay HOA", phone: "(239) 555-0190", city: "Naples", maintenancePlan: true },
  { id: "c-8", name: "Tom Whitmore", phone: "(239) 555-0211", city: "Bonita Springs" },
  { id: "c-9", name: "Sunset Storage", phone: "(239) 555-0234", city: "Fort Myers" },
  { id: "c-10", name: "Janet Kim", phone: "(239) 555-0256", email: "janet@example.com", city: "Cape Coral" },
];

export const PROPERTIES: Property[] = [
  { id: "p-1", customerId: "c-1", address: "412 SE 16th St, Cape Coral, FL", city: "Cape Coral", accessNotes: "Gate code 2244. Dog in back yard.", lat: 26.5629, lng: -81.9495, geofenceRadiusFt: 200 },
  { id: "p-2", customerId: "c-2", address: "88 Edison Ave, Fort Myers, FL", city: "Fort Myers", lat: 26.6406, lng: -81.8723, geofenceRadiusFt: 200 },
  { id: "p-3", customerId: "c-3", address: "1900 Gulf Shore Blvd Apt 12B, Naples, FL", city: "Naples", accessNotes: "Buzz #12B", lat: 26.1420, lng: -81.8060, geofenceRadiusFt: 200 },
  { id: "p-4", customerId: "c-4", address: "300 Westview Cir, Bonita Springs, FL", city: "Bonita Springs", accessNotes: "Office key at leasing.", lat: 26.3398, lng: -81.7787, geofenceRadiusFt: 250 },
  { id: "p-5", customerId: "c-5", address: "55 First St, Fort Myers, FL", city: "Fort Myers", lat: 26.6428, lng: -81.8721, geofenceRadiusFt: 200 },
  { id: "p-6", customerId: "c-6", address: "2210 Del Prado Blvd, Cape Coral, FL", city: "Cape Coral", lat: 26.5750, lng: -81.9410, geofenceRadiusFt: 200 },
  { id: "p-7", customerId: "c-7", address: "750 Banyan Bay Dr, Naples, FL", city: "Naples", lat: 26.1500, lng: -81.7900, geofenceRadiusFt: 250 },
  { id: "p-8", customerId: "c-8", address: "144 Bayshore Dr, Bonita Springs, FL", city: "Bonita Springs", lat: 26.3422, lng: -81.7777, geofenceRadiusFt: 200 },
  { id: "p-9", customerId: "c-9", address: "1200 Colonial Blvd, Fort Myers, FL", city: "Fort Myers", lat: 26.5990, lng: -81.8721, geofenceRadiusFt: 200 },
  { id: "p-10", customerId: "c-10", address: "780 SW 22nd Ln, Cape Coral, FL", city: "Cape Coral", lat: 26.5599, lng: -81.9610, geofenceRadiusFt: 200 },
];

const goodmanGSXN3Specs: Spec[] = [
  mfg("Product family", "Goodman GSXN3", "Capacity", "family"),
  mfg("Type", "Split-system air conditioner", "Capacity", "type"),
  mfg("Nominal cooling", "24,000 BTU/h", "Capacity", "btu"),
  mfg("Nominal size", "2 tons", "Capacity", "tons"),
  mfg("Published family efficiency", "Up to 14.5 SEER2", "Capacity", "seer2"),
  mfg("Compressor stage", "Single", "Compressor", "comp-stage"),
  mfg("Compressor type", "Rotary", "Compressor", "comp-type"),
  mfg("Compressor RLA", "8.4 A", "Compressor", "rla"),
  mfg("Compressor LRA", "41.2 A", "Compressor", "lra"),
  mfg("Condenser fan motor", "PSC", "Fan", "fan-type"),
  mfg("Fan motor horsepower", "1/8 HP", "Fan", "fan-hp"),
  mfg("Fan motor FLA", "0.70 A", "Fan", "fan-fla"),
  mfg("Liquid line size", "3/8 in. O.D.", "Refrigeration", "liq-line"),
  mfg("Suction line size", "3/4 in. O.D.", "Refrigeration", "suc-line"),
  mfg("Liquid valve size", "3/8 in. O.D.", "Refrigeration", "liq-valve"),
  mfg("Suction valve size", "3/4 in. O.D.", "Refrigeration", "suc-valve"),
  mfg("Refrigerant factory charge", "71 oz (per 15 ft of 3/8\" liquid line; adjust per install instructions)", "Refrigeration", "charge"),
  { key: "drier", label: "Factory-installed filter drier", value: "Yes", group: "Refrigeration", source: goodmanPdfSource },
  mfg("Electrical", "208/230 V • 1 phase • 60 Hz", "Electrical", "elec"),
  mfg("Minimum circuit ampacity (MCA)", "11.2 A", "Electrical", "mca"),
  mfg("Maximum overcurrent protection (MOP)", "15 A", "Electrical", "mop"),
  mfg("Min / Max voltage", "197 V / 253 V", "Electrical", "vrange"),
  { key: "contactor", label: "Contactor connection", value: "Lug connection", group: "Electrical", source: goodmanPdfSource },
  mfg("Equipment weight", "125 lb", "Physical", "weight"),
  mfg("Shipping weight", "138 lb", "Physical", "ship-weight"),
  mfg("Published sound value", "73 dBA", "Physical", "sound"),
  { key: "ahri", label: "AHRI certified", value: "Yes", group: "Certifications", source: goodmanPdfSource },
  { key: "etl", label: "ETL listed", value: "Yes", group: "Certifications", source: goodmanPdfSource },
  { key: "valves", label: "Service valves", value: "Sweat connections with accessible gauge ports", group: "Certifications", source: goodmanPdfSource },
];

const goodmanErrorCodes = [
  { code: "1F", meaning: "High pressure switch open", likelyCauses: ["Dirty/blocked condenser coil", "Failed condenser fan motor", "Overcharge", "Restricted liquid line"], safeChecks: ["Wash coil with power off", "Confirm fan rotation and amps vs FLA", "Measure liquid and suction pressures against manufacturer chart"], source: goodmanPdfSource },
  { code: "2F", meaning: "Low pressure switch open", likelyCauses: ["Refrigerant loss", "Restricted metering device", "Iced indoor coil"], safeChecks: ["Inspect for oil residue at fittings", "Verify airflow across indoor coil", "Compare superheat to target"], source: goodmanPdfSource },
  { code: "3F", meaning: "Compressor overload trip", likelyCauses: ["Locked rotor", "Weak run capacitor", "Low line voltage"], safeChecks: ["Confirm line voltage within 197 V – 253 V", "Bench-test capacitor against printed µF rating", "Measure LRA only with manufacturer-approved procedure"], source: goodmanPdfSource },
  { code: "4F", meaning: "Outdoor fan motor fault", likelyCauses: ["Failed condenser fan motor", "Failed fan capacitor section", "Wiring fault"], safeChecks: ["Confirm 24 V at contactor coil", "Measure fan motor amps vs 0.70 A FLA", "Inspect wiring per diagram"], source: goodmanPdfSource },
];

const goodmanBom = [
  { ref: "C1", description: "Dual-run capacitor", specHint: "Verify printed µF / voltage on installed component", approvedPartIds: ["pt-1"], source: goodmanPdfSource },
  { ref: "K1", description: "Compressor contactor", specHint: "30 A 2-pole, 24 V coil", approvedPartIds: ["pt-2"], source: goodmanPdfSource },
  { ref: "FD", description: "Liquid line filter drier (factory)", specHint: "3/8 in. O.D.", approvedPartIds: ["pt-3"], source: goodmanPdfSource },
  { ref: "M2", description: "Condenser fan motor", specHint: "1/8 HP PSC, 0.70 A FLA", approvedPartIds: ["pt-4"], source: goodmanPdfSource },
];

const goodmanDiagrams = [
  { id: "wd-1", title: "GSXN3 line voltage wiring", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf#page=5", source: goodmanPdfSource },
  { id: "wd-2", title: "GSXN3 low voltage / 24 V controls", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf#page=6", source: goodmanPdfSource },
];

export const EQUIPMENT: Equipment[] = [
  {
    id: "eq-1", manufacturer: "Goodman", model: "GSXN3N2410A*", serial: "2403A12345",
    family: "GSXN3", type: "Heat Pump", installDate: "2024-05-12", location: "Side yard, north pad",
    specs: goodmanGSXN3Specs,
    manualUrls: [
      { label: "Goodman GSXN3 product page", url: goodmanProductSource.url! },
      { label: "SS-GSXN3 specification sheet (PDF)", url: goodmanPdfSource.url! },
    ],
    errorCodes: goodmanErrorCodes,
    bom: goodmanBom,
    approvedReplacementPartIds: ["pt-1", "pt-2", "pt-3", "pt-4"],
    wiringDiagrams: goodmanDiagrams,
  },
  { id: "eq-2", manufacturer: "Carrier", model: "24ACC636A003", serial: "CR8821X", family: "Comfort 16", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-3", manufacturer: "Trane", model: "XR14 4TTR4036L", serial: "TR55001", family: "XR14", type: "Heat Pump", specs: [], manualUrls: [] },
  { id: "eq-4", manufacturer: "Lennox", model: "ML14XC1-024", serial: "LX2299A", family: "Merit", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-5", manufacturer: "Rheem", model: "RA1424AJ1NA", serial: "RH71200", family: "Classic", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-6", manufacturer: "Goodman", model: "GSXN404210", serial: "GD11045", family: "GSXN4", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-7", manufacturer: "Mitsubishi", model: "MUZ-FH12NA", serial: "MT88231", family: "FH", type: "Mini-split", specs: [], manualUrls: [] },
  { id: "eq-8", manufacturer: "Carrier", model: "59TN6A100", serial: "CR9912F", family: "Infinity", type: "Furnace", specs: [], manualUrls: [] },
  { id: "eq-9", manufacturer: "Trane", model: "S9V2-VS", serial: "TR77821", family: "S9V2", type: "Furnace", specs: [], manualUrls: [] },
  { id: "eq-10", manufacturer: "Lennox", model: "XC25-048", serial: "LX5544", family: "Signature", type: "Heat Pump", specs: [], manualUrls: [] },
];

// ---------- Deterministic anchor for relative dates ----------
function makeAnchor() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
const ANCHOR = makeAnchor();

function dayOffset(days: number, h = 10, m = 0): string {
  const d = new Date(ANCHOR);
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function isoMinutesAfter(iso: string, minutes: number): string {
  return new Date(+new Date(iso) + minutes * 60000).toISOString();
}

// ---------- Job spec table (deterministic) ----------
// Each historical job declares its end-to-end timing in minutes so charts
// have real durations. Today's jobs use status-driven fields only.
interface JobSeed {
  id: string;
  customerId: string;
  propertyId: string;
  equipmentId?: string;
  technicianId: string;
  complaint: string;
  status: JobStatus;
  daysAgo: number;
  hour?: number;
  priority?: "Low" | "Normal" | "High";
  jobType: JobType;
  serviceCategory: ServiceCategory;
  billingType: BillingType;
  isCallback?: boolean;
  originalJobId?: string;
  firstTimeFix?: boolean;
  estimateApproved?: boolean;
  rating?: 1 | 2 | 3 | 4 | 5;
  revenue?: number;
  partsCost?: number;
  laborCost?: number;
  travelMin?: number;
  diagnosticMin?: number;
  activeLaborMin?: number;
  pausedMin?: number;
  parts?: { partId: string; qty: number }[];
}

const TODAY_JOBS: JobSeed[] = [
  { id: "j-1", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-1", technicianId: "u-alex", complaint: "No cooling. System runs but blowing warm.", status: "On Site", daysAgo: 0, hour: 10, priority: "High", jobType: "Repair", serviceCategory: "No Cooling", billingType: "Maintenance Plan" },
  { id: "j-2", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-2", technicianId: "u-alex", complaint: "Annual maintenance and filter change.", status: "Scheduled", daysAgo: 0, hour: 13, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Billable" },
  { id: "j-3", customerId: "c-3", propertyId: "p-3", equipmentId: "eq-3", technicianId: "u-alex", complaint: "Thermostat shows offline intermittently.", status: "Scheduled", daysAgo: 0, hour: 15, jobType: "Repair", serviceCategory: "Thermostat", billingType: "Billable" },
  { id: "j-4", customerId: "c-4", propertyId: "p-4", equipmentId: "eq-4", technicianId: "u-jordan", complaint: "Unit 4B warm. Tenants complaining.", status: "En Route", daysAgo: 0, hour: 11, priority: "High", jobType: "Repair", serviceCategory: "No Cooling", billingType: "Maintenance Plan" },
  { id: "j-5", customerId: "c-5", propertyId: "p-5", equipmentId: "eq-5", technicianId: "u-sam", complaint: "Walk-in cooler temp rising.", status: "Diagnosing", daysAgo: 0, hour: 9, priority: "High", jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable" },
  { id: "j-6", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-6", technicianId: "u-jordan", complaint: "Replace capacitor (parts on order).", status: "Waiting for Parts", daysAgo: 0, hour: 16, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable" },
  { id: "j-7", customerId: "c-6", propertyId: "p-6", equipmentId: "eq-7", technicianId: "u-sam", complaint: "Mini-split not heating bedroom.", status: "Waiting for Approval", daysAgo: 0, hour: 8, jobType: "Repair", serviceCategory: "No Heat", billingType: "Billable" },
  { id: "j-8", customerId: "c-3", propertyId: "p-3", technicianId: "u-alex", complaint: "Quote new system replacement.", status: "Follow-Up", daysAgo: 0, hour: 17, priority: "Low", jobType: "Install", serviceCategory: "Install", billingType: "Billable" },
];

const HISTORY_JOBS: JobSeed[] = [
  // Past 7 days
  { id: "j-h1", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-1", technicianId: "u-alex", complaint: "Cap replacement after 1F code.", status: "Completed", daysAgo: 1, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 385, partsCost: 65, laborCost: 145, travelMin: 22, diagnosticMin: 18, activeLaborMin: 35, pausedMin: 0, parts: [{ partId: "pt-1", qty: 1 }] },
  { id: "j-h2", customerId: "c-7", propertyId: "p-7", equipmentId: "eq-10", technicianId: "u-jordan", complaint: "Seasonal tune-up Bldg A.", status: "Completed", daysAgo: 2, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 180, partsCost: 18, laborCost: 145, travelMin: 35, diagnosticMin: 0, activeLaborMin: 55, pausedMin: 10, parts: [{ partId: "pt-6", qty: 1 }] },
  { id: "j-h3", customerId: "c-8", propertyId: "p-8", equipmentId: "eq-4", technicianId: "u-sam", complaint: "Compressor not engaging.", status: "Completed", daysAgo: 3, priority: "High", jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 462, partsCost: 78, laborCost: 218, travelMin: 28, diagnosticMin: 42, activeLaborMin: 60, pausedMin: 15, parts: [{ partId: "pt-2", qty: 1 }] },
  { id: "j-h4", customerId: "c-9", propertyId: "p-9", equipmentId: "eq-5", technicianId: "u-alex", complaint: "Refrigerant leak suspected.", status: "Completed", daysAgo: 4, jobType: "Repair", serviceCategory: "Leak", billingType: "Billable", firstTimeFix: false, estimateApproved: true, rating: 4, revenue: 540, partsCost: 95, laborCost: 290, travelMin: 18, diagnosticMin: 75, activeLaborMin: 110, pausedMin: 25, parts: [{ partId: "pt-3", qty: 1 }] },
  { id: "j-h5", customerId: "c-10", propertyId: "p-10", equipmentId: "eq-6", technicianId: "u-jordan", complaint: "Fan motor noise.", status: "Completed", daysAgo: 5, jobType: "Repair", serviceCategory: "Noise", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 612, partsCost: 240, laborCost: 290, travelMin: 25, diagnosticMin: 30, activeLaborMin: 95, pausedMin: 10, parts: [{ partId: "pt-4", qty: 1 }] },
  { id: "j-h6", customerId: "c-4", propertyId: "p-4", equipmentId: "eq-4", technicianId: "u-sam", complaint: "Unit 2A warranty compressor fault.", status: "Completed", daysAgo: 6, priority: "High", jobType: "Warranty", serviceCategory: "No Cooling", billingType: "Warranty", firstTimeFix: false, estimateApproved: true, rating: 3, revenue: 0, partsCost: 0, laborCost: 145, travelMin: 30, diagnosticMin: 60, activeLaborMin: 120, pausedMin: 30 },

  // Past 30 days
  { id: "j-h7", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-2", technicianId: "u-alex", complaint: "Callback: same no-cooling, parts issue.", status: "Completed", daysAgo: 9, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", isCallback: true, originalJobId: "j-h3", firstTimeFix: false, estimateApproved: true, rating: 2, revenue: 290, partsCost: 65, laborCost: 145, travelMin: 22, diagnosticMin: 35, activeLaborMin: 50, pausedMin: 0, parts: [{ partId: "pt-1", qty: 1 }] },
  { id: "j-h8", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-1", technicianId: "u-jordan", complaint: "Filter change + inspect drain.", status: "Completed", daysAgo: 11, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 165, partsCost: 18, laborCost: 145, travelMin: 18, diagnosticMin: 0, activeLaborMin: 45, pausedMin: 0, parts: [{ partId: "pt-6", qty: 1 }] },
  { id: "j-h9", customerId: "c-6", propertyId: "p-6", equipmentId: "eq-7", technicianId: "u-sam", complaint: "New thermostat install.", status: "Completed", daysAgo: 13, jobType: "Install", serviceCategory: "Thermostat", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 425, partsCost: 110, laborCost: 218, travelMin: 20, diagnosticMin: 0, activeLaborMin: 80, pausedMin: 5 },
  { id: "j-h10", customerId: "c-5", propertyId: "p-5", equipmentId: "eq-5", technicianId: "u-alex", complaint: "Walk-in temp swings investigation.", status: "Completed", daysAgo: 16, jobType: "Inspection", serviceCategory: "Other", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 240, partsCost: 0, laborCost: 218, travelMin: 28, diagnosticMin: 55, activeLaborMin: 60, pausedMin: 15 },
  { id: "j-h11", customerId: "c-3", propertyId: "p-3", equipmentId: "eq-3", technicianId: "u-jordan", complaint: "Iced indoor coil.", status: "Completed", daysAgo: 18, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 520, partsCost: 110, laborCost: 290, travelMin: 35, diagnosticMin: 50, activeLaborMin: 95, pausedMin: 20, parts: [{ partId: "pt-5", qty: 1 }] },
  { id: "j-h12", customerId: "c-7", propertyId: "p-7", equipmentId: "eq-10", technicianId: "u-sam", complaint: "Bldg B tune-up.", status: "Completed", daysAgo: 21, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 195, partsCost: 18, laborCost: 145, travelMin: 32, diagnosticMin: 0, activeLaborMin: 50, pausedMin: 5, parts: [{ partId: "pt-6", qty: 1 }] },
  { id: "j-h13", customerId: "c-8", propertyId: "p-8", equipmentId: "eq-4", technicianId: "u-alex", complaint: "Estimate not approved — declined.", status: "Completed", daysAgo: 23, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", firstTimeFix: false, estimateApproved: false, rating: 3, revenue: 145, partsCost: 0, laborCost: 145, travelMin: 25, diagnosticMin: 40, activeLaborMin: 20, pausedMin: 0 },
  { id: "j-h14", customerId: "c-9", propertyId: "p-9", equipmentId: "eq-8", technicianId: "u-jordan", complaint: "Furnace short cycling.", status: "Completed", daysAgo: 25, jobType: "Repair", serviceCategory: "No Heat", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 410, partsCost: 78, laborCost: 218, travelMin: 22, diagnosticMin: 45, activeLaborMin: 65, pausedMin: 10, parts: [{ partId: "pt-2", qty: 1 }] },
  { id: "j-h15", customerId: "c-10", propertyId: "p-10", equipmentId: "eq-6", technicianId: "u-sam", complaint: "Capacitor weak after storm.", status: "Completed", daysAgo: 27, jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 380, partsCost: 65, laborCost: 145, travelMin: 30, diagnosticMin: 20, activeLaborMin: 40, pausedMin: 0, parts: [{ partId: "pt-1", qty: 1 }] },

  // Past 60 days
  { id: "j-h16", customerId: "c-4", propertyId: "p-4", equipmentId: "eq-4", technicianId: "u-pat", complaint: "Historical Pat job — unit 1A leak repair.", status: "Completed", daysAgo: 34, jobType: "Repair", serviceCategory: "Leak", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 495, partsCost: 95, laborCost: 290, travelMin: 28, diagnosticMin: 60, activeLaborMin: 100, pausedMin: 20, parts: [{ partId: "pt-3", qty: 1 }] },
  { id: "j-h17", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-2", technicianId: "u-pat", complaint: "Historical Pat job — tune-up.", status: "Completed", daysAgo: 41, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 175, partsCost: 18, laborCost: 145, travelMin: 25, diagnosticMin: 0, activeLaborMin: 50, pausedMin: 5, parts: [{ partId: "pt-6", qty: 1 }] },
  { id: "j-h18", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-1", technicianId: "u-alex", complaint: "Callback: parts-related return for fan motor.", status: "Completed", daysAgo: 45, jobType: "Repair", serviceCategory: "Noise", billingType: "Billable", isCallback: true, originalJobId: "j-h5", firstTimeFix: false, estimateApproved: true, rating: 3, revenue: 320, partsCost: 240, laborCost: 145, travelMin: 22, diagnosticMin: 25, activeLaborMin: 60, pausedMin: 10, parts: [{ partId: "pt-4", qty: 1 }] },
  { id: "j-h19", customerId: "c-6", propertyId: "p-6", equipmentId: "eq-7", technicianId: "u-jordan", complaint: "Mini-split mode swap.", status: "Completed", daysAgo: 50, jobType: "Maintenance", serviceCategory: "Tune-Up", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 210, partsCost: 0, laborCost: 145, travelMin: 18, diagnosticMin: 0, activeLaborMin: 60, pausedMin: 0 },
  { id: "j-h20", customerId: "c-5", propertyId: "p-5", equipmentId: "eq-5", technicianId: "u-sam", complaint: "Walk-in pressure switch trip.", status: "Completed", daysAgo: 55, priority: "High", jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 480, partsCost: 78, laborCost: 290, travelMin: 32, diagnosticMin: 65, activeLaborMin: 90, pausedMin: 30, parts: [{ partId: "pt-2", qty: 1 }] },

  // Past 90 days
  { id: "j-h21", customerId: "c-3", propertyId: "p-3", equipmentId: "eq-3", technicianId: "u-alex", complaint: "Quarterly inspection.", status: "Completed", daysAgo: 65, jobType: "Inspection", serviceCategory: "Other", billingType: "Maintenance Plan", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 150, partsCost: 0, laborCost: 145, travelMin: 35, diagnosticMin: 0, activeLaborMin: 45, pausedMin: 0 },
  { id: "j-h22", customerId: "c-7", propertyId: "p-7", equipmentId: "eq-10", technicianId: "u-jordan", complaint: "HOA furnace warranty motor.", status: "Completed", daysAgo: 72, jobType: "Warranty", serviceCategory: "No Heat", billingType: "Warranty", firstTimeFix: true, estimateApproved: true, rating: 4, revenue: 0, partsCost: 0, laborCost: 145, travelMin: 30, diagnosticMin: 50, activeLaborMin: 75, pausedMin: 15 },
  { id: "j-h23", customerId: "c-8", propertyId: "p-8", equipmentId: "eq-9", technicianId: "u-sam", complaint: "Furnace install completion.", status: "Completed", daysAgo: 82, jobType: "Install", serviceCategory: "Install", billingType: "Billable", firstTimeFix: true, estimateApproved: true, rating: 5, revenue: 4250, partsCost: 1800, laborCost: 1450, travelMin: 40, diagnosticMin: 0, activeLaborMin: 380, pausedMin: 45 },
];

const ALL_JOB_SEEDS = [...TODAY_JOBS, ...HISTORY_JOBS];

function buildJob(s: JobSeed): Job {
  const scheduledFor = dayOffset(-s.daysAgo, s.hour ?? 10, 0);
  const base: Job = {
    id: s.id,
    customerId: s.customerId,
    propertyId: s.propertyId,
    equipmentId: s.equipmentId,
    technicianId: s.technicianId,
    complaint: s.complaint,
    status: s.status,
    scheduledFor,
    priority: s.priority ?? "Normal",
    jobType: s.jobType,
    serviceCategory: s.serviceCategory,
    billingType: s.billingType,
    isCallback: s.isCallback ?? false,
    originalJobId: s.originalJobId,
    firstTimeFix: s.firstTimeFix,
    estimateApproved: s.estimateApproved,
    rating: s.rating,
    revenue: s.revenue,
    partsCost: s.partsCost,
    laborCost: s.laborCost,
    travelMinutes: s.travelMin,
    diagnosticMinutes: s.diagnosticMin,
    activeLaborMinutes: s.activeLaborMin,
    pausedMinutes: s.pausedMin,
    totalDurationMinutes:
      (s.travelMin ?? 0) + (s.diagnosticMin ?? 0) + (s.activeLaborMin ?? 0) + (s.pausedMin ?? 0) || undefined,
  };
  if (s.status === "Completed") {
    const travelStart = scheduledFor;
    const arrivedAt = isoMinutesAfter(travelStart, s.travelMin ?? 20);
    const diagStartedAt = isoMinutesAfter(arrivedAt, 2);
    const completedAt = isoMinutesAfter(diagStartedAt, (s.diagnosticMin ?? 0) + (s.activeLaborMin ?? 0) + (s.pausedMin ?? 0));
    Object.assign(base, {
      travelStartedAt: travelStart,
      arrivedAt,
      arrivalMethod: "gps-detected" as const,
      diagnosisStartedAt: diagStartedAt,
      completedAt,
    });
  }
  return base;
}

export const JOBS: Job[] = ALL_JOB_SEEDS.map(buildJob);

export const PARTS: Part[] = [
  { id: "pt-1", sku: "CAP-40-5-440", name: "Dual-run capacitor 40/5 µF 440 V", brand: "Generic", cost: 14.5, price: 65, truckStock: 4, reorderPoint: 2, leadTimeDays: 1, compatibilityNote: "Compatibility must be verified against installed component and unit documentation." },
  { id: "pt-2", sku: "CON-30-2P", name: "Contactor 30A 2-pole 24V coil", brand: "Generic", cost: 18, price: 78, truckStock: 3, reorderPoint: 2, leadTimeDays: 1 },
  { id: "pt-3", sku: "DRI-038", name: "Liquid line filter drier 3/8\"", brand: "Generic", cost: 22, price: 95, truckStock: 5, reorderPoint: 2, leadTimeDays: 2 },
  { id: "pt-4", sku: "FAN-MOT-18", name: "Condenser fan motor 1/8 HP PSC", brand: "Generic", cost: 88, price: 240, truckStock: 1, reorderPoint: 1, leadTimeDays: 3 },
  { id: "pt-5", sku: "TXV-2T", name: "Thermostatic expansion valve 2-ton", brand: "Generic", cost: 110, price: 290, truckStock: 0, reorderPoint: 1, leadTimeDays: 4 },
  { id: "pt-6", sku: "FIL-2025", name: "Air filter 20x25x1 MERV 8", brand: "Generic", cost: 4, price: 18, truckStock: 24, reorderPoint: 6, leadTimeDays: 1 },
];

export const JOB_PARTS: JobPart[] = ALL_JOB_SEEDS.flatMap((s) =>
  (s.parts ?? []).map((p) => ({ jobId: s.id, partId: p.partId, qty: p.qty }))
);

export const AUTHORIZATIONS: Authorization[] = [];

export const DOCS: DocItem[] = [
  { id: "d-1", title: "Goodman GSXN3 product page", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: "https://www.goodmanmfg.com/products/air-conditioners/gsxn3", status: "Approved", uploadedAt: "2026-04-02" },
  { id: "d-2", title: "Goodman SS-GSXN3 specification sheet (06/23)", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf", status: "Approved", uploadedAt: "2026-04-02" },
  { id: "d-3", title: "Caloosa Cooling — Capacitor replacement SOP", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-18" },
  { id: "d-4", title: "Goodman GSXN3 installation manual", manufacturer: "Goodman", model: "GSXN3", category: "installation_manual", url: "#", status: "Needs Review", uploadedAt: "2026-06-21" },
];

export const KNOWLEDGE: KnowledgeCase[] = [
  { id: "k-1", title: "GSXN3 2-ton no cooling — weak compressor side of dual-run cap", model: "Goodman GSXN3", symptom: "Outdoor fan runs, compressor hums then trips", cause: "Dual-run capacitor compressor section out of tolerance", fix: "Replace dual-run capacitor with matching rating", technician: "Alex Reed", approved: true },
  { id: "k-2", title: "Carrier Comfort 16 — contactor pitting causes intermittent no-call", model: "Carrier 24ACC6", symptom: "Intermittent no cooling, contactor chatter", cause: "Pitted contactor contacts", fix: "Replace 30A 2P contactor; check 24V at coil", technician: "Sam Patel", approved: true },
  { id: "k-3", title: "Trane XR14 — TXV bulb loose, low superheat swing", model: "Trane XR14", symptom: "Iced suction line; low superheat", cause: "TXV sensing bulb strap loose", fix: "Re-strap, re-insulate; verify superheat", technician: "Jordan Lee", approved: true },
];

export const DIAG_SESSION_ID = "ds-j1";
export const INITIAL_DIAG: DiagnosticSession = {
  id: DIAG_SESSION_ID,
  jobId: "j-1",
  templateId: "no-cooling-v1",
  currentStepId: "A",
  results: [],
  measurements: [],
};

export { goodmanPdfSource, goodmanProductSource };
