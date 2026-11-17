"use client"

import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DOW_SHORT_MON_FIRST } from '@/lib/dashboard/date-utils'
import type { ResponseTimeSummary } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface ResponseTimeChartProps {
  data: ResponseTimeSummary | null
  loading: boolean
  /** Minutos. Se dibuja como linea punteada de objetivo y como pastilla en el encabezado. */
  thresholdMinutes?: number
}

export function ResponseTimeChart({
  data,
  loading,
  thresholdMinutes = 5,
}: ResponseTimeChartProps) {
  const t = useTranslations('Dashboard.responseTimeChart')

  const days = [
    t('days.mon'),
    t('days.tue'),
    t('days.wed'),
    t('days.thu'),
    t('days.fri'),
    t('days.sat'),
    t('days.sun'),
  ]

  const hasData = data?.buckets.some((b) => b.avgMinutes != null) ?? false

  const rows =
    data?.buckets.map((b, i) => ({
      day: days[i] ?? DOW_SHORT_MON_FIRST[i],
      value: b.avgMinutes,
      samples: b.samples,
    })) ?? []

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {t('title')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('description')}
          </p>
        </div>

        <div className="flex items-center gap-3 text-right text-xs">
          {thresholdMinutes > 0 && (
            <span className="rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 font-medium text-rose-300 tabular-nums">
              {t('target', { minutes: thresholdMinutes })}
            </span>
          )}

          {data && (data.thisWeekAvg != null || data.lastWeekAvg != null) && (
            <div>
              <div className="text-muted-foreground">
                {t('thisWeek')}{' '}
                <span className="font-medium text-foreground tabular-nums">
                  {fmt(data.thisWeekAvg)}
                </span>
              </div>

              <div className="text-muted-foreground">
                {t('lastWeek')}{' '}
                <span className="tabular-nums">
                  {fmt(data.lastWeekAvg)}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-[260px] w-full" />
        ) : !hasData ? (
          <EmptyState
            icon={Clock}
            title={t('noReplies')}
            hint={t('noRepliesHint')}
          />
        ) : (
          <ResponseBars
            rows={rows}
            threshold={thresholdMinutes}
            samplesLabel={(count) => t('samples', { count })}
          />
        )}
      </div>
    </section>
  )
}

// ------------------------------------------------------------
// Barras en HTML/CSS: texto nitido, linea de objetivo y colores segun
// el objetivo (verde: cumple, ambar: hasta 3x, rojo: mas). Si una barra
// supera el eje (un unico mensaje contestado al dia siguiente puede ser
// de 25 h), se recorta al tope y se marca con una flecha.
// ------------------------------------------------------------

interface Row {
  day: string
  value: number | null
  samples: number
}

const NICE_TOPS = [1, 2, 5, 10, 15, 30, 60, 120, 240, 480, 720, 1440]

function niceTop(cap: number): number {
  const target = cap * 1.15
  return NICE_TOPS.find((n) => n >= target) ?? Math.ceil(target / 1440) * 1440
}

function ResponseBars({
  rows,
  threshold,
  samplesLabel,
}: {
  rows: Row[]
  threshold: number
  samplesLabel: (count: number) => string
}) {
  const values = rows.map((r) => r.value ?? 0)
  const maxValue = Math.max(threshold, ...values)
  const axisCap = Math.max(60, threshold * 12)
  const top = niceTop(Math.min(maxValue, axisCap))
  const ticks = [0, top / 2, top]
  const targetPct = threshold > 0 && threshold <= top ? (threshold / top) * 100 : null

  return (
    <div className="relative h-[260px]">
      <div className="absolute bottom-9 left-12 right-2 top-5">
        {/* Lineas guia y etiquetas del eje Y */}
        {ticks.map((tick) => (
          <div
            key={tick}
            className="absolute left-0 right-0 border-t border-dashed border-border"
            style={{ bottom: `${(tick / top) * 100}%` }}
          >
            <span className="absolute right-full -translate-y-1/2 pr-2 text-[11px] tabular-nums text-muted-foreground">
              {axisFmt(tick)}
            </span>
          </div>
        ))}

        {/* Linea de objetivo */}
        {targetPct !== null && (
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/60"
            style={{ bottom: `${targetPct}%` }}
          />
        )}

        {/* Barras */}
        <div className="absolute inset-0 flex items-end gap-3">
          {rows.map((r) => {
            const has = r.value != null
            const clipped = has && (r.value as number) > top
            const pct = has
              ? Math.max(2, Math.min(100, ((r.value as number) / top) * 100))
              : 0
            const tone = !has
              ? 'bg-muted'
              : (r.value as number) <= threshold
                ? 'bg-emerald-500'
                : (r.value as number) <= threshold * 3
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            return (
              <div
                key={r.day}
                className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                title={
                  has
                    ? `${r.day}: ${fmt(r.value)} · ${samplesLabel(r.samples)}`
                    : `${r.day}: —`
                }
              >
                {has ? (
                  <div
                    className={`relative w-full max-w-16 rounded-t-md ${tone}`}
                    style={{ height: `${pct}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tabular-nums text-foreground">
                      {clipped ? '▲ ' : ''}
                      {fmt(r.value)}
                    </span>
                  </div>
                ) : (
                  <div className="h-[3px] w-full max-w-16 rounded bg-muted" />
                )}
                <span className="absolute top-full mt-2 text-xs text-muted-foreground">
                  {r.day}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function fmt(mins: number | null): string {
  if (mins == null) return '—'
  if (mins <= 0) return '0s'
  if (mins < 1) return `${Math.max(1, Math.round(mins * 60))}s`
  if (mins < 60) return `${mins.toFixed(1)}m`
  return `${(mins / 60).toFixed(1)}h`
}

function axisFmt(mins: number): string {
  if (mins <= 0) return '0'
  if (mins < 1) return `${Math.round(mins * 60)}s`
  if (mins < 60) return `${Number.isInteger(mins) ? mins : mins.toFixed(1)}m`
  const h = mins / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)}h`
}
