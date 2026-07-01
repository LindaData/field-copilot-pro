export type AgentTier = "ceo" | "executive" | "specialist";

export type AgentMessageType = "intake" | "delegate" | "answer" | "decision" | "safety-gate";

export interface AgentDefinition {
  id: string;
  name: string;
  tier: AgentTier;
  reportsTo?: string;
  talksToCeo: boolean;
  mission: string;
  owns: string[];
  delegatesTo: string[];
  escalationTriggers: string[];
  defaultOutput: string;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: AgentMessageType;
  subject: string;
  body: string;
  requestedOutput?: string;
}

export interface AgentWorkPacket {
  ownerExecutive: string;
  delegatedAgents: string[];
  goal: string;
  acceptanceCriteria: string[];
  safetyLimits: string[];
}

export interface AgentConversation {
  selectedExecutives: string[];
  messages: AgentMessage[];
  workPackets: AgentWorkPacket[];
  ceoBrief: string[];
}

export const CEO_ID = "ceo";

export const LINDADATA_AGENTS: AgentDefinition[] = [
  {
    id: CEO_ID,
    name: "CEO / Human Owner",
    tier: "ceo",
    talksToCeo: false,
    mission: "Set priorities, approve direction, and give final product judgment.",
    owns: ["priority", "approval", "business direction"],
    delegatesTo: ["chief-of-staff", "cto", "cpo", "cdo", "cfo", "ciso", "qa-release-chief"],
    escalationTriggers: ["priority conflict", "major cost", "production risk"],
    defaultOutput: "final decision",
  },
  {
    id: "chief-of-staff",
    name: "Chief of Staff / COO",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Turn messy input into ordered priorities and route work to the right executives.",
    owns: ["intake", "triage", "priority", "status", "agent routing"],
    delegatesTo: ["github-codex-operator", "test-runner"],
    escalationTriggers: ["unclear priority", "blocked work", "cross-team conflict"],
    defaultOutput: "urgent / later / ignore list",
  },
  {
    id: "cto",
    name: "CTO",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Own architecture, implementation strategy, repo hygiene, and Codex-ready build packets.",
    owns: ["architecture", "frontend", "backend", "GitHub", "Codex", "technical implementation"],
    delegatesTo: ["frontend-builder", "backend-api-builder", "github-codex-operator"],
    escalationTriggers: ["missing secrets", "architecture conflict", "deploy risk", "broken CI"],
    defaultOutput: "build packet with scope, files, tests, and acceptance criteria",
  },
  {
    id: "cpo",
    name: "CPO / UX Chief",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Own user experience, mobile-first demo quality, page flow, copy, and review-layer feedback.",
    owns: ["UX", "UI", "mobile", "review layer", "copy", "demo flow"],
    delegatesTo: ["ui-review-agent", "copy-seo-agent", "frontend-builder"],
    escalationTriggers: ["button does not work", "page flow confusion", "mobile friction"],
    defaultOutput: "page-by-page UX fixes",
  },
  {
    id: "cdo",
    name: "Chief Data Officer",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Own data sources, ingestion plans, synthetic data, analytics readiness, and AI/RAG knowledge structure.",
    owns: ["data", "scraping", "RAG", "analytics", "synthetic data", "metadata"],
    delegatesTo: ["data-engineering-agent", "rag-ai-agent", "synthetic-demo-data-agent"],
    escalationTriggers: ["limited data", "bad source quality", "unknown equipment docs", "modeling risk"],
    defaultOutput: "data plan with risks and next ingestion steps",
  },
  {
    id: "cfo",
    name: "CFO",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Own pricing, cost control, paid-tool tradeoffs, unit economics, and business viability.",
    owns: ["pricing", "cost", "runway", "subscriptions", "tool spend", "unit economics"],
    delegatesTo: [],
    escalationTriggers: ["new paid tool", "cloud spend", "pricing decision", "business model change"],
    defaultOutput: "cost/risk summary",
  },
  {
    id: "ciso",
    name: "CISO / Safety Chief",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Protect secrets, privacy, auth boundaries, safe deployment, and regulated-risk workflows.",
    owns: ["secrets", "privacy", "auth", "safety", "compliance", "security review"],
    delegatesTo: ["security-scanner"],
    escalationTriggers: ["token exposure", "secret in frontend", "private data", "unsafe automation"],
    defaultOutput: "safety gate with blocked actions and safe alternative",
  },
  {
    id: "qa-release-chief",
    name: "QA / Release Chief",
    tier: "executive",
    reportsTo: CEO_ID,
    talksToCeo: true,
    mission: "Own tests, CI, regression checks, release readiness, and PR review gates.",
    owns: ["tests", "CI", "release", "QA", "regression", "PR review"],
    delegatesTo: ["test-runner", "ui-review-agent", "security-scanner"],
    escalationTriggers: ["failing build", "untested path", "broken route", "deploy gate"],
    defaultOutput: "test plan and release decision",
  },
  {
    id: "frontend-builder",
    name: "Frontend Builder",
    tier: "specialist",
    reportsTo: "cto",
    talksToCeo: false,
    mission: "Build React/Vite UI, routing, components, and mobile shell changes.",
    owns: ["React", "Vite", "components", "routes", "mobile shell"],
    delegatesTo: [],
    escalationTriggers: ["unclear component owner", "visual regression"],
    defaultOutput: "frontend implementation notes",
  },
  {
    id: "backend-api-builder",
    name: "Backend/API Builder",
    tier: "specialist",
    reportsTo: "cto",
    talksToCeo: false,
    mission: "Build endpoints, webhooks, Cloudflare Workers, and persistence paths.",
    owns: ["API", "webhook", "worker", "persistence", "integration"],
    delegatesTo: [],
    escalationTriggers: ["secret needed", "missing endpoint", "storage ambiguity"],
    defaultOutput: "backend implementation notes",
  },
  {
    id: "github-codex-operator",
    name: "GitHub/Codex Operator",
    tier: "specialist",
    reportsTo: "cto",
    talksToCeo: false,
    mission: "Convert executive decisions into issues, branches, PRs, and Codex-ready prompts.",
    owns: ["GitHub", "branch", "issue", "PR", "Codex prompt"],
    delegatesTo: [],
    escalationTriggers: ["missing repo", "merge conflict", "failed action"],
    defaultOutput: "Codex-ready work packet",
  },
  {
    id: "ui-review-agent",
    name: "UI Review Agent",
    tier: "specialist",
    reportsTo: "cpo",
    talksToCeo: false,
    mission: "Walk pages like a user, identify broken buttons, and capture mobile-first review notes.",
    owns: ["page review", "button behavior", "mobile usability", "feedback capture"],
    delegatesTo: [],
    escalationTriggers: ["dead button", "missing feedback path", "confusing flow"],
    defaultOutput: "UX defect list",
  },
  {
    id: "copy-seo-agent",
    name: "Copy/SEO Agent",
    tier: "specialist",
    reportsTo: "cpo",
    talksToCeo: false,
    mission: "Make labels, page copy, SEO structure, and product language clear and legally distinct.",
    owns: ["copy", "SEO", "labels", "positioning", "plain English"],
    delegatesTo: [],
    escalationTriggers: ["brand confusion", "unclear CTA", "legal distinctness risk"],
    defaultOutput: "copy and SEO recommendations",
  },
  {
    id: "data-engineering-agent",
    name: "Data Engineering Agent",
    tier: "specialist",
    reportsTo: "cdo",
    talksToCeo: false,
    mission: "Find, ingest, and structure useful data sources with metadata and source quality notes.",
    owns: ["source discovery", "ingestion", "metadata", "data contracts", "parquet"],
    delegatesTo: [],
    escalationTriggers: ["source unavailable", "schema mismatch", "licensing concern"],
    defaultOutput: "data ingestion plan",
  },
  {
    id: "rag-ai-agent",
    name: "RAG/AI Agent",
    tier: "specialist",
    reportsTo: "cdo",
    talksToCeo: false,
    mission: "Turn equipment docs and structured data into retrievable AI knowledge for the copilot layer.",
    owns: ["RAG", "LLM", "document chunks", "retrieval", "AI behavior"],
    delegatesTo: [],
    escalationTriggers: ["hallucination risk", "missing source", "unsafe answer"],
    defaultOutput: "AI knowledge design",
  },
  {
    id: "synthetic-demo-data-agent",
    name: "Synthetic Demo Data Agent",
    tier: "specialist",
    reportsTo: "cdo",
    talksToCeo: false,
    mission: "Create realistic demo/local data when production data is limited or unavailable.",
    owns: ["seed data", "mock data", "demo realism", "local state"],
    delegatesTo: [],
    escalationTriggers: ["unrealistic demo", "missing edge case", "data leakage"],
    defaultOutput: "demo data update plan",
  },
  {
    id: "security-scanner",
    name: "Security Scanner",
    tier: "specialist",
    reportsTo: "ciso",
    talksToCeo: false,
    mission: "Scan changes for secrets, unsafe frontend exposure, auth gaps, and risky automation.",
    owns: ["secret scan", "auth scan", "privacy scan", "safe automation"],
    delegatesTo: [],
    escalationTriggers: ["secret detected", "unsafe deploy", "private data leak"],
    defaultOutput: "security findings",
  },
  {
    id: "test-runner",
    name: "Test Runner",
    tier: "specialist",
    reportsTo: "qa-release-chief",
    talksToCeo: false,
    mission: "Run lint, unit tests, smoke tests, and release checks before a PR is considered ready.",
    owns: ["lint", "unit test", "smoke test", "regression", "CI"],
    delegatesTo: [],
    escalationTriggers: ["failed test", "missing test", "flaky path"],
    defaultOutput: "test results and release gate",
  },
];

