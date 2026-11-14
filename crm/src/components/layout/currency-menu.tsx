"use client";

import { useState } from "react";
import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

/**
 * Moneda como menu discreto en la barra superior, igual que Apariencia:
 * un boton con la moneda actual que abre un popover con el selector.
 * El cambio se guarda al instante en accounts.default_currency (una
 * moneda por cuenta). La politica RLS limita la escritura a admins, asi
 * que el resto de roles ve el selector deshabilitado.
 */
export function CurrencyMenu({ className }: { className?: string }) {
  const t = useTranslations("Settings.deals");
  const supabase = createClient();
  const {
    accountId,
    defaultCurrency,
    canEditSettings,
    profileLoading,
    refreshProfile,
  } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleChange(code: string) {
    if (!accountId || code === defaultCurrency) return;
    setSaving(true);
    const { error } = await supabase
      .from("accounts")
      .update({ default_currency: code })
      .eq("id", accountId);
    if (error) {
      toast.error(t("saveFailed"));
      setSaving(false);
      return;
    }
    // Vuelve a cargar la cuenta para que formularios y totales usen la
    // nueva moneda sin recargar la pagina.
    await refreshProfile();
    setSaving(false);
    toast.success(t("saveSuccess"));
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("currencyLabel")}
        title={t("title")}
        className={cn(
          "flex h-10 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted data-popup-open:text-foreground",
          className,
        )}
      >
        <Coins className="h-5 w-5" />
        <span className="hidden sm:inline">{defaultCurrency}</span>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-72 gap-3 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("currencyLabel")}
          </p>
          <select
            value={defaultCurrency}
            onChange={(e) => handleChange(e.target.value)}
            disabled={!canEditSettings || profileLoading || saving}
            className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {canEditSettings ? t("defaultCurrencyDesc") : t("adminOnlyHint")}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
