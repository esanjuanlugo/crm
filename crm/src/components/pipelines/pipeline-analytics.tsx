"use client";

import { useMemo } from "react";
import type { Deal, PipelineStage } from "@/types";
import {
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  Trophy,
  XCircle,
  Info,
  Percent,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/currency";
import { useLocale, useTranslations } from "next-intl";
import { computeStageProbability } from "@/lib/pipeline-probability";

interface PipelineAnalyticsProps {
  stages: PipelineStage[];
  deals: Deal[];
}

const COPY_ES = {
  winRate: "Tasa de éxito",
  winRateTip:
    "Porcentaje de oportunidades cerradas que se ganaron: ganadas / (ganadas + perdidas), en todo el historial de este embudo.",
  overdue: "Vencidos",
  overdueTip:
    "Oportunidades abiertas cuya fecha estimada de cierre ya pasó. Conviene revisarlas o mover la fecha.",
  probabilities: "Probabilidad de cada etapa en este embudo:",
};

const COPY_EN: typeof COPY_ES = {
  winRate: "Win rate",
  winRateTip:
    "Share of closed deals that were won: won / (won + lost), over the whole history of this pipeline.",
  overdue: "Overdue",
  overdueTip:
    "Open deals whose expected close date has already passed. Worth reviewing or moving the date.",
  probabilities: "Probability of each stage in this pipeline:",
};

export function PipelineAnalytics({ stages, deals }: PipelineAnalyticsProps) {
  const t = useTranslations("Pipelines.analytics");
  const locale = useLocale();
  const L = locale === "es" ? COPY_ES : COPY_EN;
  const { defaultCurrency } = useAuth();
  const sortedStages = useMemo(
    () => [...stages].sort((a, b) => a.position - b.position),
    [stages],
  );

  const stats = useMemo(() => {
    const active = deals.filter((d) => d.status !== "lost");
    const openDeals = active.filter((d) => d.status !== "won");

    const totalCount = active.length;
    const totalValue = active.reduce((sum, d) => sum + Number(d.value || 0), 0);
    const avgValue = totalCount > 0 ? totalValue / totalCount : 0;

    const stageById = new Map(sortedStages.map((s) => [s.id, s]));
    const weightedValue = openDeals.reduce((sum, d) => {
      const stage = stageById.get(d.stage_id);
      if (!stage) return sum;
      const prob = computeStageProbability(stage, sortedStages);
      return sum + Number(d.value || 0) * prob;
    }, 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = (d: Deal) => {
      const ts = d.updated_at ?? d.created_at;
      return ts ? new Date(ts) >= monthStart : false;
    };
    const wonThisMonth = deals.filter(
      (d) => d.status === "won" && thisMonth(d),
    ).length;
    const lostThisMonth = deals.filter(
      (d) => d.status === "lost" && thisMonth(d),
    ).length;

    const wonAll = deals.filter((d) => d.status === "won").length;
    const lostAll = deals.filter((d) => d.status === "lost").length;
    const winRate =
      wonAll + lostAll > 0 ? Math.round((wonAll / (wonAll + lostAll)) * 100) : null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = openDeals.filter(
      (d) =>
        d.expected_close_date &&
        new Date(d.expected_close_date.slice(0, 10) + "T00:00:00") < today,
    ).length;

    return {
      totalCount,
      totalValue,
      avgValue,
      weightedValue,
      wonThisMonth,
      lostThisMonth,
      winRate,
      overdue,
    };
  }, [deals, sortedStages]);

  const probText = sortedStages
    .map(
      (s) =>
        s.name +
        " " +
        Math.round(computeStageProbability(s, sortedStages) * 100) +
        " %",
    )
    .join(", ");

  return (
    <TooltipProvider>
      {/* Una sola tarjeta; gap-px sobre bg-border dibuja divisores finos
          entre celdas en cualquier numero de columnas (2 / 4 / 8). */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border/60 md:grid-cols-4 xl:grid-cols-8">
        <Metric
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          label={t("totalDeals")}
          value={String(stats.totalCount)}
          tooltip={t("totalDealsTooltip")}
          t={t}
        />
        <Metric
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          label={t("pipelineValue")}
          value={formatCurrency(stats.totalValue, defaultCurrency)}
          tooltip={t("pipelineValueTooltip")}
          t={t}
        />
        <Metric
          icon={<Target className="h-4 w-4 text-blue-400" />}
          label={t("avgDealSize")}
          value={formatCurrency(stats.avgValue, defaultCurrency)}
          tooltip={t("avgDealSizeTooltip")}
          t={t}
        />
        <Metric
          icon={<TrendingUp className="h-4 w-4 text-purple-400" />}
          label={t("weightedValue")}
          value={formatCurrency(stats.weightedValue, defaultCurrency)}
          tooltip={t("weightedValueTooltip") + " " + L.probabilities + " " + probText + "."}
          t={t}
        />
        <Metric
          icon={<Trophy className="h-4 w-4 text-primary" />}
          label={t("wonThisMonth")}
          value={String(stats.wonThisMonth)}
          tooltip={t("wonThisMonthTooltip")}
          t={t}
        />
        <Metric
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          label={t("lostThisMonth")}
          value={String(stats.lostThisMonth)}
          tooltip={t("lostThisMonthTooltip")}
          t={t}
        />
        <Metric
          icon={<Percent className="h-4 w-4 text-emerald-400" />}
          label={L.winRate}
          value={stats.winRate === null ? "-" : stats.winRate + " %"}
          tooltip={L.winRateTip}
          t={t}
        />
        <Metric
          icon={
            <Clock
              className={
                "h-4 w-4 " +
                (stats.overdue > 0 ? "text-amber-400" : "text-muted-foreground")
              }
            />
          }
          label={L.overdue}
          value={String(stats.overdue)}
          valueClassName={stats.overdue > 0 ? "text-amber-400" : undefined}
          tooltip={L.overdueTip}
          t={t}
        />
      </div>
    </TooltipProvider>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClassName,
  tooltip,
  t,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  tooltip: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}) {
  return (
    <div className="group min-w-0 bg-card px-4 py-3 xl:px-3 2xl:px-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="shrink-0">{icon}</span>
        <span className="min-w-0 truncate" title={label}>
          {label}
        </span>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={t("howCalculated", { label })}
                className="shrink-0 text-muted-foreground opacity-40 transition-opacity hover:text-foreground group-hover:opacity-100 focus:outline-none focus-visible:opacity-100"
              />
            }
          >
            <Info className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </div>
      <p
        className={
          "mt-1 truncate text-xl font-semibold tabular-nums tracking-tight xl:text-lg 2xl:text-xl " +
          (valueClassName ?? "text-foreground")
        }
        title={value}
      >
        {value}
      </p>
    </div>
  );
}