export function getAgent(agentId: string) {
  return LINDADATA_AGENTS.find((agent) => agent.id === agentId);
}

export function getDirectReports(agentId: string) {
  return LINDADATA_AGENTS.filter((agent) => agent.reportsTo === agentId);
}

export function getCeoFacingAgents() {
  return LINDADATA_AGENTS.filter((agent) => agent.talksToCeo);
}

export function routeExecutiveForRequest(rawRequest: string) {
  const request = rawRequest.toLowerCase();
  const routed = new Set<string>(["chief-of-staff"]);

  if (/(github|codex|repo|branch|pr|pull request|merge|deploy|endpoint|worker|api|build|code)/.test(request)) {
    routed.add("cto");
    routed.add("qa-release-chief");
  }

  if (/(review layer|ux|ui|button|mobile|page|demo|site|website|feedback|copy|seo)/.test(request)) {
    routed.add("cpo");
    routed.add("qa-release-chief");
  }

  if (/(data|scrape|model|analytics|parquet|metadata|rag|ai|llm|equipment|manual|documentation|limited data)/.test(request)) {
    routed.add("cdo");
  }

  if (/(secret|token|key|auth|privacy|security|safe|safety|expose|credential)/.test(request)) {
    routed.add("ciso");
  }

  if (/(cost|price|pricing|paid|subscription|budget|unit economics|revenue)/.test(request)) {
    routed.add("cfo");
  }

  return Array.from(routed);
}

