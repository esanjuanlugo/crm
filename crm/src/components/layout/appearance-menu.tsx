"use client";

import { Check, Moon, Palette, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "@/hooks/use-theme";
import { MODES, THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

/**
 * Apariencia como menu discreto en la barra superior: un icono de
 * paleta que abre un popover con el modo (claro/oscuro) y el color de
 * acento. Cada cambio se aplica y se guarda al instante (por
 * dispositivo), igual que antes en Configuracion.
 */
export function AppearanceMenu({ className }: { className?: string }) {
  const t = useTranslations("Settings.appearance");
  const { theme, setTheme, mode, setMode } = useTheme();

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("title")}
        title={t("title")}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted data-popup-open:text-foreground",
          className,
        )}
      >
        <Palette className="h-5 w-5" />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={6} className="w-64 gap-4 p-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("mode")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("mode")}
            className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          >
            {MODES.map((m) => {
              const Icon = m === "light" ? Sun : Moon;
              const active = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t("useMode", { mode: m })}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t(m === "light" ? "modeLight" : "modeDark")}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("accentColor")}
          </p>
          <div
            role="radiogroup"
            aria-label={t("accentColor")}
            className="flex items-center justify-between px-1"
          >
            {THEMES.map((th) => {
              const active = th.id === theme;
              return (
                <button
                  key={th.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={t("useTheme", { name: th.name })}
                  title={th.name}
                  onClick={() => setTheme(th.id)}
                  className="flex size-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:outline-none"
                  style={{
                    background: th.swatch,
                    boxShadow: active
                      ? "0 0 0 2px var(--popover), 0 0 0 4px " + th.swatch
                      : "inset 0 0 0 1px oklch(1 0 0 / 0.15)",
                  }}
                >
                  {active && (
                    <Check className="size-3.5 text-white" strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
