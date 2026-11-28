"use client";

import type { Deal, PipelineStage } from "@/types";
import { Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { intlLocale } from "@/lib/locale";

interface DealCardProps {
  deal: Deal;
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatDate(dateStr: string, locale: string) {
  // expected_close_date es una fecha sin hora: se lee en hora local para
  // que "2026-12-05" no se muestre como 4 de diciembre al oeste de UTC.
  return new Date(dateStr.slice(0, 10) + "T00:00:00").toLocaleDateString(intlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

function closeDateInfo(deal: Deal, es: boolean) {
  if (!deal.expected_close_date) return null;
  // Solo las oportunidades abiertas se marcan como vencidas o proximas.
  if (deal.status && deal.status !== "open") return null;
  const due = new Date(deal.expected_close_date.slice(0, 10) + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) {
    return {
      tone: "overdue" as const,
      label: es ? "Vencida hace " + Math.abs(days) + " d" : "Overdue by " + Math.abs(days) + " d",
    };
  }
  if (days === 0) {
    return { tone: "soon" as const, label: es ? "Vence hoy" : "Due today" };
  }
  if (days <= 3) {
    return {
      tone: "soon" as const,
      label: es ? "Vence en " + days + " d" : "Due in " + days + " d",
    };
  }
  return null;
}

// `stage` sigue en las props (lo pasan el tablero y el overlay), pero la
// tarjeta ya no pinta el color de la etapa: eso queda en el encabezado.
export function DealCard({ deal, onEdit, isOverlay }: DealCardProps) {
  const t = useTranslations("Pipelines.card");
  const locale = useLocale();
  const closeInfo = closeDateInfo(deal, locale === "es");
  const contactLabel = deal.contact?.name || deal.contact?.phone || t("noContact");
  const assigneeLabel = deal.assignee?.full_name || null;

  return (
    <button
      type="button"
      onClick={(e) => {
        // onClick still fires after a non-drag tap because the PointerSensor
        // requires 5px movement before it counts as a drag.
        if (isOverlay) return;
        e.stopPropagation();
        onEdit(deal);
      }}
      className={cn(
        // Tres niveles: pagina < columna (white/4%) < tarjeta (white/7%, con
        // borde y sombra). En claro: columna slate-100 y tarjeta blanca. El
        // color de la etapa queda solo en el encabezado de la columna.
        "group relative w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.07] p-3.5 text-left shadow-sm transition-all light:border-slate-200 light:bg-white",
        isOverlay
          ? // Al arrastrar va encima de otras columnas: fondo opaco.
            "bg-card shadow-xl ring-1 ring-primary/40"
          : "hover:-translate-y-0.5 hover:border-primary/40 hover:bg-white/[0.10] hover:shadow-md light:hover:bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 break-words text-sm font-semibold leading-snug text-foreground">
          {deal.title}
        </h4>
        {/* Sin etiqueta Ganada/Perdida: la columna ya dice el estatus. */}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
          {initials(deal.contact?.name, deal.contact?.phone)}
        </span>
        <span className="truncate text-xs text-muted-foreground">{contactLabel}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-2 gap-y-1.5 border-t border-border/50 pt-3">
        <span className="text-base font-bold leading-none text-primary">
          {formatCurrency(deal.value, deal.currency)}
        </span>
        <div className="flex items-center gap-2">
          {deal.expected_close_date && (
            <span
              title={formatDate(deal.expected_close_date, locale)}
              className={cn(
                "flex items-center gap-1 text-[11px]",
                closeInfo?.tone === "overdue" && "font-semibold text-red-400",
                closeInfo?.tone === "soon" && "font-semibold text-amber-400",
                !closeInfo && "text-muted-foreground",
              )}
            >
              <Calendar className="h-3 w-3" />
              {closeInfo ? closeInfo.label : formatDate(deal.expected_close_date, locale)}
            </span>
          )}
          {assigneeLabel && (
            <span
              title={assigneeLabel}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary"
            >
              {initials(assigneeLabel)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