export function createAgentConversation(rawRequest: string): AgentConversation {
  const selectedExecutives = routeExecutiveForRequest(rawRequest);
  const messages: AgentMessage[] = [];
  const workPackets: AgentWorkPacket[] = [];
  let messageNumber = 1;

  const addMessage = (message: Omit<AgentMessage, "id">) => {
    messages.push({ id: `msg-${messageNumber++}`, ...message });
  };

  selectedExecutives.forEach((executiveId) => {
    const executive = getAgent(executiveId);
    if (!executive) return;

    addMessage({
      from: CEO_ID,
      to: executive.id,
      type: "intake",
      subject: "CEO request intake",
      body: rawRequest,
      requestedOutput: executive.defaultOutput,
    });

    executive.delegatesTo.forEach((specialistId) => {
      const specialist = getAgent(specialistId);
      if (!specialist) return;

      addMessage({
        from: executive.id,
        to: specialist.id,
        type: "delegate",
        subject: `${executive.name} delegation`,
        body: `Review the CEO request through your lane: ${specialist.mission}`,
        requestedOutput: specialist.defaultOutput,
      });

      addMessage({
        from: specialist.id,
        to: executive.id,
        type: "answer",
        subject: `${specialist.name} response`,
        body: `Return ${specialist.defaultOutput}; escalate on ${specialist.escalationTriggers.join(", ")}.`,
        requestedOutput: executive.defaultOutput,
      });
    });

    const safetyLimits = [
      "Do not expose secrets, tokens, review keys, or API keys.",
      "Prefer reviewable branches and PRs over direct main-branch changes.",
      "Keep CEO-facing output short and decision-ready.",
    ];

    if (executive.id === "ciso") {
      safetyLimits.unshift("Block work that would leak private data or credentials.");
    }

    workPackets.push({
      ownerExecutive: executive.id,
      delegatedAgents: executive.delegatesTo,
      goal: executive.mission,
      acceptanceCriteria: [
        `Produces ${executive.defaultOutput}.`,
        "Names owner, scope, out-of-scope, tests, and review gate when implementation is needed.",
        "Routes specialist findings back through the executive, not directly to the CEO.",
      ],
      safetyLimits,
    });

    addMessage({
      from: executive.id,
      to: CEO_ID,
      type: executive.id === "ciso" ? "safety-gate" : "decision",
      subject: `${executive.name} CEO brief`,
      body: `${executive.name} consolidated specialist input and is ready to return ${executive.defaultOutput}.`,
      requestedOutput: "CEO decision",
    });
  });

  return {
    selectedExecutives,
    messages,
    workPackets,
    ceoBrief: workPackets.map((packet) => `${packet.ownerExecutive}: ${packet.goal}`),
  };
}
