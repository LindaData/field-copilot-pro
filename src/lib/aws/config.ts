// AWS config — ONLY non-secret values live here. AWS access keys, database
// passwords, and Cognito client secrets MUST be stored in AWS Secrets Manager
// and referenced by your EC2 IAM role. The wizard refuses any value that looks
// like a long-lived access key.

export type AwsEnvironment = "demo" | "test" | "production";
export type CardId = "account" | "s3" | "db" | "ec2" | "cognito";
export type CardStatus =
  | "not-started"
  | "info-needed"
  | "testing"
  | "connected"
  | "failed"
  | "action-required";

export interface AwsConfig {
  region: string;
  s3Bucket: string;
  ec2BaseUrl: string;
  cognito: {
    userPoolId: string;
    clientId: string;
    domain: string;
  };
  environment: AwsEnvironment;
  companyId: string;
  cardStatus: Record<CardId, CardStatus>;
  checklist: Record<number, boolean>; // 1..13
  lastTest: Partial<Record<CardId | "full", { ok: boolean; at: string; message: string }>>;
  updatedAt: string;
}

export const EMPTY_CONFIG: AwsConfig = {
  region: "",
  s3Bucket: "",
  ec2BaseUrl: "",
  cognito: { userPoolId: "", clientId: "", domain: "" },
  environment: "demo",
  companyId: "",
  cardStatus: { account: "not-started", s3: "not-started", db: "not-started", ec2: "not-started", cognito: "not-started" },
  checklist: {},
  lastTest: {},
  updatedAt: new Date(0).toISOString(),
};

const STORAGE_KEY = "caloosa.aws.config.v1";

export function loadConfig(): AwsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_CONFIG, ...parsed, cardStatus: { ...EMPTY_CONFIG.cardStatus, ...(parsed.cardStatus || {}) } };
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

