// Connection tests. Until the AWS S3 connector + EC2 backend are actually
// wired (later phases), these return clearly-labeled SIMULATED results. They
// never invent a success — if config is missing they say so, and they never
// pretend the EC2 backend responded when it didn't.

import type { AwsConfig, CardId } from "./config";
import { validateBucket, validateCognitoClient, validateCognitoPool, validateRegion, validateUrl } from "./config";

export interface TestOutcome {
  ok: boolean;
  message: string;
  simulated: boolean;
}

const friendly = (ok: boolean, msg: string): TestOutcome => ({ ok, message: msg, simulated: true });

export async function testEc2(cfg: AwsConfig): Promise<TestOutcome> {
  const v = validateUrl(cfg.ec2BaseUrl);
  if (!v.ok) return friendly(false, `Connection failed. ${v.message}`);
  return friendly(false, "Simulated test only. Your EC2 backend has not been deployed yet, so the app cannot reach it. Ask your AWS administrator to complete checklist steps 3 and 6, then try again.");
}

export async function testDatabase(cfg: AwsConfig): Promise<TestOutcome> {
  if (!cfg.ec2BaseUrl) return friendly(false, "Connection failed. Enter your EC2 Backend URL first — the database is only reachable through it.");
  return friendly(false, "Simulated test only. The database is reached through your EC2 backend. Once the backend is deployed, this test will verify the database connection.");
}

export async function testS3Upload(cfg: AwsConfig): Promise<TestOutcome> {
  const r = validateRegion(cfg.region); if (!r.ok) return friendly(false, `Connection failed. ${r.message}`);
  const b = validateBucket(cfg.s3Bucket); if (!b.ok) return friendly(false, `Connection failed. ${b.message}`);
  return friendly(false, "Simulated test only. Real uploads require the AWS S3 connection and backend services to be deployed. Ask your administrator to complete the storage integration, then try again.");
}

export async function testS3Download(cfg: AwsConfig): Promise<TestOutcome> {
  const r = validateRegion(cfg.region); if (!r.ok) return friendly(false, `Connection failed. ${r.message}`);
  const b = validateBucket(cfg.s3Bucket); if (!b.ok) return friendly(false, `Connection failed. ${b.message}`);
  return friendly(false, "Simulated test only. Real downloads require the AWS S3 connection and backend services to be deployed.");
}

export async function testCognito(cfg: AwsConfig): Promise<TestOutcome> {
  const p = validateCognitoPool(cfg.cognito.userPoolId); if (!p.ok) return friendly(false, `Authentication configuration is incomplete. ${p.message}`);
  const c = validateCognitoClient(cfg.cognito.clientId); if (!c.ok) return friendly(false, `Authentication configuration is incomplete. ${c.message}`);
  return friendly(true, "Authentication configuration is valid. The app will be able to redirect employees to your Cognito login page once the backend is live.");
}

export async function runFullTest(cfg: AwsConfig): Promise<Record<CardId | "full", TestOutcome>> {
  const [ec2, db, s3u, s3d, cog] = await Promise.all([
    testEc2(cfg), testDatabase(cfg), testS3Upload(cfg), testS3Download(cfg), testCognito(cfg),
  ]);
  const allOk = ec2.ok && db.ok && s3u.ok && s3d.ok && cog.ok;
  return {
    account: friendly(!!cfg.region && !!cfg.companyId, !!cfg.region && !!cfg.companyId
      ? "Account details look correct."
      : "Connection failed. Ask your administrator to check the region and company ID."),
    ec2, db, s3: s3u, cognito: cog,
    full: friendly(allOk, allOk
      ? "All connections responded successfully."
      : "One or more checks failed. Open each card for a plain-language fix."),
  } as Record<CardId | "full", TestOutcome>;
}
