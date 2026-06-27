import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import {
  AwsConfig, CARD_COPY, CARD_STATUS_LABEL, CARD_STATUS_TONE, CHECKLIST, CardId, CardStatus,
  cardStatusFromConfig, loadConfig, saveConfig,
  validateBucket, validateCognitoClient, validateCognitoDomain, validateCognitoPool,
  validateCompanyId, validateRegion, validateUrl, looksLikeSecret,
} from "@/lib/aws/config";
import { runFullTest, testCognito, testDatabase, testEc2, testS3Download, testS3Upload, TestOutcome } from "@/lib/aws/tests";
import { AlertTriangle, CheckCircle2, Cloud, Database, KeyRound, Server, ShieldAlert, Sparkles, Upload, Download, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";

const CARD_ORDER: CardId[] = ["account", "s3", "db", "ec2", "cognito"];

const CARD_ICON: Record<CardId, typeof Cloud> = {
  account: Cloud, s3: Upload, db: Database, ec2: Server, cognito: KeyRound,
};

const TONE_CLASSES: Record<"muted" | "warning" | "info" | "success" | "danger", string> = {
  muted: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30",
  success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
  danger: "bg-destructive/15 text-destructive border border-destructive/30",
};

export default function AwsStorage() {
  const { state } = useStore();
  const [cfg, setCfg] = useState<AwsConfig>(() => loadConfig());
  const [testing, setTesting] = useState<Partial<Record<CardId | "full", boolean>>>({});
  const [results, setResults] = useState<Partial<Record<CardId | "full", TestOutcome>>>({});
  const isOwner = state.role === "guest-owner";

  const statuses = useMemo<Record<CardId, CardStatus>>(() => ({
    account: cardStatusFromConfig(cfg, "account"),
    s3: cardStatusFromConfig(cfg, "s3"),
    db: cardStatusFromConfig(cfg, "db"),
    ec2: cardStatusFromConfig(cfg, "ec2"),
    cognito: cardStatusFromConfig(cfg, "cognito"),
  }), [cfg]);

  function patch<K extends keyof AwsConfig>(key: K, value: AwsConfig[K]) {
    const next = saveConfig({ ...cfg, [key]: value });
    setCfg(next);
  }
  function patchCognito<K extends keyof AwsConfig["cognito"]>(key: K, value: AwsConfig["cognito"][K]) {
    const next = saveConfig({ ...cfg, cognito: { ...cfg.cognito, [key]: value } });
    setCfg(next);
  }
  function toggleStep(n: number) {
    const next = saveConfig({ ...cfg, checklist: { ...cfg.checklist, [n]: !cfg.checklist[n] } });
    setCfg(next);
  }

  async function runTest(id: CardId | "full") {
    setTesting((t) => ({ ...t, [id]: true }));
    try {
      let r: TestOutcome | Record<CardId | "full", TestOutcome>;
      if (id === "full") r = await runFullTest(cfg);
      else if (id === "ec2") r = await testEc2(cfg);
      else if (id === "db") r = await testDatabase(cfg);
      else if (id === "s3") r = await testS3Upload(cfg);
      else if (id === "cognito") r = await testCognito(cfg);
      else r = { ok: !!cfg.region && !!cfg.companyId, message: cfg.region && cfg.companyId ? "Account details look correct." : "Add your AWS region and company ID first.", simulated: true };

      if (id === "full") {
        const all = r as Record<CardId | "full", TestOutcome>;
        setResults(all);
        toast[all.full.ok ? "success" : "warning"](all.full.message);
      } else {
        const single = r as TestOutcome;
        setResults((prev) => ({ ...prev, [id]: single }));
        toast[single.ok ? "success" : "warning"](single.message);
      }
    } finally {
      setTesting((t) => ({ ...t, [id]: false }));
    }
  }

  async function runS3Download() {
    setTesting((t) => ({ ...t, s3: true }));
    const r = await testS3Download(cfg);
    setResults((prev) => ({ ...prev, s3: r }));
    setTesting((t) => ({ ...t, s3: false }));
    toast[r.ok ? "success" : "warning"](r.message);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">AWS Storage</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Connect this app to your company's AWS account. Follow the checklist on the right —
            you don't need to be technical. Your AWS administrator handles the technical pieces in
            the AWS Console; you just paste the safe IDs they give you.
          </p>
        </div>
        <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" /> Simulated results until AWS is linked</Badge>
      </header>

      {!isOwner && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Owner / admin only</AlertTitle>
          <AlertDescription>You're viewing this page as a technician. Connection changes are limited to owners and admins.</AlertDescription>
        </Alert>
      )}

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>This page never accepts passwords or AWS access keys</AlertTitle>
        <AlertDescription>
          Database passwords, AWS access keys, and Cognito app-client secrets belong in <strong>AWS Secrets Manager</strong>
          and are read by your EC2 server's IAM role. If you have a value that looks secret, do not paste it here —
          give it to your AWS administrator to store in Secrets Manager.
        </AlertDescription>
      </Alert>

      {/* Status cards */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {CARD_ORDER.map((id) => {
          const Icon = CARD_ICON[id];
          const status = statuses[id];
          const tone = CARD_STATUS_TONE[status];
          return (
            <Card key={id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]}`}>
                  {CARD_STATUS_LABEL[status]}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold">{CARD_COPY[id].title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{CARD_COPY[id].plain}</p>
              </div>
              {results[id] && (
                <p className={`text-xs ${results[id]!.ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {results[id]!.message}
                </p>
              )}
            </Card>
          );
        })}
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Configuration */}
        <Card className="space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">Connection details</h2>
              <p className="text-xs text-muted-foreground">Only safe, non-secret values. The app refuses anything that looks like a password or access key.</p>
            </div>
            <Badge variant="outline">Owner only</Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SafeField label="AWS Region" value={cfg.region} placeholder="us-east-1" onChange={(v) => patch("region", v)} validate={validateRegion} />
            <SafeField label="Company ID" value={cfg.companyId} placeholder="caloosa-cooling-001" onChange={(v) => patch("companyId", v)} validate={validateCompanyId} />
            <SafeField label="S3 Bucket Name" value={cfg.s3Bucket} placeholder="caloosa-files-prod" onChange={(v) => patch("s3Bucket", v)} validate={validateBucket} />
            <SafeField label="EC2 Backend URL" value={cfg.ec2BaseUrl} placeholder="https://api.yourcompany.com" onChange={(v) => patch("ec2BaseUrl", v)} validate={validateUrl} />
            <SafeField label="Cognito User Pool ID" value={cfg.cognito.userPoolId} placeholder="us-east-1_AbCdEfGhI" onChange={(v) => patchCognito("userPoolId", v)} validate={validateCognitoPool} />
            <SafeField label="Cognito App Client ID" value={cfg.cognito.clientId} placeholder="3n7…safe id" onChange={(v) => patchCognito("clientId", v)} validate={validateCognitoClient} />
            <SafeField label="Cognito Domain" value={cfg.cognito.domain} placeholder="caloosa.auth.us-east-1.amazoncognito.com" onChange={(v) => patchCognito("domain", v)} validate={validateCognitoDomain} />
            <div className="space-y-1">
              <Label className="text-xs">Deployment environment</Label>
              <Select value={cfg.environment} onValueChange={(v) => patch("environment", v as AwsConfig["environment"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo">Demo (safe to experiment)</SelectItem>
                  <SelectItem value="test">Test (small group of real employees)</SelectItem>
                  <SelectItem value="production">Production (your whole company)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Production will only switch on after every test passes.</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold">Tests</h3>
            <p className="text-xs text-muted-foreground">Each button checks one piece. None of these change customer data.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
              <Button variant="outline" size="sm" disabled={!!testing.ec2} onClick={() => runTest("ec2")}><Server className="mr-2 h-3.5 w-3.5" />Test EC2 API</Button>
              <Button variant="outline" size="sm" disabled={!!testing.db} onClick={() => runTest("db")}><Database className="mr-2 h-3.5 w-3.5" />Test database</Button>
              <Button variant="outline" size="sm" disabled={!!testing.s3} onClick={() => runTest("s3")}><Upload className="mr-2 h-3.5 w-3.5" />Test S3 upload</Button>
              <Button variant="outline" size="sm" disabled={!!testing.s3} onClick={runS3Download}><Download className="mr-2 h-3.5 w-3.5" />Test S3 download</Button>
              <Button variant="outline" size="sm" disabled={!!testing.cognito} onClick={() => runTest("cognito")}><KeyRound className="mr-2 h-3.5 w-3.5" />Test Cognito login</Button>
              <Button size="sm" disabled={!!testing.full} onClick={() => runTest("full")}><RefreshCw className="mr-2 h-3.5 w-3.5" />Run Full Connection Test</Button>
            </div>
            {results.full && (
              <Alert className="mt-3" variant={results.full.ok ? "default" : "destructive"}>
                {results.full.ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                <AlertTitle>{results.full.ok ? "All checks passed" : "Some checks need attention"}</AlertTitle>
                <AlertDescription>{results.full.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </Card>

        {/* Checklist */}
        <Card className="space-y-3 p-5">
          <div>
            <h2 className="text-base font-semibold">Setup checklist</h2>
            <p className="text-xs text-muted-foreground">A nontechnical step-by-step. Mark each step complete as your administrator finishes it.</p>
          </div>
          <ol className="space-y-3">
            {CHECKLIST.map((step) => {
              const done = !!cfg.checklist[step.n];
              return (
                <li key={step.n} className="rounded-md border bg-card p-3">
                  <div className="flex items-start gap-3">
                    <Checkbox checked={done} onCheckedChange={() => toggleStep(step.n)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Step {step.n}</span>
                        {done && <Badge variant="outline" className="text-[10px]">Complete</Badge>}
                      </div>
                      <div className="text-sm font-medium">{step.title}</div>
                      <dl className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                        <div><dt className="inline font-semibold text-foreground">What this does: </dt><dd className="inline">{step.what}</dd></div>
                        <div><dt className="inline font-semibold text-foreground">Where in AWS: </dt><dd className="inline">{step.where}</dd></div>
                        <div><dt className="inline font-semibold text-foreground">What to copy: </dt><dd className="inline">{step.copy}</dd></div>
                        <div><dt className="inline font-semibold text-foreground">What not to share: </dt><dd className="inline">{step.dontShare}</dd></div>
                      </dl>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <Card className="space-y-2 p-5">
        <h2 className="text-base font-semibold">What ships next</h2>
        <p className="text-sm text-muted-foreground">
          The data layer is now ready to switch from Demo to AWS without rewriting any feature. Once you complete the
          checklist and your administrator deploys the AWS S3 connection and backend services, the real upload, download,
          database, and migration paths turn on. Until then, the app stays on demo/localStorage data.
        </p>
      </Card>
    </div>
  );
}

function SafeField({
  label, value, placeholder, onChange, validate,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  validate: (v: string) => { ok: boolean; message?: string };
}) {
  const v = validate(value);
  const secret = looksLikeSecret(value);
  const error = secret ?? (value && !v.ok ? v.message : undefined);
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={error ? "border-destructive" : ""} />
      {error ? <p className="text-[11px] text-destructive">{error}</p>
        : value && v.ok ? <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Looks valid.</p>
        : <p className="text-[11px] text-muted-foreground">{v.message ?? ""}</p>}
    </div>
  );
}
