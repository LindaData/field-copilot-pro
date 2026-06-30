import type {
  Authorization, Company, Customer, CustomerFeedback, DiagnosticSession, DocItem,
  Equipment, Job, JobPart, JobStatus, KnowledgeCase, Part, PartRequest, Photo,
  Property, ServiceReport, Spec, SystemRecord, TechFeedback, UserProfile,
} from "./types";
import { makeRng } from "./prng";
import { SYSTEM_TEMPLATES, ACCESSORY_OPTIONS } from "./systems";
import type {
  EquipmentCategory, EquipmentRole, FuelType, ServiceClass, SystemTemplate,
} from "./systems";
import { manufacturerDocItems, manualLinksForEquipment } from "./manufacturerSources";
import { top50DocItems, top50ManualLinksForEquipment } from "./hvacTop50";

// =============================================================================
// Sources (the verified Goodman GSXN3 example, plus the company SOP source)
// =============================================================================
export const goodmanPdfSource = {
  kind: "manufacturer_verified" as const,
  title: "Goodman SS-GSXN3, Product Specifications",
  ref: "p.3",
  url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf",
};
export const goodmanProductSource = {
  kind: "manufacturer_verified" as const,
  title: "Goodman GSXN3 product page",
  url: "https://www.goodmanmfg.com/products/air-conditioners/gsxn3",
};
const fictionalSource = {
  kind: "fictional_demo" as const,
  title: "Fictional demo data — not a verified manufacturer source",
};
const companySopSource = {
  kind: "company_sop" as const,
  title: "Caloosa Cooling — internal SOP",
};

// =============================================================================
// Company
// =============================================================================
export const COMPANY: Company = {
  name: "Caloosa Cooling",
  phone: "239-226-0202",
  address: "14241 Jetport Loop, Unit #1, Fort Myers, FL 33913",
  laborRate: 145,
  tax: 6.5,
  brandPrimary: "#133c53",
  brandAccent: "#14b1f0",
  establishedYear: 2001,
  weekdayHours: "7:00 a.m.–9:00 p.m.",
  weekendHours: "8:00 a.m.–9:00 p.m.",
  services: [
    "Air-conditioning repair",
    "Air-conditioning installation and replacement",
    "Air-conditioning maintenance",
    "Heat pumps",
    "Ductless mini-splits",
    "Heating service",
    "Indoor-air-quality services",
    "Electrical services",
    "Generator installation",
    "Commercial HVAC",
    "Rooftop HVAC",
    "Cooling towers",
    "New construction",
    "Custom ductwork",
  ],
  serviceAreas: [
    "Fort Myers",
    "Lee County",
    "Charlotte County",
    "Collier County",
    "Southwest Florida",
  ],
};


// =============================================================================
// Users (1 owner + 2 service managers + 8 technicians + 2 office = 13)
// =============================================================================
export const USERS: UserProfile[] = [
  { id: "u-owner", name: "Luis Gomez", role: "Owner", fullTitle: "Co-Owner & General Manager", avatarColor: "bg-amber-500", active: true },
  { id: "u-sm1", name: "Dana Whitfield", role: "ServiceManager", avatarColor: "bg-fuchsia-600", active: true },
  { id: "u-sm2", name: "Priya Banerjee", role: "ServiceManager", avatarColor: "bg-purple-600", active: true },
  { id: "u-alex", name: "Alex Reed", role: "SeniorTech", avatarColor: "bg-blue-600", active: true },
  { id: "u-jordan", name: "Jordan Lee", role: "Technician", avatarColor: "bg-emerald-600", active: true },
  { id: "u-sam", name: "Sam Patel", role: "Technician", avatarColor: "bg-rose-600", active: true },
  { id: "u-marcus", name: "Marcus Green", role: "Technician", avatarColor: "bg-orange-600", active: true },
  { id: "u-elena", name: "Elena Rodriguez", role: "Technician", avatarColor: "bg-cyan-600", active: true },
  { id: "u-chris", name: "Chris Walker", role: "Technician", avatarColor: "bg-lime-600", active: true },
  { id: "u-taylor", name: "Taylor Brooks", role: "Technician", avatarColor: "bg-slate-500", active: true },
  { id: "u-devon", name: "Devon Price", role: "Technician", avatarColor: "bg-indigo-600", active: true },
  { id: "u-office1", name: "Robin Hayes", role: "Office", avatarColor: "bg-teal-600", active: true },
  { id: "u-office2", name: "Casey Long", role: "Office", avatarColor: "bg-pink-600", active: true },
];
const TECH_IDS = ["u-alex","u-jordan","u-sam","u-marcus","u-elena","u-chris","u-taylor","u-devon"];

// =============================================================================
// Geographic / catalog tables (deterministic)
// =============================================================================
const CITIES = ["Estero", "Bonita Springs", "Fort Myers", "Naples", "Cape Coral", "Fort Myers Beach", "San Carlos Park", "Lehigh Acres"];
const CITY_ZIPS: Record<string, string> = {
  "Estero": "33928",
  "Bonita Springs": "34135",
  "Fort Myers": "33912",
  "Naples": "34108",
  "Cape Coral": "33904",
  "Fort Myers Beach": "33931",
  "San Carlos Park": "33967",
  "Lehigh Acres": "33936",
};
const STREETS = [
  "Corkscrew Rd", "Estero Pkwy", "Three Oaks Pkwy", "Coconut Rd", "Via Coconut Point",
  "Broadway Ave", "Williams Rd", "Pelican Sound Dr", "Highlands Ave", "Sandy Ln",
  "Ben Hill Griffin Pkwy", "Fountain Lakes Blvd", "Sweetwater Ranch Blvd", "River Ranch Rd",
  "Tamiami Trail", "Bonita Beach Rd", "Imperial Pkwy", "Old US 41", "Pine Ridge Rd",
  "Vanderbilt Beach Rd", "Daniels Pkwy", "Summerlin Rd", "Colonial Blvd",
];
const FIRST = ["Linda","Marcus","Priya","Tom","Janet","Aiden","Sofia","Eli","Maya","Owen","Naomi","Jack","Emma","Noah","Ava","Liam","Zoe","Henry","Ruby","Leo","Mia","Asher","Iris","Caleb","Stella","Felix","Grace","Theo","Hazel","Nora","Cole","Wren"];
const LAST = ["Hayes","Greene","Shah","Whitmore","Kim","Robinson","Patel","Nguyen","Cole","Reyes","Brown","Sanders","Jones","Carter","Foster","Walker","Bennett","Hughes","Reid","Hall","Wright","Russell","Sullivan","Cox","Murphy","Bell","Wood","Ross","Howard","Bailey"];
const BUSINESS = [
  "Westview Apartments", "Rivertown Cafe", "Coastal Dental", "Banyan Bay HOA",
  "Sunset Storage", "Cleveland Ave Diner", "Gulf Coast Auto Care",
  "Piedmont Pediatrics", "Estero Pet Lodge",
];

const BRANDS = ["Goodman","Amana","Carrier","Bryant","Trane","American Standard","Rheem","Ruud","Lennox","York","Coleman","Daikin","Mitsubishi Electric","Fujitsu","Bosch"];

const PROP_TYPES: ("Single-family"|"Townhome"|"Condo"|"Retail"|"Office"|"Restaurant"|"Warehouse"|"Multi-unit")[] =
  ["Single-family","Single-family","Single-family","Single-family","Townhome","Condo","Retail","Office","Restaurant","Warehouse","Multi-unit"];

