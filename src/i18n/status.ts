import { useTranslation } from "react-i18next";
import type { JobStatus } from "@/lib/types";

/**
 * Shared job-status translation hook. Use this everywhere a status is shown
 * to the user so the same status reads identically across every page.
 *
 * Falls back to the raw English status if a key is missing.
 */
export function useStatusLabel() {
  const { t } = useTranslation();
  return (status: JobStatus | string | undefined | null): string => {
    if (!status) return "";
    return t(`jobStatus.${status}`, { defaultValue: String(status) });
  };
}
