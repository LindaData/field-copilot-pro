import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Training() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4 text-center">
        <GraduationCap className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-2 text-base font-semibold">{t("training.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("training.desc")}</p>
        <Link to="/app/jobs/j-1/diagnose"><Button className="touch-target mt-4 w-full h-12">{t("training.start")}</Button></Link>
      </div>
    </div>
  );
}