export function saveConfig(cfg: AwsConfig) {
  const next = { ...cfg, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

// ---------- validators ----------

// AWS access keys begin with AKIA / ASIA / AGPA / AROA etc. and are 20 chars.
// Secret access keys are 40 chars of base64. We REJECT both anywhere a
// non-secret field is set, no matter which field.
const ACCESS_KEY_RX = /\b(AKIA|ASIA|AGPA|AROA|AIDA|ANPA|ANVA|AIPA)[A-Z0-9]{16}\b/;
const SECRET_KEY_RX = /\b[A-Za-z0-9/+=]{40}\b/;
const PASSWORD_HINT_RX = /(password|secret|pwd|api[_-]?key)\s*[:=]/i;

export function looksLikeSecret(value: string): string | null {
  if (!value) return null;
  if (ACCESS_KEY_RX.test(value)) return "This looks like an AWS access key. Access keys belong in AWS Secrets Manager, not in this screen.";
  if (SECRET_KEY_RX.test(value) && value.length >= 40) return "This looks like a long-lived secret. Store it in AWS Secrets Manager and reference it from your EC2 IAM role.";
  if (PASSWORD_HINT_RX.test(value)) return "Passwords belong in AWS Secrets Manager, not in this screen.";
  return null;
}

export interface FieldValidation { ok: boolean; message?: string }

export function validateRegion(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. Example: us-east-1" };
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(v)) return { ok: false, message: "Doesn't look like an AWS region (e.g. us-east-1, eu-west-2)." };
  return { ok: true };
}
export function validateBucket(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. The name of your private S3 bucket." };
  if (!/^[a-z0-9.\-]{3,63}$/.test(v)) return { ok: false, message: "Bucket names use lowercase letters, numbers, dots, and dashes (3–63 chars)." };
  const secret = looksLikeSecret(v); if (secret) return { ok: false, message: secret };
  return { ok: true };
}
export function validateUrl(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. The HTTPS address your AWS administrator gave you for the backend." };
  try {
    const u = new URL(v);
    if (u.protocol !== "https:") return { ok: false, message: "Must start with https:// — the app refuses plain HTTP for the backend." };
  } catch { return { ok: false, message: "Doesn't look like a valid URL." }; }
  return { ok: true };
}
export function validateCognitoPool(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. Example: us-east-1_AbCdEfGhI" };
  if (!/^[a-z]{2}-[a-z]+-\d_[A-Za-z0-9]{1,}$/.test(v)) return { ok: false, message: "Expected format: us-east-1_AbCdEfGhI" };
  return { ok: true };
}
export function validateCognitoClient(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. The Cognito App Client ID (not the secret)." };
  const secret = looksLikeSecret(v); if (secret) return { ok: false, message: secret };
  if (v.length < 10) return { ok: false, message: "App client IDs are typically 20+ characters." };
  return { ok: true };
}
export function validateCognitoDomain(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. Your Cognito hosted-UI domain." };
  if (!/^[a-z0-9.\-]+$/i.test(v)) return { ok: false, message: "Use the domain only (no https://)." };
  return { ok: true };
}
export function validateCompanyId(v: string): FieldValidation {
  if (!v) return { ok: false, message: "Required. The company ID assigned to your tenant." };
  return { ok: true };
}

export function cardStatusFromConfig(cfg: AwsConfig, id: CardId): CardStatus {
  const stored = cfg.cardStatus[id];
  if (stored === "connected" || stored === "failed" || stored === "testing") return stored;
  const need = (...fields: boolean[]) => fields.every(Boolean);
  switch (id) {
    case "account": return need(!!cfg.region, !!cfg.companyId) ? "info-needed" : "not-started";
    case "s3": return need(!!cfg.region, !!cfg.s3Bucket) ? "info-needed" : "not-started";
    case "db": return cfg.ec2BaseUrl ? "info-needed" : "not-started"; // DB is reached via EC2
    case "ec2": return cfg.ec2BaseUrl ? "info-needed" : "not-started";
    case "cognito": return need(!!cfg.cognito.userPoolId, !!cfg.cognito.clientId) ? "info-needed" : "not-started";
  }
}

export const CARD_COPY: Record<CardId, { title: string; plain: string }> = {
  account: { title: "AWS Account", plain: "Your Amazon Web Services account is where all of this runs. We only need the region your team works in." },
  s3:      { title: "S3 File Storage", plain: "S3 stores manuals, photos and reports. Keep the bucket private — the app never uses public links." },
  db:      { title: "PostgreSQL Database", plain: "PostgreSQL stores customer, equipment and job records. The database password is kept in AWS Secrets Manager, never here." },
  ec2:     { title: "EC2 Backend", plain: "EC2 securely connects the app to AWS. It checks who you are, what company you belong to, and what you're allowed to do." },
  cognito: { title: "Cognito Login", plain: "Cognito manages employee logins. You'll add and remove technicians in the AWS console." },
};

export const CARD_STATUS_LABEL: Record<CardStatus, string> = {
  "not-started": "Not Started",
  "info-needed": "Information Needed",
  "testing": "Testing",
  "connected": "Connected",
  "failed": "Connection Failed",
  "action-required": "Action Required",
};

export const CARD_STATUS_TONE: Record<CardStatus, "muted" | "warning" | "info" | "success" | "danger"> = {
  "not-started": "muted",
  "info-needed": "warning",
  "testing": "info",
  "connected": "success",
  "failed": "danger",
  "action-required": "warning",
};

export interface ChecklistStep {
  n: number;
  title: string;
  what: string;
  where: string;
  copy: string;
  dontShare: string;
}

export const CHECKLIST: ChecklistStep[] = [
  { n: 1,  title: "Create private S3 bucket",        what: "A private folder in AWS that stores manuals, photos and reports.",                       where: "AWS Console → S3 → Create bucket. Leave Block Public Access ON.",                 copy: "The bucket name you choose.",                                              dontShare: "Don't paste any AWS access keys here. We never need them." },
  { n: 2,  title: "Create PostgreSQL database",       what: "A managed database where customer, job and equipment records live.",                     where: "AWS Console → RDS → Create database → PostgreSQL.",                                copy: "Nothing here. The database password stays in AWS Secrets Manager.",        dontShare: "The database password. Ever." },
  { n: 3,  title: "Create EC2 backend",               what: "A small AWS server that runs the secure API the app talks to.",                          where: "AWS Console → EC2 → Launch instance, then deploy the backend image.",              copy: "The HTTPS URL of your backend (https://api.yourcompany.com).",             dontShare: "SSH keys, PEM files." },
  { n: 4,  title: "Create Cognito user pool",         what: "AWS's login service for your employees.",                                                where: "AWS Console → Cognito → User pools → Create user pool.",                           copy: "User Pool ID, App Client ID, and Cognito domain.",                         dontShare: "The App Client Secret if your pool uses one." },
  { n: 5,  title: "Add credentials to Secrets Manager", what: "AWS Secrets Manager safely holds passwords and keys so the app never sees them.",     where: "AWS Console → Secrets Manager → Store a new secret.",                              copy: "The secret names — never the values.",                                     dontShare: "The actual secret values." },
  { n: 6,  title: "Deploy backend",                   what: "Your AWS administrator publishes the backend so the app can reach it.",                  where: "Your team's deployment tooling (CodeDeploy, ECS, or a manual deploy).",            copy: "The deploy completion confirmation.",                                       dontShare: "Internal deploy tokens." },
  { n: 7,  title: "Enter safe connection values",     what: "Paste region, bucket name, backend URL, and Cognito IDs into the form below.",           where: "On this page, in the form to the right.",                                          copy: "Just the safe IDs above.",                                                  dontShare: "Anything that looks like a password or access key." },
  { n: 8,  title: "Test connections",                 what: "Click each test button to confirm every piece can be reached.",                          where: "On this page, in the Tests panel.",                                                copy: "The friendly result message if you need to share it.",                      dontShare: "Raw error text — share the friendly message instead." },
  { n: 9,  title: "Run test upload",                  what: "Send a tiny file through the system to prove uploads work end to end.",                  where: "On this page, click 'Test S3 upload'.",                                            copy: "The success confirmation.",                                                 dontShare: "Real customer files yet." },
  { n: 10, title: "Enable AWS for demo users",        what: "Flip the data source from Demo to AWS for a small test group.",                          where: "On this page, after every test passes.",                                           copy: "Nothing.",                                                                  dontShare: "Customer data until step 12." },
  { n: 11, title: "Migrate test records",             what: "Move a handful of test records to AWS to verify everything looks right.",                where: "Owner → Integrations → AWS → Migrate.",                                            copy: "The migration preview summary.",                                            dontShare: "Production data until step 13." },
  { n: 12, title: "Verify reports and photos",        what: "Open a job, attach a photo, and generate a customer report. Make sure both look right.", where: "Technician app and Owner dashboard.",                                              copy: "Nothing.",                                                                  dontShare: "Anything." },
  { n: 13, title: "Enable AWS for production",        what: "Switch the whole company to AWS once you and your administrator agree it's ready.",     where: "On this page, change Environment to Production.",                                  copy: "Nothing.",                                                                  dontShare: "Anything." },
];
