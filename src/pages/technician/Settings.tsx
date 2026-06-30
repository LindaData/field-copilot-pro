import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function Settings() {
  const { state, updateCompany } = useStore();
  const { t } = useTranslation();
  const c = state.company;
  const [draft, setDraft] = useState(c);
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultPrimary = "#133c53";
  const defaultAccent = "#14b1f0";

  const onLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setDraft({ ...draft, logoDataUrl: url });
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    updateCompany?.(draft);
    toast.success(t("settings.profileSaved"));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="card-elev p-4">
        <h1 className="text-base font-semibold">{t("settings.companyProfile")}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("settings.profileDesc")}</p>

        <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-md border bg-muted">
              {draft.logoDataUrl
                ? <img src={draft.logoDataUrl} alt="Logo" className="h-full w-full object-contain" />
                : <span className="text-xs text-muted-foreground">{t("settings.noLogo")}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onLogo(e.target.files[0])} />
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>{t("settings.uploadLogo")}</Button>
              {draft.logoDataUrl && <Button variant="ghost" size="sm" onClick={() => setDraft({ ...draft, logoDataUrl: undefined })}>{t("common.remove")}</Button>}
            </div>
          </div>

          <label>{t("settings.companyName")}<Input className="mt-1 touch-target" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
          <label>{t("settings.phone")}<Input className="mt-1 touch-target" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></label>
          <label>{t("settings.address")}<Input className="mt-1 touch-target" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label>

          <div className="grid grid-cols-2 gap-2">
            <label>{t("settings.established")}<Input className="mt-1 touch-target" type="number" value={draft.establishedYear ?? ""} onChange={(e) => setDraft({ ...draft, establishedYear: Number(e.target.value) || undefined })} /></label>
            <label>{t("settings.laborRate")}<Input className="mt-1 touch-target" type="number" value={draft.laborRate} onChange={(e) => setDraft({ ...draft, laborRate: Number(e.target.value) })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>{t("settings.weekdayHours")}<Input className="mt-1 touch-target" value={draft.weekdayHours ?? ""} onChange={(e) => setDraft({ ...draft, weekdayHours: e.target.value })} /></label>
            <label>{t("settings.weekendHours")}<Input className="mt-1 touch-target" value={draft.weekendHours ?? ""} onChange={(e) => setDraft({ ...draft, weekendHours: e.target.value })} /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>{t("settings.brandPrimary")}
              <div className="mt-1 flex gap-2">
                <Input type="color" className="h-10 w-14 p-1" value={draft.brandPrimary ?? defaultPrimary} onChange={(e) => setDraft({ ...draft, brandPrimary: e.target.value })} />
                <Input className="touch-target flex-1" value={draft.brandPrimary ?? ""} placeholder={defaultPrimary} onChange={(e) => setDraft({ ...draft, brandPrimary: e.target.value })} />
              </div>
            </label>
            <label>{t("settings.brandAccent")}
              <div className="mt-1 flex gap-2">
                <Input type="color" className="h-10 w-14 p-1" value={draft.brandAccent ?? defaultAccent} onChange={(e) => setDraft({ ...draft, brandAccent: e.target.value })} />
                <Input className="touch-target flex-1" value={draft.brandAccent ?? ""} placeholder={defaultAccent} onChange={(e) => setDraft({ ...draft, brandAccent: e.target.value })} />
              </div>
            </label>
          </div>

          <label>{t("settings.primaryServices")}
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-md border bg-background p-2 text-sm"
              value={(draft.services ?? []).join("\n")}
              onChange={(e) => setDraft({ ...draft, services: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </label>
          <label>{t("settings.serviceGeography")}
            <textarea
              className="mt-1 min-h-[100px] w-full rounded-md border bg-background p-2 text-sm"
              value={(draft.serviceAreas ?? []).join("\n")}
              onChange={(e) => setDraft({ ...draft, serviceAreas: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
            />
          </label>

          <div>
            <Button onClick={save}>{t("settings.saveProfile")}</Button>
          </div>
        </div>
      </div>

      <div className="card-elev p-4">
        <h2 className="text-sm font-semibold">{t("settings.users")}</h2>
        <ul className="mt-2 divide-y text-sm">
          {state.users.map((u) => (
            <li key={u.id} className="flex items-center gap-3 py-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white ${u.avatarColor}`}>{u.name.split(" ").map(p => p[0]).join("")}</div>
              <div className="flex-1">{u.name}</div>
              <div className="text-xs text-muted-foreground">{u.fullTitle ?? u.role}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
