import { Link } from "react-router-dom";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Building2, Play, ShieldCheck, Sparkles, Wrench } from "lucide-react";
import { LanguageSelector } from "@/components/LanguageSelector";

export default function Landing() {
  const { setRole, state, markTourSeen } = useStore();
  const { t } = useTranslation();
  const [showTour, setShowTour] = useState(false);
  const owner = state.users.find((u) => u.role === "Owner");

  useEffect(() => {
    if (!state.tourSeen) setShowTour(true);
  }, [state.tourSeen]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary-soft text-primary-foreground">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-5 pt-10 pb-12 safe-top">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold text-lg">FC</div>
            <div>
              <div className="text-xl font-semibold leading-tight">{t("app.name")}</div>
              <div className="text-xs opacity-80">Demo · {state.company.name}</div>
            </div>
          </div>
          <LanguageSelector />
        </div>

        <h1 className="text-3xl font-bold leading-tight">
          {t("landing.title")} <span className="text-accent">{t("landing.titleAccent")}</span>
        </h1>
        <p className="text-sm opacity-90">{t("app.tagline")}</p>

        <div className="flex flex-col gap-3">
          <Link to="/app/today" onClick={() => setRole("guest-tech", "u-alex")}>
            <Button className="touch-target h-14 w-full justify-between bg-accent text-accent-foreground hover:bg-accent/90 text-base font-semibold">
              <span className="inline-flex items-center gap-2"><Wrench className="h-5 w-5" /> {t("landing.enterAsTech")}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/app/owner" onClick={() => setRole("guest-owner", owner?.id ?? "u-owner")}>
            <Button variant="secondary" className="touch-target h-14 w-full justify-between text-base font-semibold">
              <span className="inline-flex items-center gap-2"><Building2 className="h-5 w-5" /> {t("landing.enterAsOwner")}</span>
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link to="/signin"><Button variant="outline" className="touch-target w-full border-white/30 bg-white/0 text-primary-foreground hover:bg-white/10">{t("landing.signIn")}</Button></Link>
            <Button variant="outline" className="touch-target w-full border-white/30 bg-white/0 text-primary-foreground hover:bg-white/10" onClick={() => setShowTour(true)}>
              <Play className="mr-1 h-4 w-4" /> {t("landing.tour")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3">
          {[
            { icon: Sparkles, k: t("landing.fasterDiagnosis"), v: t("landing.fasterDiagnosisV") },
            { icon: ShieldCheck, k: t("landing.fewerCallbacks"), v: t("landing.fewerCallbacksV") },
            { icon: Bot, k: t("landing.lessPaperwork"), v: t("landing.lessPaperworkV") },
          ].map(({ icon: Icon, k, v }) => (
            <div key={k} className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <Icon className="h-5 w-5 text-accent" />
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">{k}</div>
              <div className="text-sm font-semibold">{v}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/20 bg-white/5 p-3 text-[11px] opacity-80">
          {t("landing.disclaimer")}
        </div>
      </div>

      {showTour && (
        <TourModal onDone={() => { setShowTour(false); markTourSeen(); }} />
      )}
    </div>
  );
}

function TourModal({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const screens = [
    { title: "Open the job", body: "Tap a job to see the customer, equipment, and complaint.", icon: Wrench },
    { title: "Diagnose step by step", body: "Field Copilot asks one question at a time. Every spec is sourced.", icon: ShieldCheck },
    { title: "Finish before you leave", body: "Capture customer approval and generate a clean service report.", icon: Bot },
  ];
  const s = screens[i];
  const Icon = s.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5 text-card-foreground shadow-xl">
        <div className="flex justify-center"><Icon className="h-10 w-10 text-primary" /></div>
        <h3 className="mt-3 text-center text-lg font-semibold">{s.title}</h3>
        <p className="mt-1 text-center text-sm text-muted-foreground">{s.body}</p>
        <div className="mt-4 flex items-center justify-center gap-1">
          {screens.map((_, idx) => <span key={idx} className={`h-1.5 w-6 rounded-full ${idx === i ? "bg-primary" : "bg-muted"}`} />)}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onDone}>Skip</Button>
          {i < screens.length - 1 ? (
            <Button className="flex-1" onClick={() => setI(i + 1)}>Next</Button>
          ) : (
            <Button className="flex-1" onClick={onDone}>Start</Button>
          )}
        </div>
      </div>
    </div>
  );
}
