/** Common HVAC system configurations and the roles they require. */
export type SystemConfiguration =
  | "Central Split AC + Gas Furnace"
  | "Split Heat Pump + Air Handler"
  | "Straight-Cool Split + Air Handler"
  | "Dual-Fuel"
  | "Single-Zone Mini-Split"
  | "Multi-Zone Mini-Split"
  | "Packaged Gas/Electric"
  | "Packaged Heat Pump"
  | "Light-Commercial RTU";

export type EquipmentRole =
  | "Outdoor" | "Indoor" | "Furnace" | "Air Handler" | "Coil"
  | "Thermostat" | "Accessory" | "Packaged"
  | "Mini-Split Indoor" | "Mini-Split Outdoor";

export type EquipmentCategory =
  | "Air Conditioner" | "Heat Pump" | "Gas Furnace" | "Air Handler"
  | "Evaporator Coil" | "Mini-Split Outdoor" | "Mini-Split Indoor"
  | "Package Gas/Electric" | "Package Heat Pump" | "RTU"
  | "Thermostat" | "Dehumidifier" | "Humidifier" | "Media Air Cleaner"
  | "UV Accessory" | "ERV/HRV" | "Condensate Pump" | "Zoning Panel";

export type FuelType = "Electric" | "Natural Gas" | "LP" | "Dual-Fuel";
export type ServiceClass = "Residential" | "Light Commercial";

export interface SystemTemplate {
  configuration: SystemConfiguration;
  serviceClass: ServiceClass;
  fuelType: FuelType;
  members: { role: EquipmentRole; category: EquipmentCategory }[];
  commonComplaints: string[];
}

export const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    configuration: "Central Split AC + Gas Furnace",
    serviceClass: "Residential", fuelType: "Natural Gas",
    members: [
      { role: "Outdoor", category: "Air Conditioner" },
      { role: "Furnace", category: "Gas Furnace" },
      { role: "Coil", category: "Evaporator Coil" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "No heat", "Weak airflow", "Short cycling",
      "Frozen evaporator coil", "Furnace ignition failure",
      "Flame-sensing issue", "Thermostat complaint", "Condensate leak", "Maintenance visit",
    ],
  },
  {
    configuration: "Split Heat Pump + Air Handler",
    serviceClass: "Residential", fuelType: "Electric",
    members: [
      { role: "Outdoor", category: "Heat Pump" },
      { role: "Air Handler", category: "Air Handler" },
      { role: "Coil", category: "Evaporator Coil" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "Insufficient heating", "Auxiliary heat concern",
      "Defrost concern", "Outdoor unit not operating", "Blower issue",
      "High electrical use", "Thermostat or control issue", "Maintenance visit",
    ],
  },
  {
    configuration: "Straight-Cool Split + Air Handler",
    serviceClass: "Residential", fuelType: "Electric",
    members: [
      { role: "Outdoor", category: "Air Conditioner" },
      { role: "Air Handler", category: "Air Handler" },
      { role: "Coil", category: "Evaporator Coil" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "Water leak", "Blower not operating", "Frozen coil",
      "Weak airflow", "Electrical issue", "Maintenance visit",
    ],
  },
  {
    configuration: "Dual-Fuel",
    serviceClass: "Residential", fuelType: "Dual-Fuel",
    members: [
      { role: "Outdoor", category: "Heat Pump" },
      { role: "Furnace", category: "Gas Furnace" },
      { role: "Coil", category: "Evaporator Coil" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "Incorrect fuel changeover", "Heating performance concern",
      "Outdoor-temperature control issue", "Furnace not taking over",
      "Thermostat configuration issue", "General maintenance",
    ],
  },
  {
    configuration: "Single-Zone Mini-Split",
    serviceClass: "Residential", fuelType: "Electric",
    members: [
      { role: "Mini-Split Outdoor", category: "Mini-Split Outdoor" },
      { role: "Mini-Split Indoor", category: "Mini-Split Indoor" },
    ],
    commonComplaints: [
      "Not cooling", "Not heating", "Communication error", "Water leak",
      "Dirty indoor coil", "Dirty filter", "Outdoor unit not operating",
      "Remote-control issue", "Maintenance visit",
    ],
  },
  {
    configuration: "Multi-Zone Mini-Split",
    serviceClass: "Residential", fuelType: "Electric",
    members: [
      { role: "Mini-Split Outdoor", category: "Mini-Split Outdoor" },
      { role: "Mini-Split Indoor", category: "Mini-Split Indoor" },
      { role: "Mini-Split Indoor", category: "Mini-Split Indoor" },
      { role: "Mini-Split Indoor", category: "Mini-Split Indoor" },
    ],
    commonComplaints: [
      "One zone not working", "Multiple-zone communication issue",
      "Incorrect zone association", "Condensate issue", "Comfort imbalance", "Maintenance visit",
    ],
  },
  {
    configuration: "Packaged Gas/Electric",
    serviceClass: "Residential", fuelType: "Natural Gas",
    members: [
      { role: "Packaged", category: "Package Gas/Electric" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "No heat", "Blower issue", "Ignition issue",
      "Drain issue", "Belt or airflow issue", "Maintenance visit",
    ],
  },
  {
    configuration: "Packaged Heat Pump",
    serviceClass: "Residential", fuelType: "Electric",
    members: [
      { role: "Packaged", category: "Package Heat Pump" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "Weak heating", "Auxiliary-heat issue",
      "Defrost concern", "Blower problem", "Maintenance visit",
    ],
  },
  {
    configuration: "Light-Commercial RTU",
    serviceClass: "Light Commercial", fuelType: "Natural Gas",
    members: [
      { role: "Packaged", category: "RTU" },
      { role: "Thermostat", category: "Thermostat" },
    ],
    commonComplaints: [
      "No cooling", "No heat", "Poor airflow", "Belt concern",
      "Filter restriction", "Economizer concern",
      "Occupied/unoccupied scheduling complaint", "Preventive maintenance",
    ],
  },
];

export const ACCESSORY_OPTIONS: { category: EquipmentCategory; label: string }[] = [
  { category: "Dehumidifier", label: "Whole-home dehumidifier" },
  { category: "Humidifier", label: "Whole-home humidifier" },
  { category: "Media Air Cleaner", label: "Media air cleaner" },
  { category: "UV Accessory", label: "UV accessory" },
  { category: "ERV/HRV", label: "ERV / HRV" },
  { category: "Condensate Pump", label: "Condensate pump" },
  { category: "Zoning Panel", label: "Zoning panel" },
];
