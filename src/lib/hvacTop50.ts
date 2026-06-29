import appEquipmentCsv from "../../docs/HVAC_UNIT_DOCUMENT_RESEARCH.csv?raw";
import usTop50Csv from "../../docs/US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.csv?raw";
import type { DocItem, Equipment } from "./types";

export type DocumentationSourceSet = "app_equipment" | "us_top50";

export interface HvacDocumentationResearch {
  id: string;
  sourceSet: DocumentationSourceSet;
  rank?: number;
  manufacturer: string;
  equipmentModel: string;
  equipmentType: string;
  marketSegment?: string;
  documentTitle: string;
  documentType: string;
  documentUrl: string;
  secondaryDocumentUrl?: string;
  matchStatus: string;
  sourcePriority: string;
  documentationQuality: string;
  confidence: "low" | "medium" | "high" | string;
  needsReview: boolean;
  notes: string;
}

type CsvRecord = Record<string, string>;

function parseCsv(raw: string): CsvRecord[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (char === "\"" && inQuotes && next === "\"") {
      current += "\"";
      i += 1;
      continue;
    }

    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  const [headers = [], ...records] = rows;
  return records.map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])));
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalize(value?: string) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toBool(value: string) {
  return value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

function docCategory(row: HvacDocumentationResearch): DocItem["category"] {
  const text = normalize(`${row.documentTitle} ${row.documentType} ${row.equipmentType}`);
  if (text.includes("wiring")) return "wiring_diagram";
  if (text.includes("install")) return "installation_manual";
  if (text.includes("service")) return "service_manual";
  if (text.includes("bulletin")) return "service_bulletin";
  return "spec_sheet";
}

function typeMatches(rowType: string, equipment: Equipment) {
  const target = normalize(rowType);
  const eqType = normalize(`${equipment.type} ${equipment.category ?? ""} ${equipment.role ?? ""}`);

  const typePairs: [string, string[]][] = [
    ["air conditioner", ["air conditioner", "straight cool", "condenser"]],
    ["heat pump", ["heat pump"]],
    ["gas furnace", ["gas furnace", "furnace"]],
    ["air handler", ["air handler", "fan coil"]],
    ["fan coil", ["air handler", "fan coil"]],
    ["evaporator coil", ["evaporator coil", "coil"]],
    ["ductless mini split", ["mini split", "ductless"]],
    ["rtu", ["rtu", "rooftop"]],
    ["package", ["package", "packaged", "rtu"]],
    ["thermostat", ["thermostat"]],
  ];

  if (target.length === 0 || eqType.length === 0) return false;
  if (eqType.includes(target) || target.includes(eqType)) return true;

  return typePairs.some(([researchType, equipmentTerms]) => (
    target.includes(researchType) && equipmentTerms.some((term) => eqType.includes(term))
  ));
}

export const APP_EQUIPMENT_DOCUMENT_RESEARCH: HvacDocumentationResearch[] = parseCsv(appEquipmentCsv).map((row, index) => ({
  id: `app-doc-${slug(row.manufacturer)}-${slug(row.equipment_model)}`,
  sourceSet: "app_equipment",
  rank: index + 1,
  manufacturer: row.manufacturer,
  equipmentModel: row.equipment_model,
  equipmentType: row.equipment_type,
  documentTitle: row.document_title,
  documentType: row.document_type,
  documentUrl: row.document_url,
  secondaryDocumentUrl: row.canonical_url && row.canonical_url !== row.document_url ? row.canonical_url : undefined,
  matchStatus: row.match_status,
  sourcePriority: row.source_priority,
  documentationQuality: row.document_type,
  confidence: row.confidence,
  needsReview: toBool(row.needs_review),
  notes: row.notes,
}));

export const US_HVAC_TOP_50_DOCUMENTATION_RESEARCH: HvacDocumentationResearch[] = parseCsv(usTop50Csv).map((row) => ({
  id: `top50-doc-${String(row.rank).padStart(2, "0")}`,
  sourceSet: "us_top50",
  rank: Number(row.rank),
  manufacturer: row.manufacturer,
  equipmentModel: row.unit_family,
  equipmentType: row.equipment_type,
  marketSegment: row.market_segment,
  documentTitle: row.primary_document_title,
  documentType: row.primary_document_type,
  documentUrl: row.primary_document_url,
  secondaryDocumentUrl: row.secondary_document_url || undefined,
  matchStatus: row.match_status,
  sourcePriority: row.source_priority,
  documentationQuality: row.documentation_quality,
  confidence: row.confidence,
  needsReview: row.match_status !== "verified_exact_match",
  notes: row.notes,
}));

export const HVAC_DOCUMENTATION_RESEARCH = [
  ...APP_EQUIPMENT_DOCUMENT_RESEARCH,
  ...US_HVAC_TOP_50_DOCUMENTATION_RESEARCH,
];

export function documentationQualityLabel(row: HvacDocumentationResearch) {
  if (row.documentType === "official_pdf" || row.documentationQuality === "direct_family_pdf") return "Official PDF";
  if (row.documentType === "official_product_page" || row.documentationQuality === "official_family_page") return "Official family page";
  if (row.documentType === "official_document_portal") return "Official document portal";
  if (row.documentType === "official_brand_site") return "Official brand site";
  if (row.documentType === "product_spec_pdf") return "Official spec PDF";
  return "Official product library";
}

export function documentationStatusLabel(row: HvacDocumentationResearch) {
  if (row.matchStatus === "verified_exact_match") return "Exact";
  if (row.matchStatus === "best_effort_demo_match") return "Demo match";
  if (row.matchStatus === "likely_model_family_match") return "Family match";
  if (row.matchStatus === "manufacturer_generic") return "Generic";
  return "Needs review";
}

export function documentationResearchForEquipment(equipment: Equipment) {
  const manufacturer = normalize(equipment.manufacturer);
  const exactModel = normalize(equipment.model);

  const appRows = APP_EQUIPMENT_DOCUMENT_RESEARCH.filter((row) => (
    normalize(row.manufacturer) === manufacturer && normalize(row.equipmentModel) === exactModel
  ));

  const top50Rows = US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.filter((row) => (
    normalize(row.manufacturer) === manufacturer && typeMatches(row.equipmentType, equipment)
  )).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  return [...appRows, ...top50Rows];
}

export function bestDocumentationForEquipment(equipment: Equipment) {
  return documentationResearchForEquipment(equipment)[0];
}

export function top50DocItems(): DocItem[] {
  return US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.map((row) => ({
    id: row.id,
    title: `${row.manufacturer} ${row.equipmentModel}`,
    manufacturer: row.manufacturer,
    model: row.equipmentModel,
    category: docCategory(row),
    url: row.documentUrl,
    status: "Needs Review",
    uploadedAt: "2026-06-29",
  }));
}

export function top50ManualLinksForEquipment(equipment: Equipment): Equipment["manualUrls"] {
  return documentationResearchForEquipment(equipment)
    .filter((row) => row.sourceSet === "us_top50")
    .slice(0, 3)
    .map((row) => ({
      label: `${documentationQualityLabel(row)}: ${row.manufacturer} ${row.equipmentModel}`,
      url: row.documentUrl,
    }));
}

export function top50ResearchStats() {
  const officialPdfCount = US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.filter((row) => documentationQualityLabel(row).includes("PDF")).length;
  const familyPageCount = US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.filter((row) => row.documentType === "official_product_page").length;
  const genericCount = US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.filter((row) => row.matchStatus === "manufacturer_generic").length;

  return {
    total: US_HVAC_TOP_50_DOCUMENTATION_RESEARCH.length,
    officialPdfCount,
    familyPageCount,
    genericCount,
  };
}
