import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LANGS, setLanguage, type LangCode } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSelector({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2) as LangCode;
  const short = LANGS.find((l) => l.code === current)?.short ?? "EN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav.language")}
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border border-white/30 bg-white/10 px-2 text-[12px] font-semibold text-primary-foreground hover:bg-white/20",
          className,
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        {short}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 min-w-[140px]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLanguage(l.code)}
            className={cn("text-sm", current === l.code && "font-semibold")}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
