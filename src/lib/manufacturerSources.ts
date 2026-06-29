import type { DocItem, Equipment, Source } from "./types";

export interface ManufacturerSourceRecord {
  id: string;
  manufacturer: string;
  equipmentTypes: string[];
  title: string;
  model: string;
  category: DocItem["category"];
  url: string;
  reviewedAt: string;
  aiIndexSummary: string;
  verificationNote: string;
}

export const MANUFACTURER_SOURCE_REVIEWED_AT = "2026-06-29";

export const MANUFACTURER_SOURCE_LIBRARY: ManufacturerSourceRecord[] = [
  {
    id: "mfg-goodman-ac",
    manufacturer: "Goodman",
    equipmentTypes: ["Air Conditioner"],
    title: "Goodman air conditioners product library",
    model: "Current Goodman AC families",
    category: "spec_sheet",
    url: "https://www.goodmanmfg.com/products/air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Goodman product library for current residential air conditioner families. Use it to locate the exact family page or submittal before extracting numeric values.",
    verificationNote: "Exact MCA, MOP, charge, dimensions, wiring, and parts must be confirmed against the installed model nameplate and model-specific literature.",
  },
  {
    id: "mfg-amana-ac",
    manufacturer: "Amana",
    equipmentTypes: ["Air Conditioner"],
    title: "Amana air conditioners product library",
    model: "Current Amana AC families",
    category: "spec_sheet",
    url: "https://www.amana-hac.com/products/air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Amana product library for current residential air conditioner families.",
    verificationNote: "Use as a source pointer only until exact model literature is reviewed.",
  },
  {
    id: "mfg-carrier-ac",
    manufacturer: "Carrier",
    equipmentTypes: ["Air Conditioner", "Package Gas/Electric", "Package Heat Pump", "RTU"],
    title: "Carrier residential air conditioners product library",
    model: "Current Carrier cooling families",
    category: "spec_sheet",
    url: "https://www.carrier.com/residential/en/us/products/air-conditioners/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Carrier residential air conditioner library. Use it to select the exact model family and then review product data before quoting specs.",
    verificationNote: "Do not use family marketing pages as numeric service specifications.",
  },
  {
    id: "mfg-bryant-ac",
    manufacturer: "Bryant",
    equipmentTypes: ["Air Conditioner"],
    title: "Bryant air conditioners product library",
    model: "Current Bryant AC families",
    category: "spec_sheet",
    url: "https://www.bryant.com/en/us/products/air-conditioners/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Bryant product library for current residential air conditioner families.",
    verificationNote: "Exact service values require the model-specific product data or nameplate.",
  },
  {
    id: "mfg-trane-ac",
    manufacturer: "Trane",
    equipmentTypes: ["Air Conditioner", "Heat Pump"],
    title: "Trane residential air conditioners product library",
    model: "Current Trane cooling families",
    category: "spec_sheet",
    url: "https://www.trane.com/residential/en/products/air-conditioners/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Trane residential air conditioner library for current product families.",
    verificationNote: "Use as a source pointer until the exact installed model is reviewed.",
  },
  {
    id: "mfg-american-standard-ac",
    manufacturer: "American Standard",
    equipmentTypes: ["Air Conditioner", "Heat Pump"],
    title: "American Standard air conditioners product library",
    model: "Current American Standard cooling families",
    category: "spec_sheet",
    url: "https://www.americanstandardair.com/products/air-conditioners/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official American Standard air conditioner product library.",
    verificationNote: "Exact values require model-specific literature and nameplate confirmation.",
  },
  {
    id: "mfg-lennox-ac",
    manufacturer: "Lennox",
    equipmentTypes: ["Air Conditioner", "Heat Pump", "RTU"],
    title: "Lennox air conditioners product library",
    model: "Current Lennox cooling families",
    category: "spec_sheet",
    url: "https://www.lennox.com/products/heating-cooling/air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Lennox air conditioner product library.",
    verificationNote: "Do not extract numeric service specs until the exact model document is approved.",
  },
  {
    id: "mfg-rheem-ac",
    manufacturer: "Rheem",
    equipmentTypes: ["Air Conditioner", "Heat Pump"],
    title: "Rheem residential air conditioners product library",
    model: "Current Rheem AC families",
    category: "spec_sheet",
    url: "https://www.rheem.com/products/residential/heating-and-cooling/air_conditioners/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Rheem residential air conditioner product library.",
    verificationNote: "Exact service values require model-specific literature and nameplate confirmation.",
  },
  {
    id: "mfg-ruud-ra14ay",
    manufacturer: "Ruud",
    equipmentTypes: ["Air Conditioner"],
    title: "Ruud Endeavor Line Select Series RA14AY air conditioner",
    model: "RA14AY",
    category: "spec_sheet",
    url: "https://www.ruud.com/product/endeavor-line-select-series-air-conditioner-ra14ay/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Ruud product page for the Endeavor Line Select Series RA14AY air conditioner.",
    verificationNote: "Use as a source pointer until exact submittal and nameplate values are approved.",
  },
  {
    id: "mfg-ruud-ra20az",
    manufacturer: "Ruud",
    equipmentTypes: ["Air Conditioner"],
    title: "Ruud Endeavor Line Prestige Series RA20AZ air conditioner",
    model: "RA20AZ",
    category: "spec_sheet",
    url: "https://www.ruud.com/product/endeavor-line-prestige-series-variable-speed-air-conditioner-ra20az/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Ruud product page for the Endeavor Line Prestige Series RA20AZ variable-speed air conditioner.",
    verificationNote: "Use as a source pointer until exact submittal and nameplate values are approved.",
  },
  {
    id: "mfg-york-ac",
    manufacturer: "York",
    equipmentTypes: ["Air Conditioner", "Package Gas/Electric", "Package Heat Pump", "RTU"],
    title: "York split-system air conditioners product library",
    model: "Current York cooling families",
    category: "spec_sheet",
    url: "https://www.york.com/residential-equipment/heating-and-cooling/split-system-air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official York residential split-system air conditioner library.",
    verificationNote: "Use only as a source pointer until the exact model document is approved.",
  },
  {
    id: "mfg-coleman-ac",
    manufacturer: "Coleman",
    equipmentTypes: ["Air Conditioner"],
    title: "Coleman split-system air conditioners product library",
    model: "Current Coleman cooling families",
    category: "spec_sheet",
    url: "https://www.colemanac.com/residential-equipment/heating-and-cooling/split-system-air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Coleman residential split-system air conditioner library.",
    verificationNote: "Use only as a source pointer until exact model literature is reviewed.",
  },
  {
    id: "mfg-daikin-ac",
    manufacturer: "Daikin",
    equipmentTypes: ["Air Conditioner", "Heat Pump", "Mini-Split Outdoor", "Mini-Split Indoor"],
    title: "Daikin whole-house air conditioners product library",
    model: "Current Daikin cooling families",
    category: "spec_sheet",
    url: "https://daikincomfort.com/products/heating-cooling/whole-house/air-conditioners",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Daikin whole-house air conditioner library.",
    verificationNote: "Exact values require model-specific literature and nameplate confirmation.",
  },
  {
    id: "mfg-mitsubishi-products",
    manufacturer: "Mitsubishi Electric",
    equipmentTypes: ["Mini-Split Outdoor", "Mini-Split Indoor", "Heat Pump"],
    title: "Mitsubishi Electric residential products library",
    model: "Current Mitsubishi Electric ductless families",
    category: "service_manual",
    url: "https://www.mitsubishicomfort.com/products",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Mitsubishi Electric product library for ductless and heat-pump equipment.",
    verificationNote: "Use to locate exact indoor/outdoor model documents before extracting service values.",
  },
  {
    id: "mfg-fujitsu-residential",
    manufacturer: "Fujitsu",
    equipmentTypes: ["Mini-Split Outdoor", "Mini-Split Indoor", "Heat Pump"],
    title: "Fujitsu residential products lineup",
    model: "Current Fujitsu residential families",
    category: "service_manual",
    url: "https://www.fujitsugeneral.com/us/residential/index.html",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Fujitsu residential product lineup page.",
    verificationNote: "Use to locate exact model documents before extracting service values.",
  },
  {
    id: "mfg-bosch-heat-pumps",
    manufacturer: "Bosch",
    equipmentTypes: ["Heat Pump", "Air Conditioner"],
    title: "Bosch residential heat pumps product library",
    model: "Current Bosch heat pump families",
    category: "spec_sheet",
    url: "https://www.bosch-homecomfort.com/us/en/ocs/residential/heat-pumps-1098929-c/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Bosch Home Comfort residential heat-pump product library.",
    verificationNote: "Use only as a source pointer until exact model literature is reviewed.",
  },
  {
    id: "mfg-honeywell-thermostats",
    manufacturer: "Honeywell",
    equipmentTypes: ["Thermostat"],
    title: "Resideo Honeywell Home thermostats product library",
    model: "Current Honeywell Home thermostats",
    category: "service_manual",
    url: "https://www.resideo.com/us/en/products/air/thermostats/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official Resideo/Honeywell Home thermostat product library.",
    verificationNote: "Use to locate the exact thermostat installation guide before changing configuration.",
  },
  {
    id: "mfg-ecobee-thermostats",
    manufacturer: "Ecobee",
    equipmentTypes: ["Thermostat"],
    title: "ecobee smart thermostats product library",
    model: "Current ecobee thermostats",
    category: "service_manual",
    url: "https://www.ecobee.com/en-us/smart-thermostats/",
    reviewedAt: MANUFACTURER_SOURCE_REVIEWED_AT,
    aiIndexSummary: "Official ecobee smart thermostat product library.",
    verificationNote: "Use to locate exact model support material before changing configuration.",
  },
];

