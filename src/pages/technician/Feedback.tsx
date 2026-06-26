import { useState } from "react";
import { useStore, useCurrentUser } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { CheckCircle2, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";

const CATEGORIES = [
  "Bug",
  "Confusing workflow",
  "Missing feature",
  "Incorrect information",
  "HVAC technical concern",
  "Safety concern",
  "Translation issue",
  "Performance issue",
  "Other",
] as const;

const SEVERITIES = ["Low", "Medium", "High", "Blocking"] as const;

interface FeedbackRecord {
  id: string;
  ref: string;
  category: string;
  page: string;
  what: string;
  expected: string;
  severity: string;
  contact: boolean;
  language: string;
  role: string;
  userId: string;
  createdAt: string;
}

function nextRef() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const seq = Math.floor(1000 + Math.random() * 8999);
  return `FB-${yy}${mm}${dd}-${seq}`;
}

export default function Feedback() {
  const { state, setState } = useStore();
  const user = useCurrentUser();
  const loc = useLocation();
  const { t, i18n } = useTranslation();

  const [category, setCategory] = useState<string>("Bug");
  const [severity, setSeverity] = useState<string>("Medium");
  const [page, setPage] = useState<string>(loc.state?.from ?? loc.pathname);
  const [what, setWhat] = useState("");
  const [expected, setExpected] = useState("");
  const [contact, setContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const existing = ((state as unknown as { feedback?: FeedbackRecord[] }).feedback) ?? [];

  const submit = () => {
    if (submitting || submittedRef) return;
    if (!what.trim()) return;
    setSubmitting(true);
    const rec: FeedbackRecord = {
      id: `fb-${Date.now()}`,
      ref: nextRef(),
      category,
      page,
      what: what.trim(),
      expected: expected.trim(),
      severity,
      contact,
      language: i18n.resolvedLanguage ?? "en",
      role: user.role,
      userId: user.id,
      createdAt: new Date().toISOString(),
    };
    setState((s) => {
      const list = ((s as unknown as { feedback?: FeedbackRecord[] }).feedback) ?? [];
      return { ...s, feedback: [rec, ...list] } as typeof s;
    });
    setSubmittedRef(rec.ref);
    setSubmitting(false);
  };

  if (submittedRef) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h1 className="text-lg font-semibold">{t("feedback.submitted")}</h1>
        <div className="text-sm text-muted-foreground">
          {t("feedback.reference")}: <span className="font-mono font-semibold">{submittedRef}</span>
        </div>
        <Button onClick={() => { setSubmittedRef(null); setWhat(""); setExpected(""); }}>
          {t("feedback.sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <MessageSquare className="h-4 w-4" /> {t("feedback.title")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("feedback.helpText")}
        </p>
      </div>

      <div className="grid gap-3">
        <div>
          <Label>{t("feedback.category")}</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`feedback.categories.${c}`, { defaultValue: c })}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t("feedback.page")}</Label>
          <Input value={page} onChange={(e) => setPage(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>{t("feedback.whatHappened")}</Label>
          <Textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={4} className="mt-1" />
        </div>
        <div>
          <Label>{t("feedback.whatExpected")}</Label>
          <Textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={3} className="mt-1" />
        </div>
        <div>
          <Label>{t("feedback.severity")}</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>{SEVERITIES.map((c) => <SelectItem key={c} value={c}>{t(`feedback.severities.${c}`, { defaultValue: c })}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={contact} onCheckedChange={(v) => setContact(v === true)} />
          {t("feedback.contactMe")}
        </label>

        <Button onClick={submit} disabled={submitting || !what.trim()} className="touch-target">
          {submitting ? t("common.submitting") : t("common.submit")}
        </Button>
      </div>

      {existing.length > 0 && (
        <Card className="p-3">
          <div className="text-sm font-semibold">{t("feedback.previous")}</div>
          <ul className="mt-2 divide-y text-xs">
            {existing.slice(0, 8).map((f) => (
              <li key={f.id} className="flex items-start justify-between gap-2 py-2">
                <div>
                  <div className="font-mono font-semibold">{f.ref}</div>
                  <div className="text-muted-foreground">{t(`feedback.categories.${f.category}`, { defaultValue: f.category })} · {t(`feedback.severities.${f.severity}`, { defaultValue: f.severity })} · {new Date(f.createdAt).toLocaleString()}</div>
                  <div className="line-clamp-2 text-foreground">{f.what}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
