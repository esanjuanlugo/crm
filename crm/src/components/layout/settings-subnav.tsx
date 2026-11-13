"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  HIDDEN_SECTIONS,
  RAIL_GROUPS,
  SECTION_META,
  SETTINGS_SECTIONS,
  resolveSection,
} from "@/components/settings/settings-sections";

/**
 * Secciones de Configuracion dentro del menu lateral principal.
 * Lista simple: sin "Resumen" (se carga al abrir Configuracion) y sin
 * subtitulos de grupo.
 */
export function SettingsSubnav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Settings");
  const searchParams = useSearchParams();
  const active = resolveSection(searchParams.get("tab"));

  const labelFor = (s: string) =>
    t.has(`sectionsNav.${s}`) ? t(`sectionsNav.${s}`) : t(`sections.${s}`);

  // Mismo orden que antes (Cuenta, luego Espacio de trabajo), en una sola lista.
  const items = RAIL_GROUPS.flatMap(({ group }) =>
    SETTINGS_SECTIONS.filter(
      (s) =>
        s !== "overview" &&
        SECTION_META[s].group === group &&
        !HIDDEN_SECTIONS.includes(s),
    ),
  );

  return (
    <div
      role="group"
      aria-label="Settings sections"
      className="mt-1 mb-2 ml-5 flex flex-col gap-0.5 border-l border-border pl-1.5"
    >
      {items.map((s) => {
        const Icon = SECTION_META[s].icon;
        const isActive = s === active;
        const text = labelFor(s);
        return (
          <Link
            key={s}
            href={`/settings?tab=${s}`}
            scroll={false}
            onClick={onNavigate}
            title={text}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2 py-2 text-[12.5px] font-medium transition-colors lg:py-1.5",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{text}</span>
          </Link>
        );
      })}
    </div>
  );
}