function normalize(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function typeMatches(source: ManufacturerSourceRecord, equipment: Equipment) {
  const eqType = normalize(equipment.type);
  const eqCategory = normalize(equipment.category);
  return source.equipmentTypes.some((type) => {
    const normalizedType = normalize(type);
    return eqType.includes(normalizedType)
      || normalizedType.includes(eqType)
      || (eqCategory.length > 0 && (eqCategory.includes(normalizedType) || normalizedType.includes(eqCategory)));
  });
}

export function manufacturerDocsForEquipment(equipment: Equipment): ManufacturerSourceRecord[] {
  const manufacturer = normalize(equipment.manufacturer);
  return MANUFACTURER_SOURCE_LIBRARY
    .filter((source) => normalize(source.manufacturer) === manufacturer && typeMatches(source, equipment))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function manualLinksForEquipment(equipment: Equipment): Equipment["manualUrls"] {
  return manufacturerDocsForEquipment(equipment).map((source) => ({
    label: source.title,
    url: source.url,
  }));
}

export function sourceForManufacturerRecord(record: ManufacturerSourceRecord): Source {
  return {
    kind: "verification_required",
    title: record.title,
    ref: `Reviewed ${record.reviewedAt}; exact model extraction pending`,
    url: record.url,
  };
}

export function manufacturerDocItems(): DocItem[] {
  return MANUFACTURER_SOURCE_LIBRARY.map((source) => ({
    id: source.id,
    title: source.title,
    manufacturer: source.manufacturer,
    model: source.model,
    category: source.category,
    url: source.url,
    status: "Needs Review",
    uploadedAt: source.reviewedAt,
  }));
}
