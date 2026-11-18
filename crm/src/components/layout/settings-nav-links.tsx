"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  SECTION_META,
  resolveSection,
  type SettingsSection,
} from "@/components/settings/settings-sections";

/**
 * Secciones que antes vivian dentro de "Configuracion" y ahora son
 * items del menu principal. La URL (?tab=) sigue siendo la fuente de
 * verdad; Perfil y Seguridad se abren desde el menu de la cuenta.
 */
const NAV_SECTIONS: SettingsSection[] = [
  "whatsapp",
  "templates",
  "quick-replies",
  "crm",
  "members",
];

function Items({
  active,
  onNavigate,
}: {
  active: SettingsSection | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Settings");
  return (
    <>
      {NAV_SECTIONS.map((s) => {
        const Icon = SECTION_META[s].icon;
        const isActive = s === active;
        return (
          <li key={s}>
            <Link
              href={`/settings?tab=${s}`}
              scroll={false}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors lg:py-2",
                isActive
                  ? "bg-primary/10 text-primary before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{t(`sections.${s}`)}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
}

function ActiveItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = pathname.startsWith("/settings")
    ? resolveSection(searchParams.get("tab"))
    : null;
  return <Items active={active} onNavigate={onNavigate} />;
}

export function SettingsNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<Items active={null} onNavigate={onNavigate} />}>
      <ActiveItems onNavigate={onNavigate} />
    </Suspense>
  );
}
