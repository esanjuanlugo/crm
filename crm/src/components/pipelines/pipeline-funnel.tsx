"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { ArrowDown, Filter } from "lucide-react";
import type { Deal, PipelineStage } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";

const COPY_ES = {
  title: "Vista del embudo",
  hint: "Cada barra muestra cu\u00e1ntas oportunidades llegaron a esa etapa o m\u00e1s lejos.",
  inStage: "en esta etapa",
  advance: "avanzan a la siguiente etapa",
  winRate: "Tasa de \u00e9xito",
  empty: "A\u00fan no hay oportunidades. Agrega la primera para ver tu embudo.",
};

const COPY_EN: typeof COPY_ES = {
  title: "Funnel view",
  hint: "Each bar shows how many deals reached that stage or went further.",
  inStage: "in this stage",
  advance: "move on to the next stage",
  winRate: "Win rate",
  empty: "No deals yet. Add the first one to see your funnel.",
};

interface PipelineFunnelProps {
  stages: PipelineStage[];
  deals: Deal[];
}

export function PipelineFunnel({ stages, deals }: PipelineFunnelProps) {
  const locale = useLocale();
  const L = locale === "es" ? COPY_ES : COPY_EN;
  const { defaultCurrency } = useAuth();

  const sorted = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const { rows, top, winRate } = useMemo(() => {
    const alive = deals.filter((d) => d.status !== "lost");
    const inStage = sorted.map((stage) => {
      const list = alive.filter((d) => d.stage_id === stage.id);
      return {
        stage,
        count: list.length,
        value: list.reduce((sum, d) => sum + Number(d.value || 0), 0),
      };
    });
    // reached[i] = oportunidades que llegaron a la etapa i o mas lejos
    const reached = inStage.map((_, i) =>
      inStage.slice(i).reduce((sum, r) => sum + r.count, 0),
    );
    const rows = inStage.map((r, i) => ({
      ...r,
      reached: reached[i],
      conv:
        i < inStage.length - 1 && reached[i] > 0
          ? Math.round((reached[i + 1] / reached[i]) * 100)
          : null,
    }));
    const won = deals.filter((d) => d.status === "won").length;
    const lost = deals.filter((d) => d.status === "lost").length;
    return {
      rows,
      top: reached[0] ?? 0,
      winRate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null,
    };
  }, [deals, sorted]);

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter className="h-4 w-4 text-primary" /> {L.title}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{L.hint}</p>
        </div>
        {winRate !== null && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {L.winRate}: {winRate} %
          </span>
        )}
      </div>

      {top === 0 && (
        <p className="mt-4 rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {L.empty}
        </p>
      )}

      <div className="mt-4 space-y-1">
        {rows.map((r) => {
          const pct = top > 0 ? Math.max(14, Math.round((r.reached / top) * 100)) : 14;
          return (
            <div key={r.stage.id}>
              <div className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto]">
                <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.stage.color }}
                  />
                  <span className="truncate">{r.stage.name}</span>
                </span>
                <div className="flex h-9 items-center justify-center">
                  <div
                    className="flex h-full items-center justify-center rounded-md text-xs font-semibold text-white shadow-sm transition-all [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
                    style={{ width: pct + "%", backgroundColor: r.stage.color }}
                  >
                    {r.reached}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(r.value, defaultCurrency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {r.count} {L.inStage}
                  </p>
                </div>
              </div>
              {r.conv !== null && (
                <div className="flex items-center justify-center gap-1 py-0.5 text-[11px] text-muted-foreground">
                  <ArrowDown className="h-3 w-3" /> {r.conv} % {L.advance}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
