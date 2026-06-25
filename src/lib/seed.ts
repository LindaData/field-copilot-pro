import type {
  Company, Customer, DocItem, Equipment, Job, JobPart, KnowledgeCase, Part,
  Property, Source, Spec, UserProfile, Authorization, DiagnosticSession,
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
  name: "Carolina Comfort HVAC",
  phone: "(704) 555-0144",
  address: "1820 Commerce Park Dr, Charlotte, NC 28203",
  laborRate: 145,
  tax: 7.25,
};

export const USERS: UserProfile[] = [
  { id: "u-owner", name: "Mike Torres", role: "Owner", avatarColor: "bg-amber-500" },
  { id: "u-alex", name: "Alex Reed", role: "SeniorTech", avatarColor: "bg-blue-600" },
  { id: "u-jordan", name: "Jordan Lee", role: "Technician", avatarColor: "bg-emerald-600" },
  { id: "u-sam", name: "Sam Patel", role: "Technician", avatarColor: "bg-rose-600" },
];

export const CUSTOMERS: Customer[] = [
  { id: "c-1", name: "Linda Hayes", phone: "(704) 555-0188", email: "linda@example.com" },
  { id: "c-2", name: "Marcus Greene", phone: "(704) 555-0121" },
  { id: "c-3", name: "Priya Shah", phone: "(704) 555-0133", email: "priya@example.com" },
  { id: "c-4", name: "Westview Apartments", phone: "(704) 555-0145" },
  { id: "c-5", name: "Rivertown Cafe", phone: "(704) 555-0167" },
];