// =============================================================================
// Anchor date — deterministic, locked to today at local midnight
// =============================================================================
function makeAnchor() { const d = new Date(); d.setHours(0,0,0,0); return d; }
const ANCHOR = makeAnchor();
function dayOffsetISO(days: number, h = 10, m = 0): string {
  const d = new Date(ANCHOR); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function isoMinutesAfter(iso: string, minutes: number): string {
  return new Date(+new Date(iso) + minutes * 60000).toISOString();
}

// =============================================================================
// Customers (40)
// =============================================================================
function buildCustomers(): Customer[] {
  const rng = makeRng(0xC0FFEE);
  const list: Customer[] = [];
  // Keep c-1 stable for the verified Goodman demo scenario
  list.push({ id: "c-1", name: "Linda Hayes", phone: "(239) 555-0188", email: "linda.demo@example.com", city: "Estero", maintenancePlan: true, commPreference: "Text", isDemo: true });
  for (let i = 2; i <= 31; i++) {
    const first = FIRST[rng.int(0, FIRST.length - 1)];
    const last = LAST[rng.int(0, LAST.length - 1)];
    const city = rng.chance(0.55) ? "Estero" : CITIES[rng.int(0, CITIES.length - 1)];
    list.push({
      id: `c-${i}`,
      name: `${first} ${last}`,
      phone: `(239) 555-${String(2000 + i * 7).padStart(4,"0")}`,
      email: rng.chance(0.7) ? `${first.toLowerCase()}.demo${i}@example.com` : undefined,
      city,
      maintenancePlan: rng.chance(0.45),
      commPreference: rng.pick(["Phone","Text","Email"] as const),
      isDemo: true,
    });
  }
  // Commercial accounts
  for (let i = 0; i < BUSINESS.length; i++) {
    const id = `c-${32 + i}`;
    list.push({
      id, name: BUSINESS[i],
      phone: `(239) 555-${String(8100 + i * 11).padStart(4,"0")}`,
      email: `ops.demo@${BUSINESS[i].toLowerCase().replace(/[^a-z]/g, "")}.example`,
      city: CITIES[rng.int(0, CITIES.length - 1)],
      maintenancePlan: rng.chance(0.7),
      commPreference: "Email",
      isDemo: true,
    });
  }
  // Ensure exactly 20 with maintenance plan
  let plans = list.filter((c) => c.maintenancePlan).length;
  if (plans !== 20) {
    if (plans < 20) {
      for (const c of list) { if (plans >= 20) break; if (!c.maintenancePlan) { c.maintenancePlan = true; plans++; } }
    } else {
      for (let i = list.length - 1; i >= 0 && plans > 20; i--) { if (list[i].maintenancePlan) { list[i].maintenancePlan = false; plans--; } }
    }
  }
  return list;
}
export const CUSTOMERS: Customer[] = buildCustomers();

// =============================================================================
// Properties (48) — c-1's primary property is p-1
// =============================================================================
function buildProperties(): Property[] {
  const rng = makeRng(0xBADBEEF);
  const list: Property[] = [];
  // Stable: p-1 for the Goodman scenario
  list.push({
    id: "p-1", customerId: "c-1", address: "9120 Corkscrew Palms Blvd, Estero, FL 33928",
    city: "Estero", propertyType: "Single-family", serviceClass: "Residential",
    accessNotes: "Gate code on file at dispatch. Dog in back yard.",
    parkingNotes: "Driveway pad on right side.",
    pets: "Friendly retriever",
    warrantyActive: true, gateCode: "2244",
    lat: 26.4382, lng: -81.8068, geofenceRadiusFt: 200,
  });
  // One primary property per remaining customer
  for (let i = 2; i <= CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i - 1];
    const street = STREETS[rng.int(0, STREETS.length - 1)];
    const houseNum = rng.int(100, 9800);
    const propType: Property["propertyType"] =
      i >= 32 ? rng.pick(["Retail","Office","Restaurant","Warehouse","Multi-unit"] as const)
              : rng.pick(PROP_TYPES);
    const serviceClass: ServiceClass =
      ["Retail","Office","Restaurant","Warehouse","Multi-unit"].includes(propType ?? "") ? "Light Commercial" : "Residential";
    const city = c.city ?? "Estero";
    const zip = CITY_ZIPS[city] ?? "33928";
    list.push({
      id: `p-${i}`, customerId: c.id,
      address: `${houseNum} ${street}, ${city}, FL ${zip}`,
      city, propertyType: propType, serviceClass,
      accessNotes: rng.chance(0.4) ? rng.pick(["Side gate unlocked","Call on arrival","Use service door","Office key at front"]) : undefined,
      parkingNotes: rng.chance(0.3) ? rng.pick(["Driveway","Visitor lot","Street parking only","Loading dock"]) : undefined,
      pets: rng.chance(0.25) ? rng.pick(["Small dog inside","Cat indoors","Two dogs in yard"]) : undefined,
      warrantyActive: rng.chance(0.3),
      gateCode: rng.chance(0.15) ? String(1000 + rng.int(0, 8999)) : undefined,
      lat: 26.30 + rng.next() * 0.35, lng: -81.90 + rng.next() * 0.25,
      geofenceRadiusFt: 200,
    });
  }
  // Add 8 secondary properties for commercial accounts to get to 48
  const baseCount = list.length;
  for (let i = 0; i < 48 - baseCount; i++) {
    const parent = CUSTOMERS[31 + (i % BUSINESS.length)];
    const city = parent.city ?? "Estero";
    const zip = CITY_ZIPS[city] ?? "33928";
    list.push({
      id: `p-${baseCount + i + 1}`, customerId: parent.id,
      address: `${rng.int(100, 9800)} ${STREETS[rng.int(0, STREETS.length - 1)]}, ${city}, FL ${zip} (Bldg ${String.fromCharCode(66 + i)})`,
      city, propertyType: "Multi-unit", serviceClass: "Light Commercial",
      warrantyActive: false,
      lat: 26.30 + rng.next() * 0.35, lng: -81.90 + rng.next() * 0.25, geofenceRadiusFt: 250,
    });
  }
  return list;
}
export const PROPERTIES: Property[] = buildProperties();

