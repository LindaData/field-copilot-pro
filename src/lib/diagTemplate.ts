import type { Source } from "./types";
import { goodmanPdfSource } from "./seed";

export type Risk = "Low" | "Medium" | "High";

export interface Choice { id: string; label: string; nextStepId: string; branchLabel?: string; }

export interface DiagStep {
  id: string;
  title: string;
  question: string;
  detail?: string; // technical detail
  why?: string;
  toolsNeeded?: string[];
  risk: Risk;
  hypothesis: string;
  type: "choice" | "ack-electrical" | "ack-refrigerant" | "measurement" | "info-end" | "alt-end";
  choices?: Choice[];
  measurement?: {
    label: string;
    unit: string;
    sampleValue: string;
    min?: number; max?: number;
    minNote?: string;
    source?: Source;
    observation?: boolean; // technician observation rather than manufacturer
    derivedFromInstalled?: boolean;
    nextStepId: string;
  };
  sources?: Source[];
}

export const NO_COOLING: DiagStep[] = [
  {
    id: "A",
    title: "Confirm customer complaint",
    question: "Is the thermostat calling for cooling and set below indoor temperature?",
    why: "We confirm the system is actually being told to cool before testing any hardware.",
    risk: "Low",
    type: "choice",
    hypothesis: "No cooling at customer site",
    choices: [
      { id: "yes", label: "Yes — thermostat calling for cooling", nextStepId: "B" },
      { id: "no", label: "No — thermostat issue", nextStepId: "ALT-T", branchLabel: "Thermostat / control" },
    ],
  },
  {
    id: "B",
    title: "Indoor blower & airflow",
    question: "Is the indoor blower running with normal supply airflow?",
    why: "Rules out blower / filter / duct restriction before going outside.",
    risk: "Low",
    type: "choice",
    hypothesis: "Verifying air handler side",
    choices: [
      { id: "yes", label: "Yes — blower running, airflow normal", nextStepId: "C" },
      { id: "no", label: "No — air handler issue", nextStepId: "ALT-AH", branchLabel: "Air handler" },
    ],
  },
  {
    id: "C",
    title: "Outdoor unit status",
    question: "At the outdoor unit, what do you observe?",
    why: "Distinguishes contactor / power / capacitor / compressor branches.",
    risk: "Low",
    type: "choice",
    hypothesis: "Outdoor unit not cooling",
    choices: [
      { id: "fan-only", label: "Outdoor fan runs, compressor not running", nextStepId: "D" },
      { id: "dead", label: "Outdoor unit completely dead", nextStepId: "ALT-PWR", branchLabel: "No incoming power" },
      { id: "hum-trip", label: "Compressor hums then trips", nextStepId: "D" },
    ],
  },
  {
    id: "D",
    title: "Electrical safety acknowledgment",
    question: "Confirm you are qualified to perform live electrical tests and will follow lockout/tagout and PPE.",
    detail: "Required before any voltage measurement at the disconnect, contactor, or capacitor.",
    risk: "High",
    type: "ack-electrical",
    hypothesis: "Compressor not energizing",
    sources: [{ kind: "company_sop", title: "Caloosa Cooling — Electrical Safety SOP", ref: "§2.1" }],
  },
  {
    id: "E",
    title: "Measure incoming voltage at disconnect",
    question: "Enter measured line-to-line voltage at the outdoor disconnect (load side).",
    why: "Goodman GSXN3 requires line voltage within 197–253 V.",
    toolsNeeded: ["True-RMS multimeter"],
    risk: "High",
    type: "measurement",
    hypothesis: "Verifying supply voltage",
    measurement: {
      label: "Incoming voltage", unit: "V", sampleValue: "229",
      min: 197, max: 253, minNote: "Goodman SS-GSXN3 allowed range 197 V – 253 V",
      source: goodmanPdfSource, nextStepId: "F",
    },
    sources: [goodmanPdfSource],
  },
  {
    id: "F",
    title: "24 V at contactor coil",
    question: "With thermostat calling, enter measured voltage across contactor coil (Y to C).",
    why: "Confirms the low-voltage call is reaching the contactor.",
    toolsNeeded: ["Multimeter"],
    risk: "Medium",
    type: "measurement",
    hypothesis: "Verifying 24V control signal",
    measurement: {
      label: "Contactor coil voltage", unit: "V", sampleValue: "25.1",
      min: 22, max: 28, minNote: "Typical 24 V control circuit",
      source: { kind: "technician_observation", title: "Field-measured 24V control circuit" },
      observation: true,
      nextStepId: "G",
    },
  },
  {
    id: "G",
    title: "Contactor state",
    question: "Is the contactor pulled in (closed) with line voltage on both load lugs?",
    risk: "Medium",
    type: "choice",
    hypothesis: "Voltage reaching compressor terminals",
    choices: [
      { id: "yes", label: "Yes — closed, line voltage on load side", nextStepId: "H" },
      { id: "no", label: "No — no 24 V signal / coil not pulling", nextStepId: "ALT-24V", branchLabel: "Control circuit" },
    ],
  },
  {
    id: "H",
    title: "Inspect installed dual-run capacitor (power isolated)",
    question: "With power isolated at the disconnect and capacitor safely discharged per SOP, what label rating is printed on the installed dual-run capacitor?",
    detail: "Treat the printed label as a technician observation, not a Goodman specification. Verify against installed component and unit documentation before replacement.",
    why: "Establishes the tolerance band we'll compare measured µF against.",
    toolsNeeded: ["Insulated screwdriver", "Bleeder resistor", "Multimeter w/ capacitance"],
    risk: "High",
    type: "measurement",
    hypothesis: "Capacitor suspected",
    measurement: {
      label: "Installed capacitor label", unit: "µF", sampleValue: "40/5 µF ±6%",
      observation: true,
      source: { kind: "technician_observation", title: "Technician observation — verify against installed component and unit documentation" },
      nextStepId: "I",
    },
  },
  {
    id: "I",
    title: "Measure capacitance",
    question: "Enter measured capacitance for compressor (HERM) and fan sections.",
    toolsNeeded: ["Multimeter w/ capacitance"],
    risk: "Medium",
    type: "measurement",
    hypothesis: "Capacitor tolerance test",
    measurement: {
      label: "Compressor section (HERM)", unit: "µF", sampleValue: "27.8",
      derivedFromInstalled: true,
      source: { kind: "technician_observation", title: "Measured against installed component label tolerance" },
      nextStepId: "J",
    },
  },
  {
    id: "J",
    title: "Tolerance result",
    question: "Review the tolerance math against the installed component label.",
    detail: "Label 40 µF ±6% → allowed 37.6–42.4 µF. Measured 27.8 µF on HERM side → out of observed-component tolerance. Fan section 4.9 µF (4.7–5.3) within tolerance.",
    risk: "Medium",
    type: "choice",
    hypothesis: "Installed dual-run capacitor compressor section out of label tolerance",
    choices: [{ id: "ack", label: "Acknowledge — proceed to likely cause", nextStepId: "K" }],
  },
  {
    id: "K",
    title: "Likely cause",
    question: "Installed dual-run capacitor compressor section tests below its observed label tolerance.",
    detail: "Confidence: High for this demo path. Technician must verify on site before parts replacement.",
    risk: "Medium",
    type: "choice",
    hypothesis: "Failed capacitor (compressor section)",
    choices: [{ id: "next", label: "Continue to recommended action", nextStepId: "L" }],
  },
  {
    id: "L",
    title: "Recommended action",
    question: "Verify correct replacement against installed component, unit documentation, and approved parts database. Obtain customer approval, then replace using qualified procedures and retest.",
    risk: "Medium",
    type: "choice",
    hypothesis: "Replace dual-run capacitor",
    sources: [{ kind: "company_sop", title: "Caloosa Cooling — Capacitor Replacement SOP" }],
    choices: [
      { id: "approval", label: "Open customer approval", nextStepId: "APPROVAL" },
      { id: "skip", label: "Skip approval — continue to verification", nextStepId: "M" },
    ],
  },
  {
    id: "M",
    title: "Verification after repair",
    question: "Outdoor unit starts and runs. Enter total outdoor-unit current, supply/return temperatures, and confirm stable operation.",
    risk: "Medium",
    type: "measurement",
    hypothesis: "Verifying repair",
    measurement: {
      label: "Total outdoor-unit current", unit: "A", sampleValue: "9.1",
      min: 0, max: 15, minNote: "Below MOP 15 A",
      source: goodmanPdfSource, nextStepId: "N",
    },
  },
  {
    id: "N",
    title: "Complete job",
    question: "Confirm completion. We'll generate the service report.",
    risk: "Low",
    type: "info-end",
    hypothesis: "Job complete",
  },
  // Alternate branches
  {
    id: "ALT-T",
    title: "Thermostat / control branch",
    question: "Verify thermostat power, mode, setpoint, and Y/G/C wiring. Replace batteries if applicable. Do not bypass safety devices.",
    risk: "Low",
    type: "alt-end",
    hypothesis: "Thermostat issue",
  },
  {
    id: "ALT-AH",
    title: "Air handler branch",
    question: "Check filter, blower motor, capacitor (indoor), control board call. Inspect coil for icing.",
    risk: "Medium",
    type: "alt-end",
    hypothesis: "Indoor blower / airflow issue",
  },
  {
    id: "ALT-PWR",
    title: "No incoming power",
    question: "Check service disconnect, breaker, and condition of whip/whip connections. Do not energize a damaged disconnect. Escalate electrical service issues to a licensed electrician where required.",
    risk: "High",
    type: "alt-end",
    hypothesis: "Loss of incoming power",
  },
  {
    id: "ALT-24V",
    title: "No 24 V at contactor coil",
    question: "Trace 24 V control circuit: thermostat call, low-voltage wiring, safety switches (float, high-pressure, low-pressure), and transformer. Do not bypass safety devices to force operation.",
    risk: "Medium",
    type: "alt-end",
    hypothesis: "Control / safety circuit interruption",
  },
];

export const findStep = (id: string) => NO_COOLING.find((s) => s.id === id);