export const PROPERTIES: Property[] = [
  { id: "p-1", customerId: "c-1", address: "412 Magnolia Ln, Charlotte, NC", accessNotes: "Gate code 2244. Dog in back yard.", lat: 35.2271, lng: -80.8431, geofenceRadiusFt: 200 },
  { id: "p-2", customerId: "c-2", address: "88 Oak Ridge Rd, Concord, NC", lat: 35.4087, lng: -80.5798, geofenceRadiusFt: 200 },
  { id: "p-3", customerId: "c-3", address: "1900 Park Ave Apt 12B, Charlotte, NC", accessNotes: "Buzz #12B", lat: 35.2120, lng: -80.8298, geofenceRadiusFt: 200 },
  { id: "p-4", customerId: "c-4", address: "300 Westview Cir, Matthews, NC", accessNotes: "Office key at leasing.", lat: 35.1168, lng: -80.7234, geofenceRadiusFt: 250 },
  { id: "p-5", customerId: "c-5", address: "55 Main St, Davidson, NC", lat: 35.4993, lng: -80.8487, geofenceRadiusFt: 200 },
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

export const EQUIPMENT: Equipment[] = [
  {
    id: "eq-1",
    manufacturer: "Goodman",
    model: "GSXN3N2410A*",
    serial: "2403A12345",
    family: "GSXN3",
    type: "Split-system air conditioner",
    installDate: "2024-05-12",
    location: "Side yard, north pad",
    specs: goodmanGSXN3Specs,
    manualUrls: [
      { label: "Goodman GSXN3 product page", url: goodmanProductSource.url! },
      { label: "SS-GSXN3 specification sheet (PDF)", url: goodmanPdfSource.url! },
    ],
  },
  { id: "eq-2", manufacturer: "Carrier", model: "24ACC636A003", serial: "CR8821X", family: "Comfort 16", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-3", manufacturer: "Trane", model: "XR14 4TTR4036L", serial: "TR55001", family: "XR14", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-4", manufacturer: "Lennox", model: "ML14XC1-024", serial: "LX2299A", family: "Merit", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-5", manufacturer: "Rheem", model: "RA1424AJ1NA", serial: "RH71200", family: "Classic", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-6", manufacturer: "Goodman", model: "GSXN404210", serial: "GD11045", family: "GSXN4", type: "Split AC", specs: [], manualUrls: [] },
  { id: "eq-7", manufacturer: "Mitsubishi", model: "MUZ-FH12NA", serial: "MT88231", family: "FH", type: "Mini-split", specs: [], manualUrls: [] },
];

const todayIso = (h: number) => {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

export const JOBS: Job[] = [
  { id: "j-1", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-1", technicianId: "u-alex", complaint: "No cooling. System runs but blowing warm.", status: "On Site", scheduledFor: todayIso(10), priority: "High" },
  { id: "j-2", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-2", technicianId: "u-alex", complaint: "Annual maintenance and filter change.", status: "Scheduled", scheduledFor: todayIso(13), priority: "Normal" },
  { id: "j-3", customerId: "c-3", propertyId: "p-3", equipmentId: "eq-3", technicianId: "u-alex", complaint: "Thermostat shows offline intermittently.", status: "Scheduled", scheduledFor: todayIso(15), priority: "Normal" },
  { id: "j-4", customerId: "c-4", propertyId: "p-4", equipmentId: "eq-4", technicianId: "u-jordan", complaint: "Unit 4B warm. Tenants complaining.", status: "En Route", scheduledFor: todayIso(11), priority: "High" },
  { id: "j-5", customerId: "c-5", propertyId: "p-5", equipmentId: "eq-5", technicianId: "u-sam", complaint: "Walk-in cooler temp rising.", status: "Diagnosing", scheduledFor: todayIso(9), priority: "High" },
  { id: "j-6", customerId: "c-2", propertyId: "p-2", equipmentId: "eq-6", technicianId: "u-jordan", complaint: "Replace capacitor (parts on order).", status: "Waiting for Parts", scheduledFor: todayIso(16), priority: "Normal" },
  { id: "j-7", customerId: "c-1", propertyId: "p-1", equipmentId: "eq-7", technicianId: "u-sam", complaint: "Mini-split not heating bedroom.", status: "Completed", scheduledFor: todayIso(8), priority: "Normal" },
  { id: "j-8", customerId: "c-3", propertyId: "p-3", technicianId: "u-alex", complaint: "Quote new system replacement.", status: "Follow-Up", scheduledFor: todayIso(17), priority: "Low" },
];

export const PARTS: Part[] = [
  { id: "pt-1", sku: "CAP-40-5-440", name: "Dual-run capacitor 40/5 µF 440 V", brand: "Generic", cost: 14.5, price: 65, truckStock: 4, reorderPoint: 2, leadTimeDays: 1, compatibilityNote: "Compatibility must be verified against installed component and unit documentation." },
  { id: "pt-2", sku: "CON-30-2P", name: "Contactor 30A 2-pole 24V coil", brand: "Generic", cost: 18, price: 78, truckStock: 3, reorderPoint: 2, leadTimeDays: 1 },
  { id: "pt-3", sku: "DRI-038", name: "Liquid line filter drier 3/8\"", brand: "Generic", cost: 22, price: 95, truckStock: 5, reorderPoint: 2, leadTimeDays: 2 },
  { id: "pt-4", sku: "FAN-MOT-18", name: "Condenser fan motor 1/8 HP PSC", brand: "Generic", cost: 88, price: 240, truckStock: 1, reorderPoint: 1, leadTimeDays: 3 },
  { id: "pt-5", sku: "TXV-2T", name: "Thermostatic expansion valve 2-ton", brand: "Generic", cost: 110, price: 290, truckStock: 0, reorderPoint: 1, leadTimeDays: 4 },
  { id: "pt-6", sku: "FIL-2025", name: "Air filter 20x25x1 MERV 8", brand: "Generic", cost: 4, price: 18, truckStock: 24, reorderPoint: 6, leadTimeDays: 1 },
];

export const JOB_PARTS: JobPart[] = [];

export const AUTHORIZATIONS: Authorization[] = [];

export const DOCS: DocItem[] = [
  { id: "d-1", title: "Goodman GSXN3 product page", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: "https://www.goodmanmfg.com/products/air-conditioners/gsxn3", status: "Approved", uploadedAt: "2026-04-02" },
  { id: "d-2", title: "Goodman SS-GSXN3 specification sheet (06/23)", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf", status: "Approved", uploadedAt: "2026-04-02" },
  { id: "d-3", title: "Carolina Comfort HVAC — Capacitor replacement SOP", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-18" },
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