// =============================================================================
// Verified Goodman GSXN3 specs (the ONLY manufacturer-verified equipment)
// =============================================================================
const GSXN3_APPROVAL = {
  sourceDocumentId: "d-2",
  sourcePage: "Page 3 — Product Specifications",
  verificationStatus: "Manufacturer Verified" as const,
  approvedBy: "Luis Gomez",
  approvedAt: "2026-04-02",
  lastReviewedAt: "2026-04-02",
};
const mfg = (label: string, value: string, group: Spec["group"], key: string, unit?: string, notes?: string): Spec => ({
  key, label, value, unit, group, source: goodmanPdfSource, ...GSXN3_APPROVAL, notes,
});
const goodmanGSXN3Specs: Spec[] = [
  // Capacity
  mfg("Product family", "Goodman GSXN3", "Capacity", "family"),
  mfg("Equipment type", "Split-System Air Conditioner", "Capacity", "type"),
  mfg("Nominal cooling", "24,000", "Capacity", "btu", "BTU/h"),
  mfg("Nominal tonnage", "2", "Capacity", "tons", "tons"),
  mfg("Published family efficiency", "Up to 14.5 SEER2", "Capacity", "seer2"),
  mfg("Published sound", "73", "Capacity", "sound", "dBA"),
  mfg("Compressor stages", "Single", "Capacity", "stages"),
  // Compressor
  mfg("Compressor type", "Rotary", "Compressor", "comp-type"),
  mfg("Compressor RLA", "8.4", "Compressor", "rla", "A"),
  mfg("Compressor LRA", "41.2", "Compressor", "lra", "A"),
  mfg("Compressor stage", "Single", "Compressor", "comp-stage"),
  // Fan
  mfg("Condenser fan motor type", "PSC", "Fan", "fan-type"),
  mfg("Motor horsepower", "1/8", "Fan", "fan-hp", "HP"),
  mfg("Motor FLA", "0.70", "Fan", "fan-fla", "A"),
  // Refrigeration
  mfg("Liquid line size", "3/8", "Refrigeration", "liq-line", "in. O.D."),
  mfg("Suction line size", "3/4", "Refrigeration", "suc-line", "in. O.D."),
  mfg("Liquid valve size", "3/8", "Refrigeration", "liq-valve", "in. O.D."),
  mfg("Suction valve size", "3/4", "Refrigeration", "suc-valve", "in. O.D."),
  mfg("Valve type", "Sweat", "Refrigeration", "valve-type"),
  mfg("Factory refrigerant charge", "71", "Refrigeration", "charge", "oz",
    "Factory charge condition: 15 feet of 3/8-inch liquid line. System charge must be adjusted using the applicable installation instructions and final-charge adjustment procedure."),
  mfg("Factory charge condition", "15 ft of 3/8 in. liquid line", "Refrigeration", "charge-cond", undefined,
    "Published line sizes are associated with the conditions described in the manufacturer sheet; other lengths or sizes require installation-instruction review."),
  // Electrical
  mfg("Voltage", "208/230", "Electrical", "voltage", "V"),
  mfg("Phase", "Single phase", "Electrical", "phase"),
  mfg("Frequency", "60", "Electrical", "freq", "Hz"),
  mfg("Minimum circuit ampacity", "11.2", "Electrical", "mca", "A"),
  mfg("Maximum overcurrent protection", "15", "Electrical", "mop", "A"),
  mfg("Minimum voltage", "197", "Electrical", "vmin", "V"),
  mfg("Maximum voltage", "253", "Electrical", "vmax", "V"),
  mfg("Electrical conduit size", "1/2 or 3/4", "Electrical", "conduit", "in.",
    "Always verify electrical information against the actual unit rating plate. Follow manufacturer documentation and applicable electrical codes."),
  // Physical
  mfg("Equipment weight", "125", "Physical", "weight", "lb"),
  mfg("Shipping weight", "138", "Physical", "ship-weight", "lb"),
  mfg("Cabinet", "Heavy-gauge galvanized steel with steel louver coil guard, single-panel control access", "Physical", "cabinet"),
  mfg("Coil construction", "Copper tube / enhanced aluminum fin coil", "Physical", "coil"),
  // Certifications
  { key: "ahri", label: "AHRI Certified", value: "Yes", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL,
    notes: "Certification applies to the GSXN3 product family. Confirm the exact installed combination on the AHRI certificate." },
  { key: "etl", label: "ETL Listed", value: "Yes", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL,
    notes: "Listing applies to the GSXN3 product family." },
  { key: "filterdrier", label: "Factory-installed filter drier", value: "Included", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL },
  { key: "svcvalves", label: "Service valves with sweat connections", value: "Included", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL },
  { key: "gauge", label: "Accessible gauge ports", value: "Included", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL },
  { key: "contactor", label: "Contactor with lug connection", value: "Included", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL },
  { key: "groundlug", label: "Ground lug connection", value: "Included", group: "Certifications", source: goodmanPdfSource, ...GSXN3_APPROVAL },
];
const goodmanErrorCodes: import("./types").ErrorCode[] = [
  { code: "1F", meaning: "High pressure switch open",
    likelyCauses: ["Dirty/blocked condenser coil","Failed condenser fan motor","Overcharge","Restricted liquid line"],
    safeChecks: ["Wash coil with power off","Confirm fan rotation and amps vs FLA","Compare pressures to manufacturer chart"],
    source: goodmanPdfSource, sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    trigger: "High-pressure switch opens during operation",
    approvedInterpretation: "Indicates a high-side pressure event. Always determine root cause before reset.",
    approvedStartingPoint: "Inspect outdoor coil for restriction, confirm fan operation, then evaluate charge.",
    safetyConsiderations: "Use qualified procedures when measuring pressures. Follow refrigerant-handling requirements.",
    alternativeCauses: ["High outdoor ambient combined with low airflow","Hidden coil damage"],
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02", lastReviewedAt: "2026-04-02",
    approvalNotes: "Approved interpretation reviewed against Goodman SS-GSXN3 06/23." },
  { code: "2F", meaning: "Low pressure switch open",
    likelyCauses: ["Refrigerant loss","Restricted metering device","Iced indoor coil"],
    safeChecks: ["Inspect for oil at fittings","Verify airflow across indoor coil","Compare superheat to target"],
    source: goodmanPdfSource, sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    trigger: "Low-pressure switch opens during operation",
    approvedInterpretation: "Indicates low-side pressure event; do not bypass switch.",
    approvedStartingPoint: "Verify indoor airflow and filter, then evaluate refrigeration circuit.",
    safetyConsiderations: "Refrigerant handling certification required for charge work.",
    alternativeCauses: ["Closed service valve","Stuck TXV bulb"],
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02", lastReviewedAt: "2026-04-02" },
  { code: "3F", meaning: "Compressor overload trip",
    likelyCauses: ["Locked rotor","Weak run capacitor","Low line voltage"],
    safeChecks: ["Confirm line voltage within 197 V – 253 V","Bench-test capacitor against printed µF","Measure LRA only per manufacturer-approved procedure"],
    source: goodmanPdfSource, sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    trigger: "Compressor internal overload opens",
    approvedInterpretation: "Allow cool-down; investigate electrical supply and capacitor before retry.",
    approvedStartingPoint: "Confirm line voltage within MIN/MAX range, then capacitor µF.",
    safetyConsiderations: "Lockout/tagout required for electrical testing.",
    alternativeCauses: ["Failed contactor","High head pressure transferring stress to compressor"],
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02", lastReviewedAt: "2026-04-02" },
  { code: "4F", meaning: "Outdoor fan motor fault",
    likelyCauses: ["Failed condenser fan motor","Failed fan capacitor section","Wiring fault"],
    safeChecks: ["Confirm 24 V at contactor coil","Measure fan motor amps vs 0.70 A FLA","Inspect wiring per diagram"],
    source: goodmanPdfSource, sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    trigger: "Outdoor fan does not run or runs out of spec",
    approvedInterpretation: "Confirm power and capacitor before condemning motor.",
    approvedStartingPoint: "Verify 24 V at contactor, then capacitor µF on fan side.",
    safetyConsiderations: "De-energize before removing capacitor leads.",
    alternativeCauses: ["Seized bearings","Damaged blade impacting rotation"],
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02", lastReviewedAt: "2026-04-02" },
];
const goodmanBom: import("./types").BomItem[] = [
  { ref: "C1", description: "Dual-run capacitor",
    specHint: "Verify printed µF / voltage on the installed component",
    approvedPartIds: ["pt-1"], source: goodmanPdfSource,
    sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    applicability: "Goodman GSXN3 product family",
    approvalReason: "Matches manufacturer reference for capacitor placement.",
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02",
    compatibilityStatus: "Verified", stockStatus: "In Stock", supplier: "Local supply house",
    installationNotes: "Always confirm µF / voltage on the installed nameplate before replacing." },
  { ref: "K1", description: "Compressor contactor", specHint: "30 A 2-pole, 24 V coil",
    approvedPartIds: ["pt-2"], source: goodmanPdfSource,
    sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    applicability: "Goodman GSXN3 product family",
    approvalReason: "Specification reflects published contactor rating.",
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02",
    compatibilityStatus: "Verified", stockStatus: "In Stock", supplier: "Local supply house" },
  { ref: "FD", description: "Liquid line filter drier (factory)", specHint: "3/8 in. O.D.",
    approvedPartIds: ["pt-3"], source: goodmanPdfSource,
    sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    applicability: "Goodman GSXN3 product family",
    approvalReason: "Factory-installed component identified on the specification sheet.",
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02",
    compatibilityStatus: "Verified", stockStatus: "In Stock", supplier: "Local supply house" },
  { ref: "M2", description: "Condenser fan motor", specHint: "1/8 HP PSC, 0.70 A FLA",
    approvedPartIds: ["pt-4"], source: goodmanPdfSource,
    sourceDocumentId: "d-2", sourcePage: "Page 3 — Product Specifications",
    applicability: "Goodman GSXN3 product family",
    approvalReason: "Motor rating matches published fan motor specifications.",
    approvedBy: "Luis Gomez", approvedAt: "2026-04-02",
    compatibilityStatus: "Likely", stockStatus: "Order Required", supplier: "Distributor",
    installationNotes: "Confirm shaft size and rotation direction before installation." },
];
const goodmanDiagrams = [
  { id: "wd-1", title: "GSXN3 line voltage wiring", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf#page=5", source: goodmanPdfSource },
  { id: "wd-2", title: "GSXN3 low voltage / 24 V controls", url: "https://www.goodmanmfg.com/docs/librariesprovider6/default-document-library/ss-gsxn3.pdf#page=6", source: goodmanPdfSource },
];


// =============================================================================
// Systems + Equipment
// =============================================================================
const SERIAL = (rng: ReturnType<typeof makeRng>) => `D${rng.int(10,99)}${rng.int(10000,99999)}`;
const MODEL = (brand: string, role: EquipmentRole, rng: ReturnType<typeof makeRng>) => {
  const suffix = `${["A","B","C","H","S","X"][rng.int(0,5)]}${rng.int(10,99)}${role === "Outdoor" ? "0" : ""}`;
  const stem =
    role === "Furnace" ? "GAS" :
    role === "Air Handler" ? "AH" :
    role === "Mini-Split Outdoor" ? "MUZ" :
    role === "Mini-Split Indoor" ? "MSZ" :
    role === "Packaged" ? "PKG" :
    role === "Coil" ? "CL" :
    role === "Thermostat" ? "TS" : "AC";
  return `${brand.split(/\s+/)[0].toUpperCase().slice(0,3)}-${stem}${suffix}`;
};
const friendlyCategoryName = (cat: EquipmentCategory) => cat;

function uniqueManualUrls(links: Equipment["manualUrls"]): Equipment["manualUrls"] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const key = `${link.label}|${link.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSystemsAndEquipment(): { systems: SystemRecord[]; equipment: Equipment[] } {
  const rng = makeRng(0xABCDE12);
  const systems: SystemRecord[] = [];
  const equipment: Equipment[] = [];

  // =============== sys-1 / eq-1: VERIFIED Goodman GSXN3 ==============
  systems.push({
    id: "sys-1", customerId: "c-1", propertyId: "p-1",
    nickname: "Main Floor System",
    configuration: "Straight-Cool Split + Air Handler",
    serviceClass: "Residential", fuelType: "Electric",
    equipmentIds: ["eq-1"], accessoryIds: [],
    installDate: "2024-05-12", warrantyActive: true,
    notes: "Source-verified demo system. Specs cited from Goodman SS-GSXN3.",
  });
  equipment.push({
    id: "eq-1",
    manufacturer: "Goodman", model: "GSXN3N2410A*", serial: "2403A12345",
    family: "GSXN3", type: "Air Conditioner",
    systemId: "sys-1", role: "Outdoor", category: "Air Conditioner", fuelType: "Electric",
    verificationStatus: "Manufacturer Verified",
    installDate: "2024-05-12", location: "Side yard, north pad",
    specs: goodmanGSXN3Specs,
    manualUrls: [
      { label: "Goodman GSXN3 product page", url: goodmanProductSource.url! },
      { label: "SS-GSXN3 specification sheet (PDF)", url: goodmanPdfSource.url! },
    ],
    errorCodes: goodmanErrorCodes,
    bom: goodmanBom,
    approvedReplacementPartIds: ["pt-1","pt-2","pt-3","pt-4"],
    wiringDiagrams: goodmanDiagrams,
  });

  // =============== sys-2..sys-65: fictional demo systems ==============
  const FUEL_BRAND_BIAS: Record<string, string[]> = {
    "Gas Furnace": ["Carrier","Bryant","Trane","Lennox","Goodman","Rheem","York"],
    "Heat Pump": ["Trane","American Standard","Carrier","Goodman","Rheem","Bosch","Daikin"],
    "Air Conditioner": ["Goodman","Amana","Carrier","Bryant","Lennox","Rheem"],
    "Air Handler": ["Goodman","Carrier","Trane","Lennox","Rheem"],
    "Evaporator Coil": ["Goodman","Carrier","Trane","Lennox"],
    "Mini-Split Outdoor": ["Mitsubishi Electric","Fujitsu","Daikin","Bosch","LG"],
    "Mini-Split Indoor": ["Mitsubishi Electric","Fujitsu","Daikin","Bosch","LG"],
    "Package Gas/Electric": ["Carrier","Trane","York","Lennox","Goodman"],
    "Package Heat Pump": ["Carrier","Trane","York","Goodman","Rheem"],
    "RTU": ["Carrier","Trane","York","Lennox","Daikin"],
    "Thermostat": ["Honeywell","Ecobee","Nest","Carrier","Trane"],
  };

  for (let sysIdx = 2; sysIdx <= 65; sysIdx++) {
    const template: SystemTemplate = SYSTEM_TEMPLATES[(sysIdx - 2) % SYSTEM_TEMPLATES.length];
    // Map system to property roughly across all properties (skip p-1, that's sys-1)
    const propIdx = 2 + ((sysIdx - 2) % (PROPERTIES.length - 1));
    const prop = PROPERTIES[propIdx - 1];
    const cust = CUSTOMERS.find((c) => c.id === prop.customerId)!;
    const systemId = `sys-${sysIdx}`;
    const nickname = (() => {
      if (template.serviceClass === "Light Commercial") {
        return template.configuration === "Light-Commercial RTU"
          ? rng.pick(["Retail Sales Floor RTU","Office RTU","Restaurant Dining RTU","Warehouse Office RTU"])
          : rng.pick(["Main Cabinet","Lobby System","Kitchen Package Unit"]);
      }
      return rng.pick([
        "Main Floor System","Upstairs System","Primary Bedroom Mini-Split",
        "Bonus Room System","Garage Apartment","Basement System","Whole-Home System",
      ]);
    })();
    const installYearAgo = rng.int(1, 14);
    const installDate = new Date(ANCHOR);
    installDate.setFullYear(installDate.getFullYear() - installYearAgo);
    const warrantyActive = installYearAgo < 8 && rng.chance(0.5);

    // Members
    const equipmentIds: string[] = [];
    let parentId: string | undefined;
    for (const member of template.members) {
      // Skip emitting a separate Thermostat/Coil record for ~50% of systems to keep total component count near target
      if ((member.role === "Thermostat" || member.role === "Coil") && rng.chance(0.55)) continue;

      const brandPool = FUEL_BRAND_BIAS[member.category] ?? BRANDS;
      const brand = brandPool[rng.int(0, brandPool.length - 1)];
      const id = `eq-${equipment.length + 1}`;
      const eqRecord: Equipment = {
        id, manufacturer: brand,
        model: MODEL(brand, member.role, rng),
        serial: SERIAL(rng),
        family: brand.split(/\s+/)[0],
        type: member.category,
        systemId, parentEquipmentId: member.role !== "Outdoor" && member.role !== "Packaged" && member.role !== "Mini-Split Outdoor" ? parentId : undefined,
        role: member.role, category: member.category, fuelType: template.fuelType,
        verificationStatus: "Demo Equipment — Specifications Not Verified",
        installDate: installDate.toISOString().slice(0, 10),
        location: rng.pick(["Side yard","Backyard pad","Attic","Mechanical closet","Garage","Roof"]),
        specs: [],
        manualUrls: [],
      };
      eqRecord.manualUrls = uniqueManualUrls([
        ...manualLinksForEquipment(eqRecord),
        ...top50ManualLinksForEquipment(eqRecord),
      ]);
      equipment.push(eqRecord);
      equipmentIds.push(id);
      if (member.role === "Outdoor" || member.role === "Packaged" || member.role === "Mini-Split Outdoor") parentId = id;
    }

    // Accessories on ~22% of systems
    const accessoryIds: string[] = [];
    if (rng.chance(0.22)) {
      const acc = ACCESSORY_OPTIONS[rng.int(0, ACCESSORY_OPTIONS.length - 1)];
      const accId = `eq-${equipment.length + 1}`;
      const accessoryRecord: Equipment = {
        id: accId, manufacturer: rng.pick(["Aprilaire","Honeywell","Carrier","Lennox","Generic"]),
        model: `${acc.category.slice(0,3).toUpperCase()}-${rng.int(100,999)}`,
        serial: SERIAL(rng), family: acc.category, type: acc.category,
        systemId, parentEquipmentId: parentId,
        role: "Accessory", category: acc.category, fuelType: "Electric",
        verificationStatus: "Demo Equipment — Specifications Not Verified",
        installDate: installDate.toISOString().slice(0, 10),
        location: "Mechanical closet",
        specs: [], manualUrls: [],
      };
      accessoryRecord.manualUrls = uniqueManualUrls([
        ...manualLinksForEquipment(accessoryRecord),
        ...top50ManualLinksForEquipment(accessoryRecord),
      ]);
      equipment.push(accessoryRecord);
      accessoryIds.push(accId);
    }

    systems.push({
      id: systemId, customerId: cust.id, propertyId: prop.id,
      nickname, configuration: template.configuration,
      serviceClass: template.serviceClass, fuelType: template.fuelType,
      equipmentIds, accessoryIds,
      installDate: installDate.toISOString().slice(0, 10),
      warrantyActive,
      notes: "Fictional demo system — specs require verification before service.",
    });
  }
  return { systems, equipment };
}
const { systems: SYS_BUILD, equipment: EQ_BUILD } = buildSystemsAndEquipment();
export const SYSTEMS: SystemRecord[] = SYS_BUILD;
export const EQUIPMENT: Equipment[] = EQ_BUILD;

// =============================================================================
// Parts (35)
// =============================================================================
export const PARTS: Part[] = (() => {
  const p: Part[] = [
    { id: "pt-1", sku: "CAP-40-5-440", name: "Dual-run capacitor 40/5 µF 440 V", brand: "Generic", cost: 14.5, price: 65, truckStock: 4, reorderPoint: 2, leadTimeDays: 1, compatibilityNote: "Compatibility must be verified against installed component and unit documentation." },
    { id: "pt-2", sku: "CON-30-2P", name: "Contactor 30A 2-pole 24V coil", brand: "Generic", cost: 18, price: 78, truckStock: 3, reorderPoint: 2, leadTimeDays: 1 },
    { id: "pt-3", sku: "DRI-038", name: "Liquid line filter drier 3/8\"", brand: "Generic", cost: 22, price: 95, truckStock: 5, reorderPoint: 2, leadTimeDays: 2 },
    { id: "pt-4", sku: "FAN-MOT-18", name: "Condenser fan motor 1/8 HP PSC", brand: "Generic", cost: 88, price: 240, truckStock: 1, reorderPoint: 1, leadTimeDays: 3 },
    { id: "pt-5", sku: "TXV-2T", name: "Thermostatic expansion valve 2-ton", brand: "Generic", cost: 110, price: 290, truckStock: 0, reorderPoint: 1, leadTimeDays: 4 },
    { id: "pt-6", sku: "FIL-2025", name: "Air filter 20x25x1 MERV 8", brand: "Generic", cost: 4, price: 18, truckStock: 24, reorderPoint: 6, leadTimeDays: 1 },
  ];
  const generic: Omit<Part,"id">[] = [
    { sku: "CAP-45-5-370", name: "Dual-run capacitor 45/5 µF 370 V", brand: "Generic", cost: 16, price: 68, truckStock: 3, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "CAP-55-5-440", name: "Dual-run capacitor 55/5 µF 440 V", brand: "Generic", cost: 18, price: 72, truckStock: 3, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "CAP-RUN-10-370", name: "Run capacitor 10 µF 370 V", brand: "Generic", cost: 9, price: 38, truckStock: 6, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "CON-40-2P", name: "Contactor 40A 2-pole 24V coil", brand: "Generic", cost: 22, price: 85, truckStock: 2, reorderPoint: 1, leadTimeDays: 1 },
    { sku: "TFM-40VA", name: "Transformer 40 VA 24 V", brand: "Generic", cost: 28, price: 95, truckStock: 4, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "REL-DPDT", name: "Relay DPDT 24 V", brand: "Generic", cost: 12, price: 45, truckStock: 6, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "FUS-30A", name: "Pullout fuse 30 A pair", brand: "Generic", cost: 5, price: 22, truckStock: 10, reorderPoint: 4, leadTimeDays: 1 },
    { sku: "FIL-1625", name: "Air filter 16x25x1 MERV 8", brand: "Generic", cost: 4, price: 18, truckStock: 18, reorderPoint: 6, leadTimeDays: 1 },
    { sku: "FIL-2020", name: "Air filter 20x20x1 MERV 8", brand: "Generic", cost: 4, price: 18, truckStock: 12, reorderPoint: 6, leadTimeDays: 1 },
    { sku: "FIL-MEDIA", name: "Media cabinet filter 20x25x5", brand: "Generic", cost: 24, price: 75, truckStock: 5, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "BLT-A38", name: "V-belt A38", brand: "Generic", cost: 9, price: 35, truckStock: 4, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "BLT-A42", name: "V-belt A42", brand: "Generic", cost: 9, price: 35, truckStock: 4, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "CP-CONDENSATE", name: "Condensate pump 120 V", brand: "Generic", cost: 38, price: 140, truckStock: 3, reorderPoint: 1, leadTimeDays: 2 },
    { sku: "TAB-DRAIN", name: "Drain pan condensate tablets (bag of 100)", brand: "Generic", cost: 12, price: 38, truckStock: 12, reorderPoint: 4, leadTimeDays: 1 },
    { sku: "TST-WIFI", name: "Smart Wi-Fi thermostat", brand: "Generic", cost: 95, price: 285, truckStock: 4, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "TST-7DAY", name: "Programmable thermostat 7-day", brand: "Generic", cost: 32, price: 110, truckStock: 6, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "SNS-FLAME", name: "Flame sensor rod", brand: "Generic", cost: 11, price: 45, truckStock: 6, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "IGN-HSI", name: "Hot surface igniter", brand: "Generic", cost: 26, price: 95, truckStock: 4, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "SNS-PRESSURE", name: "Pressure switch", brand: "Generic", cost: 24, price: 88, truckStock: 3, reorderPoint: 1, leadTimeDays: 2 },
    { sku: "MOT-BLOWER-12", name: "Blower motor 1/2 HP PSC", brand: "Generic", cost: 145, price: 380, truckStock: 1, reorderPoint: 1, leadTimeDays: 3 },
    { sku: "MOT-BLOWER-ECM", name: "ECM blower module", brand: "Generic", cost: 220, price: 525, truckStock: 0, reorderPoint: 1, leadTimeDays: 5 },
    { sku: "DSC-60A", name: "Disconnect 60 A non-fused", brand: "Generic", cost: 22, price: 85, truckStock: 5, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "WIR-18-5", name: "Low-voltage thermostat wire 18/5 (per ft)", brand: "Generic", cost: 0.4, price: 1.5, truckStock: 250, reorderPoint: 50, leadTimeDays: 1 },
    { sku: "REF-SVC-NITRO", name: "Refrigerant service materials (nitrogen, tools)", brand: "Generic", cost: 35, price: 95, truckStock: 8, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "MOT-COND-14", name: "Condenser fan motor 1/4 HP PSC", brand: "Generic", cost: 110, price: 285, truckStock: 1, reorderPoint: 1, leadTimeDays: 3 },
    { sku: "BRD-CTRL", name: "Furnace control board", brand: "Generic", cost: 145, price: 360, truckStock: 1, reorderPoint: 1, leadTimeDays: 4 },
    { sku: "SNS-LIMIT", name: "High-limit switch", brand: "Generic", cost: 18, price: 65, truckStock: 4, reorderPoint: 2, leadTimeDays: 2 },
    { sku: "BLT-COIL-CLEAN", name: "Coil cleaner (gallon)", brand: "Generic", cost: 18, price: 55, truckStock: 6, reorderPoint: 2, leadTimeDays: 1 },
    { sku: "UV-LAMP", name: "Replacement UV lamp", brand: "Generic", cost: 38, price: 110, truckStock: 3, reorderPoint: 1, leadTimeDays: 2 },
  ];
  generic.forEach((g, i) => p.push({ id: `pt-${p.length + 1}`, ...g }));
  return p;
})();

// =============================================================================
// Jobs — deterministic distribution across statuses, dates, techs
// =============================================================================
interface JobSeed {
  id: string;
  customerId: string;
  propertyId: string;
  systemId?: string;
  equipmentId?: string;
  technicianId: string;
  complaint: string;
  status: JobStatus;
  daysAgo: number;
  hour: number;
  priority?: "Low" | "Normal" | "High";
  jobType: "Repair"|"Maintenance"|"Install"|"Inspection"|"Warranty";
  serviceCategory: "No Cooling"|"No Heat"|"Leak"|"Noise"|"Tune-Up"|"Install"|"Thermostat"|"Other";
  billingType: "Billable"|"Warranty"|"Maintenance Plan";
  isCallback?: boolean;
  originalJobId?: string;
  firstTimeFix?: boolean;
  estimateApproved?: boolean;
  rating?: 1|2|3|4|5;
  revenue?: number; partsCost?: number; laborCost?: number;
  travelMin?: number; diagMin?: number; activeMin?: number; pausedMin?: number;
  parts?: { partId: string; qty: number }[];
}

function buildJobs(): { jobs: Job[]; jobParts: JobPart[] } {
  const rng = makeRng(0xDEADBEE5);
  const seeds: JobSeed[] = [];

  const SVC = ["No Cooling","No Heat","Leak","Noise","Tune-Up","Thermostat","Other"] as const;
  const COMPLAINTS = [
    "No cooling. System runs but blowing warm.",
    "No heat — thermostat calling, no warm air.",
    "Weak cooling, room not reaching set point.",
    "Frozen evaporator coil observed at indoor unit.",
    "Water leak at indoor unit.",
    "Drain blockage causing overflow.",
    "Poor airflow across the home.",
    "Blower not running on heat call.",
    "Outdoor unit not running.",
    "Compressor humming, not starting.",
    "Short cycling every few minutes.",
    "Unusual noise from outdoor unit.",
    "Thermostat shows offline intermittently.",
    "Electrical issue — breaker tripped.",
    "Furnace ignition failure.",
    "Flame-sensing intermittent fault.",
    "Pressure switch trip on heating call.",
    "Heat-pump defrost concern, ice buildup.",
    "Auxiliary heat staying on, high bill.",
    "Mini-split communication error displayed.",
    "One ductless zone not operating.",
    "IAQ accessory service request.",
    "Preventive maintenance — seasonal.",
    "Installation inspection following replacement.",
    "System commissioning checklist.",
    "Warranty visit — compressor concern.",
    "Callback — same complaint as prior visit.",
    "Second visit to install ordered part.",
  ];

  const techCounts = new Map<string, number>(TECH_IDS.map((id) => [id, 0]));
  const pickTech = (i: number) => {
    // weighted: alex/jordan/sam get more jobs, taylor (apprentice) fewer
    const weights = [22, 20, 18, 16, 14, 12, 6, 12]; // sum=120
    let r = (i * 7) % 120;
    for (let j = 0; j < TECH_IDS.length; j++) {
      r -= weights[j];
      if (r < 0) { techCounts.set(TECH_IDS[j], (techCounts.get(TECH_IDS[j]) ?? 0) + 1); return TECH_IDS[j]; }
    }
    return TECH_IDS[0];
  };

  const pickProp = (i: number) => PROPERTIES[(i * 11) % PROPERTIES.length];

  // ── j-1: stable Goodman scenario job ──────────────────────────────
  seeds.push({
    id: "j-1", customerId: "c-1", propertyId: "p-1", systemId: "sys-1", equipmentId: "eq-1",
    technicianId: "u-alex", complaint: "No cooling. System runs but blowing warm.",
    status: "On Site", daysAgo: 0, hour: 10, priority: "High",
    jobType: "Repair", serviceCategory: "No Cooling", billingType: "Maintenance Plan",
  });

  // Helper to build a job from a system + status pattern
  let nextId = 2;
  const makeJob = (overrides: Partial<JobSeed> & Pick<JobSeed,"status"|"daysAgo"|"hour"|"jobType"|"serviceCategory"|"billingType"|"complaint">): JobSeed => {
    const i = nextId++;
    const sys = SYSTEMS[(i * 3) % SYSTEMS.length];
    const cust = CUSTOMERS.find((c) => c.id === sys.customerId)!;
    const prop = PROPERTIES.find((p) => p.id === sys.propertyId)!;
    return {
      id: `j-${i}`,
      customerId: cust.id, propertyId: prop.id,
      systemId: sys.id, equipmentId: sys.equipmentIds[0],
      technicianId: pickTech(i),
      priority: overrides.priority ?? "Normal",
      ...overrides,
    } as JobSeed;
  };

  // ── Today's open mix (8): scheduled + active statuses ────────────
  const todayMix: { status: JobStatus; hour: number; cat: typeof SVC[number]; type: JobSeed["jobType"]; bill: JobSeed["billingType"] }[] = [
    { status: "Scheduled", hour: 11, cat: "Tune-Up", type: "Maintenance", bill: "Maintenance Plan" },
    { status: "Scheduled", hour: 13, cat: "Thermostat", type: "Repair", bill: "Billable" },
    { status: "Scheduled", hour: 15, cat: "No Cooling", type: "Repair", bill: "Billable" },
    { status: "En Route", hour: 9, cat: "No Cooling", type: "Repair", bill: "Billable" },
    { status: "Near Destination", hour: 12, cat: "No Heat", type: "Repair", bill: "Billable" },
    { status: "Diagnosing", hour: 8, cat: "Leak", type: "Repair", bill: "Billable" },
    { status: "Waiting for Approval", hour: 9, cat: "No Cooling", type: "Repair", bill: "Billable" },
    { status: "Waiting for Customer", hour: 14, cat: "Thermostat", type: "Repair", bill: "Billable" },
  ];
  for (const t of todayMix) {
    seeds.push(makeJob({
      status: t.status, daysAgo: 0, hour: t.hour, priority: "Normal",
      jobType: t.type, serviceCategory: t.cat, billingType: t.bill,
      complaint: COMPLAINTS[(nextId * 5) % COMPLAINTS.length],
    }));
  }

  // ── Unknown-equipment jobs (4) — equipment to be identified on-site ──
  const unknownSeeds: { id: string; daysAgo: number; hour: number; complaint: string; tech: string; cust: string; prop: string; }[] = [
    { id: "j-unk-1", daysAgo: 0,  hour: 14, complaint: "No cooling. Customer does not know unit model — needs identification on arrival.", tech: "u-alex",   cust: CUSTOMERS[2].id, prop: PROPERTIES[2].id },
    { id: "j-unk-2", daysAgo: -1, hour: 10, complaint: "Strange noise from outdoor unit. New homeowner — equipment unknown.",              tech: "u-jordan", cust: CUSTOMERS[4].id, prop: PROPERTIES[4].id },
    { id: "j-unk-3", daysAgo: -3, hour: 11, complaint: "Furnace not igniting. Rental property — manager unsure of brand or model.",        tech: "u-sam",    cust: CUSTOMERS[6].id, prop: PROPERTIES[6].id },
    { id: "j-unk-4", daysAgo: -5, hour: 9,  complaint: "Mini-split zone offline. Equipment not on file. To be identified on site.",         tech: "u-taylor", cust: CUSTOMERS[8].id, prop: PROPERTIES[8].id },
  ];
  for (const u of unknownSeeds) {
    seeds.push({
      id: u.id, customerId: u.cust, propertyId: u.prop,
      systemId: undefined, equipmentId: undefined,
      technicianId: u.tech, complaint: u.complaint,
      status: "Scheduled", daysAgo: u.daysAgo, hour: u.hour, priority: "Normal",
      jobType: "Repair", serviceCategory: "Other", billingType: "Billable",
    });
  }

  // ── Future scheduled (12) ────────────────────────────────────────
  for (let d = 1; d <= 12; d++) {
    seeds.push(makeJob({
      status: "Scheduled", daysAgo: -d, hour: 9 + (d % 7),
      jobType: d % 3 === 0 ? "Maintenance" : "Repair",
      serviceCategory: d % 3 === 0 ? "Tune-Up" : (d % 2 === 0 ? "No Cooling" : "No Heat"),
      billingType: d % 4 === 0 ? "Maintenance Plan" : "Billable",
      complaint: COMPLAINTS[(d * 3) % COMPLAINTS.length],
    }));
  }

  // ── Waiting for Parts (8) — interspersed historical ──────────────
  for (let i = 0; i < 8; i++) {
    seeds.push(makeJob({
      status: "Waiting for Parts", daysAgo: 1 + i, hour: 10 + (i % 6),
      jobType: "Repair",
      serviceCategory: i % 2 === 0 ? "No Cooling" : "No Heat",
      billingType: "Billable",
      complaint: "Part needed — not on hand. Awaiting delivery.",
      partsCost: 0, laborCost: 145, revenue: 145, firstTimeFix: false, estimateApproved: true,
      travelMin: 25, diagMin: 30, activeMin: 20, pausedMin: 0,
    }));
  }

  // ── Waiting for Approval (5) ─────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    seeds.push(makeJob({
      status: "Waiting for Approval", daysAgo: 1 + i, hour: 11 + (i % 4),
      jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable",
      complaint: "Estimate sent, waiting for customer decision.",
      travelMin: 22, diagMin: 35, activeMin: 0, pausedMin: 0,
    }));
  }

  // ── Cancelled (5) ────────────────────────────────────────────────
  for (let i = 0; i < 5; i++) {
    seeds.push(makeJob({
      status: "Cancelled", daysAgo: 3 + i * 2, hour: 14,
      jobType: "Repair", serviceCategory: "Other", billingType: "Billable",
      complaint: "Customer cancelled — issue resolved itself.",
      revenue: 0, partsCost: 0, laborCost: 0,
    }));
  }

  // ── Callbacks (8) — historical, marked isCallback=true ───────────
  for (let i = 0; i < 8; i++) {
    seeds.push(makeJob({
      status: "Completed", daysAgo: 5 + i * 4, hour: 10 + (i % 6),
      jobType: "Repair", serviceCategory: "No Cooling", billingType: "Billable",
      complaint: "Callback — same complaint as prior visit.",
      isCallback: true, firstTimeFix: false, estimateApproved: true,
      revenue: 280 + i * 25, partsCost: 65, laborCost: 145, rating: rng.int(2,4) as 2|3|4,
      travelMin: 22 + (i % 4) * 3, diagMin: 30, activeMin: 45, pausedMin: 10,
      parts: [{ partId: "pt-1", qty: 1 }],
    }));
  }

  // ── Warranty visits (12) ─────────────────────────────────────────
  for (let i = 0; i < 12; i++) {
    seeds.push(makeJob({
      status: "Completed", daysAgo: 4 + i * 5, hour: 9 + (i % 7),
      jobType: "Warranty", serviceCategory: i % 2 === 0 ? "No Cooling" : "No Heat", billingType: "Warranty",
      complaint: "Warranty service visit.",
      firstTimeFix: rng.chance(0.7), estimateApproved: true,
      revenue: 0, partsCost: 0, laborCost: 145, rating: rng.int(3,5) as 3|4|5,
      travelMin: 25, diagMin: 45, activeMin: 75, pausedMin: 15,
    }));
  }

  // ── 100 completed jobs distributed across date buckets ───────────
  // The 8 callbacks and 12 warranty above contribute 20. Add 80 more.
  const buckets: { range: [number, number]; count: number }[] = [
    { range: [1, 1], count: 5 },     // yesterday
    { range: [2, 6], count: 12 },    // this week
    { range: [7, 13], count: 12 },   // last week
    { range: [14, 30], count: 18 },  // this month earlier / 30d
    { range: [31, 60], count: 14 },  // last month
    { range: [61, 90], count: 8 },   // this quarter earlier
    { range: [91, 180], count: 6 },  // last quarter
    { range: [181, 365], count: 4 }, // earlier this year / last year
    { range: [366, 500], count: 1 }, // last year boundary
  ];
  for (const b of buckets) {
    for (let i = 0; i < b.count; i++) {
      const days = b.range[0] + Math.floor((i / Math.max(1, b.count)) * (b.range[1] - b.range[0]));
      const type = rng.pick(["Repair","Repair","Repair","Maintenance","Maintenance","Install","Inspection"] as const);
      const cat: JobSeed["serviceCategory"] = type === "Maintenance" ? "Tune-Up" : type === "Install" ? "Install" : rng.pick(SVC);
      const billing = rng.pick(["Billable","Billable","Billable","Maintenance Plan"] as const);
      const partsCost = rng.pick([0, 0, 18, 65, 78, 95, 110, 240]);
      const labor = 145 + rng.pick([0, 73, 145, 218]);
      const revenue = type === "Install" ? 4250 + rng.int(0, 1500) : Math.round(labor + partsCost * 2.1 + rng.int(0, 80));
      seeds.push(makeJob({
        status: "Completed", daysAgo: days, hour: 8 + (i % 9),
        jobType: type, serviceCategory: cat, billingType: billing,
        complaint: COMPLAINTS[(days + i) % COMPLAINTS.length],
        firstTimeFix: rng.chance(0.82),
        estimateApproved: rng.chance(0.92),
        rating: rng.int(3, 5) as 3|4|5,
        revenue, partsCost, laborCost: labor,
        travelMin: rng.int(15, 38), diagMin: rng.int(15, 70),
        activeMin: type === "Install" ? rng.int(180, 360) : rng.int(35, 120),
        pausedMin: rng.chance(0.4) ? rng.int(10, 35) : 0,
        parts: partsCost === 65 ? [{ partId: "pt-1", qty: 1 }]
              : partsCost === 78 ? [{ partId: "pt-2", qty: 1 }]
              : partsCost === 95 ? [{ partId: "pt-3", qty: 1 }]
              : partsCost === 240 ? [{ partId: "pt-4", qty: 1 }]
              : partsCost === 18 ? [{ partId: "pt-6", qty: 1 }]
              : partsCost === 110 ? [{ partId: "pt-5", qty: 1 }]
              : undefined,
      }));
    }
  }

  // ── Build final Job[] ─────────────────────────────────────────────
  const jobs: Job[] = [];
  const jobParts: JobPart[] = [];
  for (const s of seeds) {
    const scheduledFor = dayOffsetISO(-s.daysAgo, s.hour, 0);
    const job: Job = {
      id: s.id, customerId: s.customerId, propertyId: s.propertyId,
      systemId: s.systemId, equipmentId: s.equipmentId,
      technicianId: s.technicianId, complaint: s.complaint, status: s.status,
      scheduledFor, priority: s.priority ?? "Normal",
      jobType: s.jobType, serviceCategory: s.serviceCategory, billingType: s.billingType,
      isCallback: s.isCallback ?? false, originalJobId: s.originalJobId,
      firstTimeFix: s.firstTimeFix, estimateApproved: s.estimateApproved, rating: s.rating,
      revenue: s.revenue, partsCost: s.partsCost, laborCost: s.laborCost,
      travelMinutes: s.travelMin, diagnosticMinutes: s.diagMin,
      activeLaborMinutes: s.activeMin, pausedMinutes: s.pausedMin,
      totalDurationMinutes: (s.travelMin ?? 0) + (s.diagMin ?? 0) + (s.activeMin ?? 0) + (s.pausedMin ?? 0) || undefined,
    };
    if (s.status === "Completed") {
      const travelStart = scheduledFor;
      const arrivedAt = isoMinutesAfter(travelStart, s.travelMin ?? 20);
      const diagStartedAt = isoMinutesAfter(arrivedAt, 2);
      const completedAt = isoMinutesAfter(diagStartedAt, (s.diagMin ?? 0) + (s.activeMin ?? 0) + (s.pausedMin ?? 0));
      Object.assign(job, {
        travelStartedAt: travelStart, arrivedAt,
        arrivalMethod: "gps-detected" as const,
        diagnosisStartedAt: diagStartedAt, completedAt,
      });
    }
    jobs.push(job);
    if (s.parts) for (const p of s.parts) jobParts.push({ jobId: s.id, partId: p.partId, qty: p.qty });
  }
  return { jobs, jobParts };
}
const { jobs: JOB_BUILD, jobParts: JP_BUILD } = buildJobs();
export const JOBS: Job[] = JOB_BUILD;
export const JOB_PARTS: JobPart[] = JP_BUILD;

// =============================================================================
// Part requests (25)
// =============================================================================
export const PART_REQUESTS: PartRequest[] = (() => {
  const rng = makeRng(0xCAFEBABE);
  const waiting = JOBS.filter((j) => j.status === "Waiting for Parts");
  const others = JOBS.filter((j) => j.status === "Completed").slice(0, 17);
  const all = [...waiting, ...others].slice(0, 25);
  const statuses: PartRequest["status"][] = ["Identification Needed","Compatibility Review","Requested","Approved","Ordered","Available at Warehouse","Assigned to Technician","Installed","Cancelled"];
  return all.map((j, i) => ({
    id: `pr-${i + 1}`, jobId: j.id, customerId: j.customerId, equipmentId: j.equipmentId,
    technicianId: j.technicianId,
    name: rng.pick(["Dual-run capacitor","Compressor contactor","Condenser fan motor","ECM blower module","Pressure switch","Smart thermostat"]),
    qty: 1, urgency: rng.pick(["Normal","Normal","High","Critical"] as const),
    compatibility: rng.pick(["Unknown","Likely","Verified by qualified user"] as const),
    status: j.status === "Waiting for Parts" ? rng.pick(["Requested","Approved","Ordered"] as const) : statuses[(i + 3) % statuses.length],
    createdAt: new Date(+ANCHOR - (i + 1) * 86400000).toISOString(),
    updatedAt: new Date(+ANCHOR - i * 86400000).toISOString(),
  }));
})();

// =============================================================================
// Authorizations (30)
// =============================================================================
export const AUTHORIZATIONS: Authorization[] = JOBS
  .filter((j) => j.status === "Completed" && j.estimateApproved)
  .slice(0, 30)
  .map((j) => ({
    jobId: j.id, signedBy: "Customer (demo signature)",
    approvedAt: j.completedAt, total: j.revenue, decision: "approved",
  }));

// =============================================================================
// Service reports (45)
// =============================================================================
export const SERVICE_REPORTS: ServiceReport[] = JOBS
  .filter((j) => j.status === "Completed").slice(0, 45)
  .map((j, i) => ({
    id: `rpt-${i + 1}`, jobId: j.id, customerId: j.customerId, technicianId: j.technicianId,
    summary: `${j.serviceCategory ?? "Service"} visit completed. ${j.firstTimeFix ? "Resolved on first visit." : "Follow-up recommended."}`,
    recommendations: j.serviceCategory === "Tune-Up" ? ["Replace 1\" filter every 60 days"] : ["Monitor for recurrence"],
    generatedAt: j.completedAt ?? new Date().toISOString(),
  }));

// =============================================================================
// Photos (75) — placeholder swatches, no binary data
// =============================================================================
export const PHOTOS: Photo[] = (() => {
  const out: Photo[] = [];
  const swatches = ["bg-slate-300","bg-stone-300","bg-zinc-400","bg-amber-200","bg-blue-200","bg-emerald-200","bg-rose-200"];
  const completed = JOBS.filter((j) => j.status === "Completed").slice(0, 38);
  let i = 0;
  for (const j of completed) {
    out.push({ id: `ph-${++i}`, jobId: j.id, equipmentId: j.equipmentId, customerId: j.customerId, kind: "Before", caption: "Before service", swatchClass: swatches[i % swatches.length], capturedAt: j.arrivedAt ?? j.scheduledFor, capturedBy: j.technicianId });
    out.push({ id: `ph-${++i}`, jobId: j.id, equipmentId: j.equipmentId, customerId: j.customerId, kind: "After", caption: "After service", swatchClass: swatches[(i + 2) % swatches.length], capturedAt: j.completedAt ?? j.scheduledFor, capturedBy: j.technicianId });
    if (i >= 70) break;
  }
  // 5 nameplate photos
  for (let k = 0; k < 5; k++) {
    const e = EQUIPMENT[k * 7 % EQUIPMENT.length];
    out.push({ id: `ph-${++i}`, equipmentId: e.id, kind: "Nameplate", caption: `${e.manufacturer} ${e.model} nameplate`, swatchClass: "bg-zinc-200", capturedAt: ANCHOR.toISOString(), capturedBy: "u-alex" });
  }
  return out.slice(0, 75);
})();

// =============================================================================
// Customer feedback (40)
// =============================================================================
export const CUSTOMER_FEEDBACK: CustomerFeedback[] = (() => {
  const rng = makeRng(0xFEED);
  return JOBS.filter((j) => j.status === "Completed" && j.rating)
    .slice(0, 40).map((j, i) => ({
      id: `cf-${i + 1}`, jobId: j.id, customerId: j.customerId, technicianId: j.technicianId,
      rating: (j.rating ?? 4) as 1|2|3|4|5,
      communication: Math.min(5, Math.max(1, (j.rating ?? 4) + rng.int(-1, 1))) as 1|2|3|4|5,
      timeliness: Math.min(5, Math.max(1, (j.rating ?? 4) + rng.int(-1, 1))) as 1|2|3|4|5,
      explanationClarity: Math.min(5, Math.max(1, (j.rating ?? 4))) as 1|2|3|4|5,
      cleanliness: Math.min(5, Math.max(1, (j.rating ?? 4))) as 1|2|3|4|5,
      overall: (j.rating ?? 4) as 1|2|3|4|5,
      comment: rng.pick(["On time and professional.","Explained everything clearly.","Quick fix, thank you.","Will request the same tech next time.","Friendly and efficient."]),
      testimonialOk: rng.chance(0.5),
      submittedAt: j.completedAt ?? new Date().toISOString(),
    }));
})();

// =============================================================================
// Technician feedback (25)
// =============================================================================
export const TECH_FEEDBACK: TechFeedback[] = (() => {
  const rng = makeRng(0xACED);
  const out: TechFeedback[] = [];
  for (let i = 0; i < 25; i++) {
    const j = JOBS[(i * 13) % JOBS.length];
    out.push({
      id: `tf-${i + 1}`, jobId: j.id, technicianId: j.technicianId,
      diagnosticStepId: rng.pick(["A","B","C1","D","E","G"]),
      helpful: rng.chance(0.6),
      confusing: rng.chance(0.2),
      missingSource: rng.chance(0.25),
      suggestedImprovement: rng.pick(["Add a torque-spec reference.","Include a wiring photo overlay.","Surface prior callback for this property.","Voice-note placeholder works well."]),
      submittedAt: new Date(+ANCHOR - i * 3 * 86400000).toISOString(),
    });
  }
  return out;
})();

// =============================================================================
// Documents (20)
// =============================================================================
export const DOCS: DocItem[] = [
  { id: "d-1", title: "Goodman GSXN3 product page", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: goodmanProductSource.url!, status: "Approved", uploadedAt: "2026-04-02" },
  { id: "d-2", title: "Goodman SS-GSXN3 specification sheet (06/23)", manufacturer: "Goodman", model: "GSXN3", category: "spec_sheet", url: goodmanPdfSource.url!, status: "Approved", uploadedAt: "2026-04-02" },
  ...manufacturerDocItems(),
  ...top50DocItems(),
  { id: "d-3", title: "Caloosa Cooling — Capacitor replacement SOP", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-18" },
  { id: "d-4", title: "Caloosa Cooling — Customer arrival message script", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-21" },
  { id: "d-5", title: "Caloosa Cooling — Safety lockout/tagout policy", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-22" },
  { id: "d-6", title: "Caloosa Cooling — Maintenance checklist (residential)", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-25" },
  { id: "d-7", title: "Caloosa Cooling — Maintenance checklist (light commercial)", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-25" },
  { id: "d-8", title: "Caloosa Cooling — Quoting & estimate template", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-03-26" },
  { id: "d-9", title: "Furnace gas-section training overview (internal)", category: "training_guide", url: "#", status: "Approved", uploadedAt: "2026-03-30" },
  { id: "d-10", title: "Mini-split installation training (internal)", category: "training_guide", url: "#", status: "Approved", uploadedAt: "2026-04-01" },
  { id: "d-11", title: "Heat-pump defrost basics (internal)", category: "training_guide", url: "#", status: "Approved", uploadedAt: "2026-04-03" },
  { id: "d-12", title: "Goodman GSXN3 installation manual", manufacturer: "Goodman", model: "GSXN3", category: "installation_manual", url: "#", status: "Needs Review", uploadedAt: "2026-06-21" },
  { id: "d-13", title: "Service bulletin — generic capacitor tolerance reminders", category: "service_bulletin", url: "#", status: "Needs Review", uploadedAt: "2026-06-15" },
  { id: "d-14", title: "Generic furnace service manual (placeholder)", category: "service_manual", url: "#", status: "Uploaded", uploadedAt: "2026-06-22" },
  { id: "d-15", title: "Generic heat-pump service manual (placeholder)", category: "service_manual", url: "#", status: "Uploaded", uploadedAt: "2026-06-22" },
  { id: "d-16", title: "Generic mini-split service manual (placeholder)", category: "service_manual", url: "#", status: "Uploaded", uploadedAt: "2026-06-22" },
  { id: "d-17", title: "Generic RTU service manual (placeholder)", category: "service_manual", url: "#", status: "Processing", uploadedAt: "2026-06-23" },
  { id: "d-18", title: "Wiring diagrams library (placeholder)", category: "wiring_diagram", url: "#", status: "Needs Review", uploadedAt: "2026-06-24" },
  { id: "d-19", title: "Caloosa Cooling — Refrigerant handling policy", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-04-05" },
  { id: "d-20", title: "Caloosa Cooling — Customer communication policy", category: "company_sop", url: "#", status: "Approved", uploadedAt: "2026-04-05" },
];

// =============================================================================
// Knowledge base (15)
// =============================================================================
export const KNOWLEDGE: KnowledgeCase[] = [
  { id: "k-1", title: "GSXN3 2-ton no cooling — weak compressor side of dual-run cap", model: "Goodman GSXN3", symptom: "Outdoor fan runs, compressor hums then trips", cause: "Dual-run capacitor compressor section out of tolerance", fix: "Replace dual-run capacitor with matching rating", technician: "Alex Reed", approved: true },
  { id: "k-2", title: "Carrier Comfort 16 — contactor pitting causes intermittent no-call", model: "Carrier 24ACC6", symptom: "Intermittent no cooling, contactor chatter", cause: "Pitted contactor contacts", fix: "Replace 30A 2P contactor; check 24V at coil", technician: "Sam Patel", approved: true },
  { id: "k-3", title: "Trane XR14 — TXV bulb loose, low superheat swing", model: "Trane XR14", symptom: "Iced suction line; low superheat", cause: "TXV sensing bulb strap loose", fix: "Re-strap, re-insulate; verify superheat", technician: "Jordan Lee", approved: true },
  { id: "k-4", title: "Mitsubishi MUZ — communication error E6 after surge", model: "Mitsubishi MUZ", symptom: "Indoor display flashes communication code", cause: "Loose comm wire at outdoor terminal", fix: "Re-land conductor; verify shield", technician: "Elena Rodriguez", approved: true },
  { id: "k-5", title: "Lennox ML14 — frozen indoor coil due to airflow restriction", model: "Lennox ML14", symptom: "Frozen coil, low return air", cause: "Loaded filter and dirty blower wheel", fix: "Replace filter, clean wheel, verify static", technician: "Jordan Lee", approved: true },
  { id: "k-6", title: "Rheem RA14 — pressure switch trip with dirty condenser", model: "Rheem RA14", symptom: "1F lockout in afternoon heat", cause: "Coil restriction, weak airflow", fix: "Wash coil, verify fan amps", technician: "Sam Patel", approved: true },
  { id: "k-7", title: "Carrier 59TN6 furnace — flame sensor coated", model: "Carrier 59TN6", symptom: "Ignites, drops out after 5 seconds", cause: "Carbon on flame sensor", fix: "Clean rod with abrasive pad, verify microamps", technician: "Marcus Green", approved: true },
  { id: "k-8", title: "Trane S9V2 — pressure switch tubing kink", model: "Trane S9V2", symptom: "Pressure switch will not close", cause: "Kinked silicone tubing at inducer", fix: "Replace tubing, verify drafts", technician: "Marcus Green", approved: true },
  { id: "k-9", title: "Daikin mini-split — drain pan slope error", model: "Daikin Mini-Split", symptom: "Water leak from head", cause: "Indoor unit installed without slope", fix: "Re-mount with required slope; flush drain", technician: "Elena Rodriguez", approved: true },
  { id: "k-10", title: "Goodman GSXN4 — capacitor compressor side low after storm", model: "Goodman GSXN4", symptom: "Hard start; trips after a few cycles", cause: "Capacitor degraded after surge", fix: "Replace dual-run capacitor", technician: "Alex Reed", approved: true },
  { id: "k-11", title: "Carrier RTU — economizer stuck open in winter", model: "Carrier RTU", symptom: "Cold air supply on heating call", cause: "Economizer actuator failed open", fix: "Replace actuator; verify min position", technician: "Devon Price", approved: true },
  { id: "k-12", title: "Heat-pump defrost board terminator", model: "Trane XR14", symptom: "No defrost cycle initiated", cause: "Defrost sensor disconnected", fix: "Re-seat sensor, confirm reading", technician: "Jordan Lee", approved: true },
  { id: "k-13", title: "Dual-fuel changeover misconfigured", model: "Honeywell dual-fuel thermostat", symptom: "Furnace runs above changeover", cause: "Stat configured cool-only at compressor", fix: "Reconfigure changeover and outdoor sensor", technician: "Marcus Green", approved: true },
  { id: "k-14", title: "Smart thermostat C-wire missing", model: "Generic smart thermostat", symptom: "Stat reboots intermittently", cause: "No common wire — power stealing", fix: "Add C wire or PEK adapter", technician: "Taylor Brooks", approved: true },
  { id: "k-15", title: "Package unit — belt tension and worn pulley", model: "Carrier package", symptom: "Squeal at start, poor airflow", cause: "Belt slip; pulley worn", fix: "Replace belt, inspect pulley; verify amps", technician: "Devon Price", approved: true },
];

// =============================================================================
// Initial diagnostic session for the verified Goodman scenario
// =============================================================================
export const DIAG_SESSION_ID = "ds-j1";
export const INITIAL_DIAG: DiagnosticSession = {
  id: DIAG_SESSION_ID, jobId: "j-1", templateId: "no-cooling-v1",
  currentStepId: "A", results: [], measurements: [],
  visitedStepIds: ["A"], invalidatedStepIds: [],
};

// =============================================================================
// Scenario index — used by the technician Scenario selector
// =============================================================================
export interface ScenarioDef {
  id: string;
  title: string;
  systemType: string;
  complaint: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estMinutes: number;
  skills: string[];
  jobId: string;
  equipmentId?: string;
  verified: boolean;
}
export const SCENARIOS: ScenarioDef[] = (() => {
  // Pick deterministic seeded jobs for each scenario based on the system templates
  const find = (configMatch: (s: SystemRecord) => boolean): { jobId: string; equipmentId?: string } => {
    const sys = SYSTEMS.find(configMatch);
    if (!sys) return { jobId: "j-1", equipmentId: "eq-1" };
    const job = JOBS.find((j) => j.systemId === sys.id) ?? JOBS[1];
    return { jobId: job.id, equipmentId: job.equipmentId };
  };
  return [
    { id: "sc-1", title: "Split AC — No Cooling (verified Goodman)", systemType: "Straight-Cool Split + Air Handler", complaint: "No cooling. System runs but blowing warm.", difficulty: "Beginner", estMinutes: 12, skills: ["Equipment ID","Specification search","Capacitor tolerance","Customer approval"], jobId: "j-1", equipmentId: "eq-1", verified: true },
    { id: "sc-2", title: "Gas Furnace — No Heat", systemType: "Central Split AC + Gas Furnace", complaint: "Furnace ignition failure.", difficulty: "Intermediate", estMinutes: 15, skills: ["Sequence of operation","Safety escalation","Documentation"], ...find((s) => s.configuration === "Central Split AC + Gas Furnace"), verified: false },
    { id: "sc-3", title: "Heat Pump — Weak Heating", systemType: "Split Heat Pump + Air Handler", complaint: "Heating not keeping up; aux running constantly.", difficulty: "Intermediate", estMinutes: 14, skills: ["Outdoor/indoor relationship","Aux heat","Defrost observation"], ...find((s) => s.configuration === "Split Heat Pump + Air Handler"), verified: false },
    { id: "sc-4", title: "Mini-Split — Water Leak", systemType: "Single-Zone Mini-Split", complaint: "Water dripping from indoor head.", difficulty: "Beginner", estMinutes: 10, skills: ["Photo documentation","Condensate path","Customer explanation"], ...find((s) => s.configuration === "Single-Zone Mini-Split"), verified: false },
    { id: "sc-5", title: "Package Unit — No Cooling", systemType: "Packaged Gas/Electric", complaint: "Package unit not cooling; part needed not on truck.", difficulty: "Intermediate", estMinutes: 16, skills: ["Packaged ID","Pause for parts","Follow-up scheduling"], ...find((s) => s.configuration === "Packaged Gas/Electric"), verified: false },
    { id: "sc-6", title: "Commercial RTU — Maintenance", systemType: "Light-Commercial RTU", complaint: "Quarterly preventive maintenance.", difficulty: "Advanced", estMinutes: 25, skills: ["Multi-section checklist","Before/after photos","Multiple units per property"], ...find((s) => s.configuration === "Light-Commercial RTU"), verified: false },
  ];
})();
