export type HvacCompanyWebsiteReview = {
  company: string;
  website: string;
  marketRole: string;
  visibleSystems: string[];
  productImplication: string;
  notes: string;
};

export type HvacFieldServicePlatformReview = {
  platform: string;
  website: string;
  positionedFor: string;
  publicCapabilities: string[];
  fieldCopilotImplication: string;
};

export type HvacMarketSystemPriority = {
  id: string;
  title: string;
  description: string;
  fieldCopilotAdjustment: string;
};

export const HVAC_COMPANY_WEBSITE_REVIEW: HvacCompanyWebsiteReview[] = [
  {
    company: "One Hour Heating & Air Conditioning",
    website: "https://www.onehourheatandair.com/",
    marketRole: "National HVAC franchise network",
    visibleSystems: [
      "Location-routed national website",
      "Schedule appointment call to action",
      "Emergency repair positioning",
      "Financing and membership/service-plan messaging",
      "Reviews and trust signals",
    ],
    productImplication: "Owner workflows should preserve the original lead source, urgency, and service-plan context from website intake.",
    notes: "Public site review only; internal dispatch software is not assumed.",
  },
  {
    company: "Aire Serv",
    website: "https://www.aireserv.com/",
    marketRole: "Neighborly HVAC franchise brand",
    visibleSystems: [
      "Online scheduling",
      "Local franchise routing",
      "Residential and commercial service pages",
      "Maintenance plan messaging",
      "Coupons and customer education",
    ],
    productImplication: "Demo owner views should make customer segment, appointment source, and plan eligibility easy to scan.",
    notes: "Public site review only; franchise systems may vary by local operator.",
  },
  {
    company: "Service Experts",
    website: "https://www.serviceexperts.com/",
    marketRole: "Large multi-location HVAC service company",
    visibleSystems: [
      "Schedule service flow",
      "Membership/Advantage style programs",
      "Financing offers",
      "Replacement and repair funnels",
      "Educational content and service areas",
    ],
    productImplication: "Approval and report pages should anticipate financing, maintenance plan, and replacement-option handoffs.",
    notes: "Public customer-facing systems are visible; private operational stack is not verified.",
  },
  {
    company: "ARS/Rescue Rooter",
    website: "https://www.ars.com/",
    marketRole: "National HVAC and plumbing service provider",
    visibleSystems: [
      "Schedule service call to action",
      "Emergency service messaging",
      "Financing and coupons",
      "Multiple trade categories",
      "Local market pages",
    ],
    productImplication: "Field Copilot should keep job type, trade, and promotional/financing context separate from technical diagnosis.",
    notes: "Public site review only.",
  },
  {
    company: "Horizon Services",
    website: "https://www.horizonservices.com/",
    marketRole: "Regional HVAC, plumbing, and electrical provider",
    visibleSystems: [
      "Book online and call-now CTAs",
      "Service-area landing pages",
      "Coupons and specials",
      "Financing messaging",
      "Reviews and guarantees",
    ],
    productImplication: "Owner dashboards should treat marketing source, service area, and customer promise as operational context.",
    notes: "Public site review only.",
  },
  {
    company: "Goettl Air Conditioning & Plumbing",
    website: "https://www.goettl.com/",
    marketRole: "Multi-market HVAC and plumbing provider",
    visibleSystems: [
      "Schedule service funnel",
      "Regional market routing",
      "Promotional offers",
      "Membership/maintenance messaging",
      "Brand-heavy trust positioning",
    ],
    productImplication: "The demo should support technician notes that flow into customer-facing explanations without losing brand voice.",
    notes: "Public site review only.",
  },
];

export const HVAC_FIELD_SERVICE_PLATFORM_REVIEW: HvacFieldServicePlatformReview[] = [
  {
    platform: "ServiceTitan",
    website: "https://www.servicetitan.com/industries/hvac-software",
    positionedFor: "Residential and commercial HVAC contractors",
    publicCapabilities: [
      "Call booking and CRM",
      "Scheduling and dispatch",
      "Mobile field workflows",
      "Customer communication",
      "Estimates, invoices, payments, and reporting",
      "Inventory and pricebook workflows",
    ],
    fieldCopilotImplication: "Do not rebuild dispatch; prepare clean handoff points for job, customer, equipment, pricebook, and report records.",
  },
  {
    platform: "Housecall Pro",
    website: "https://www.housecallpro.com/hvac-software/",
    positionedFor: "Home-service companies including HVAC",
    publicCapabilities: [
      "Online booking",
      "Scheduling and dispatch",
      "Customer notifications",
      "Estimates, invoices, and payments",
      "Review management and marketing tools",
      "Mobile app workflows",
    ],
    fieldCopilotImplication: "The demo should distinguish review capture, customer communication, and technical documentation as separate records.",
  },
  {
    platform: "Jobber",
    website: "https://getjobber.com/",
    positionedFor: "Small and mid-size field-service businesses",
    publicCapabilities: [
      "Requests and quotes",
      "Scheduling",
      "Invoicing and payments",
      "Client communication",
      "Customer portal/client hub positioning",
    ],
    fieldCopilotImplication: "Future integrations should support customer-facing status and document sharing without exposing technician-only notes.",
  },
  {
    platform: "FieldEdge",
    website: "https://www.fieldedge.com/",
    positionedFor: "HVAC, plumbing, and electrical contractors",
    publicCapabilities: [
      "Dispatch board positioning",
      "Service agreements",
      "Customer history",
      "Mobile field service workflows",
      "Invoices and business reporting",
    ],
    fieldCopilotImplication: "Service agreements and equipment history should become first-class context before production launch.",
  },
];

export const HVAC_MARKET_SYSTEM_PRIORITIES: HvacMarketSystemPriority[] = [
  {
    id: "online-booking",
    title: "Online booking and call intake",
    description: "Modern HVAC websites push visitors toward schedule-now, emergency-call, and local-market routing paths.",
    fieldCopilotAdjustment: "Capture lead source, urgency, contact preference, and service-area context on jobs.",
  },
  {
    id: "membership-financing",
    title: "Memberships, maintenance plans, and financing",
    description: "Many companies sell recurring plans, replacement programs, promotions, and financing alongside repair work.",
    fieldCopilotAdjustment: "Keep plan eligibility and financing prompts visible to owners without mixing them into technical diagnosis.",
  },
  {
    id: "customer-communication",
    title: "Customer communication trail",
    description: "SMS, email, review requests, arrival updates, and approval messages are core to the public customer experience.",
    fieldCopilotAdjustment: "Model a separate communication timeline before connecting any live messaging provider.",
  },
  {
    id: "reviews-reputation",
    title: "Reviews and reputation",
    description: "Public reviews, guarantees, and proof points are prominent across contractor websites.",
    fieldCopilotAdjustment: "Service reports should produce customer-safe summaries that can support review requests after completion.",
  },
  {
    id: "equipment-documents",
    title: "Equipment documents and source trust",
    description: "Technical quality depends on exact manufacturer literature, not generic marketing pages.",
    fieldCopilotAdjustment: "Continue prioritizing model-specific documents and show source confidence before AI-assisted answers.",
  },
  {
    id: "integration-boundaries",
    title: "Integration boundaries",
    description: "Contractors often already use dispatch, CRM, payment, review, and website tools.",
    fieldCopilotAdjustment: "Position Field Copilot as a technician intelligence and documentation layer that can integrate later.",
  },
];

export const HVAC_MARKET_REVIEW_DATE = "2026-06-30";
