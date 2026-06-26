import { useStore } from "@/lib/store";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Phone, Mail, MapPin } from "lucide-react";

export default function OwnerCustomers() {
  const { state } = useStore();
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("ownerCustomers.title")}</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {state.customers.map((c) => {
          const props = state.properties.filter((p) => p.customerId === c.id);
          const jobs = state.jobs.filter((j) => j.customerId === c.id);
          const completed = jobs.filter(j => j.status === "Completed").length;
          return (
            <Card key={c.id} className="p-4">
              <div className="text-base font-semibold">{c.name}</div>
              <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</div>
                {c.email && <div className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</div>}
              </div>
              <div className="mt-3 space-y-1 text-xs">
                {props.map((p) => (
                  <div key={p.id} className="inline-flex items-start gap-1"><MapPin className="mt-0.5 h-3 w-3" />{p.address}</div>
                ))}
              </div>
              <div className="mt-3 text-xs">{t("ownerCustomers.jobsCount", { total: jobs.length, completed })}</div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
