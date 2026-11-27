"use client"

import { Clock } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { ResponseTimeSummary } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  title: 'Tiempo de primera respuesta',
  description:
    'Cuánto tardas en contestar el primer mensaje de un cliente. Cada barra reparte tus respuestas del día según lo que tardaron.',
  period: 'Últimos 14 días',
  target: 'Objetivo',
  typical: 'Tiempo típico',
  typicalHint: 'La mitad de tus respuestas tarda menos que esto',
  nineOfTen: '9 de cada 10 en menos de',
  nineOfTenHint: 'Casi siempre respondes dentro de este tiempo',
  withinTarget: 'Dentro del objetivo',
  withinTargetHint: 'respuestas en',
  average: 'Promedio',
  averageSkewed: 'Lo suben respuestas muy tardías',
  thisWeek: 'Esta semana',
  lastWeek: 'Semana pasada',
  day: 'Día',
  distribution: 'Reparto de las respuestas por tiempo de espera',
  typicalCol: 'Típico · resp.',
  noReplies: 'Sin respuestas',
  replies: 'respuestas',
  of: 'de',
  note: 'El tiempo típico es la mediana: no cambia por una sola respuesta que tardó varios días, por eso es más fiable que el promedio.',
  emptyTitle: 'Aún no hay respuestas registradas',
  emptyHint: 'Este gráfico se completa a medida que respondes a los mensajes de los clientes.',
  days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
}

const COPY_EN: typeof COPY_ES = {
  title: 'First response time',
  description:
    'How long you take to answer a customer’s first message. Each bar splits that day’s replies by how long they took.',
  period: 'Last 14 days',
  target: 'Target',
  typical: 'Typical time',
  typicalHint: 'Half of your replies take less than this',
  nineOfTen: '9 out of 10 within',
  nineOfTenHint: 'You almost always reply within this time',
  withinTarget: 'Within target',
  withinTargetHint: 'replies in',
  average: 'Average',
  averageSkewed: 'Pushed up by very late replies',
  thisWeek: 'This week',
  lastWeek: 'Last week',
  day: 'Day',
  distribution: 'Share of replies by wait time',
  typicalCol: 'Typical · replies',
  noReplies: 'No replies',
  replies: 'replies',
  of: 'of',
  note: 'Typical time is the median: a single reply that took days does not move it, so it is more reliable than the average.',
  emptyTitle: 'No replies recorded yet',
  emptyHint: 'This chart fills in as you reply to customer messages.',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

interface ResponseTimeChartProps {
  data: ResponseTimeSummary | null
  loading: boolean
  /** Minutos. Objetivo de primera respuesta; define el primer rango (verde). */
  thresholdMinutes?: number
}

interface Sample {
  dow: number
  minutes: number
  thisWeek: boolean
}

interface Band {
  max: number
  label: string
  color: string
}

const BAND_COLORS = [
  'bg-emerald-500',
  'bg-lime-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-rose-500',
]

export function ResponseTimeChart({
  data,
  loading,
  thresholdMinutes = 5,
}: ResponseTimeChartProps) {
  const locale = useLocale()
  const L = locale === 'es' ? COPY_ES : COPY_EN
  const target = thresholdMinutes > 0 ? thresholdMinutes : 5

  const samples: Sample[] = data?.samples ?? []
  const hasData = samples.length > 0

  const bands = buildBands(target)
  const bandOf = (m: number) => {
    const i = bands.findIndex((b) => m <= b.max)
    return i === -1 ? bands.length - 1 : i
  }

  // ---- Resumen general (14 dias) ----
  const all = sorted(samples.map((s) => s.minutes))
  const thisWeek = sorted(samples.filter((s) => s.thisWeek).map((s) => s.minutes))
  const lastWeek = sorted(samples.filter((s) => !s.thisWeek).map((s) => s.minutes))
  const typical = median(all)
  const p90 = percentile(all, 0.9)
  const within = all.filter((m) => m <= target).length
  const withinPct = all.length > 0 ? Math.round((within / all.length) * 100) : null
  const avgAll = all.length > 0 ? all.reduce((a, b) => a + b, 0) / all.length : null
  const skewed = avgAll != null && typical != null && avgAll > typical * 3

  const typicalHint =
    thisWeek.length > 0 && lastWeek.length > 0
      ? L.thisWeek + ' ' + fmt(median(thisWeek)) + ' · ' + L.lastWeek + ' ' + fmt(median(lastWeek))
      : L.typicalHint

  // ---- Por dia ----
  const rows = Array.from({ length: 7 }, (_, dow) => {
    const mins = sorted(samples.filter((s) => s.dow === dow).map((s) => s.minutes))
    const counts = bands.map(() => 0)
    for (const m of mins) counts[bandOf(m)] += 1
    return { day: L.days[dow], total: mins.length, median: median(mins), counts }
  })
  const totalCounts = bands.map((_, i) => rows.reduce((a, r) => a + r.counts[i], 0))

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0 max-w-3xl">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" /> {L.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{L.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5 text-muted-foreground">
            {L.period}
          </span>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-medium tabular-nums text-emerald-400">
            {L.target + ': ' + fmtMin(target)}
          </span>
        </div>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-[320px] w-full" />
        ) : !hasData ? (
          <EmptyState icon={Clock} title={L.emptyTitle} hint={L.emptyHint} />
        ) : (
          <div className="space-y-6">
            {/* Respuestas clave: cuanto va a tardar una respuesta */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile
                label={L.typical}
                value={fmt(typical)}
                hint={typicalHint}
                tone={toneFor(typical, target)}
              />
              <Tile
                label={L.nineOfTen}
                value={fmt(p90)}
                hint={L.nineOfTenHint}
                tone={toneFor(p90, target * 6)}
              />
              <Tile
                label={L.withinTarget}
                value={withinPct == null ? '—' : withinPct + ' %'}
                hint={within + ' ' + L.of + ' ' + all.length + ' ' + L.withinTargetHint + ' ≤ ' + fmtMin(target)}
                tone={withinPct == null ? 'text-foreground' : withinPct >= 80 ? 'text-emerald-400' : withinPct >= 50 ? 'text-amber-400' : 'text-rose-400'}
              />
              <Tile
                label={L.average}
                value={fmt(avgAll)}
                hint={skewed ? L.averageSkewed : L.lastWeek + ' ' + fmt(avg(lastWeek))}
                tone="text-foreground"
              />
            </div>

            {/* Reparto por dia */}
            <div>
              <div className="mb-2 grid grid-cols-[2.25rem_minmax(0,1fr)_7.5rem] gap-3 text-[11px] text-muted-foreground sm:grid-cols-[3rem_minmax(0,1fr)_9rem]">
                <span>{L.day}</span>
                <span>{L.distribution}</span>
                <span className="text-right">{L.typicalCol}</span>
              </div>

              <div className="space-y-2">
                {rows.map((r) => (
                  <div
                    key={r.day}
                    className="grid grid-cols-[2.25rem_minmax(0,1fr)_7.5rem] items-center gap-3 sm:grid-cols-[3rem_minmax(0,1fr)_9rem]"
                  >
                    <span className="text-xs text-muted-foreground">{r.day}</span>

                    {r.total > 0 ? (
                      <div className="flex h-7 overflow-hidden rounded-md bg-muted 3xl:h-9">
                        {bands.map((b, i) => {
                          const n = r.counts[i]
                          if (n === 0) return null
                          const pct = (n / r.total) * 100
                          return (
                            <div
                              key={b.label}
                              className={'flex items-center justify-center ' + b.color}
                              style={{ width: pct + '%' }}
                              title={b.label + ': ' + n + ' ' + L.replies + ' (' + Math.round(pct) + ' %)'}
                            >
                              {pct >= 12 && (
                                <span className="text-[10px] font-semibold tabular-nums text-black/70 3xl:text-xs">
                                  {Math.round(pct)} %
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex h-7 items-center rounded-md border border-dashed border-border px-2 text-[11px] text-muted-foreground 3xl:h-9">
                        {L.noReplies}
                      </div>
                    )}

                    <div className="text-right text-xs tabular-nums">
                      <span className="font-semibold text-foreground">{fmt(r.median)}</span>
                      <span className="text-muted-foreground">{' · ' + r.total}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Leyenda de rangos */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {bands.map((b, i) => (
                  <span key={b.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={'h-2.5 w-2.5 rounded-sm ' + b.color} />
                    {b.label}
                    <span className="tabular-nums text-foreground">
                      {totalCounts[i] + ' (' + Math.round((totalCounts[i] / all.length) * 100) + ' %)'}
                    </span>
                  </span>
                ))}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{L.note}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function Tile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={'mt-1 text-2xl font-semibold leading-tight tabular-nums 3xl:text-3xl ' + tone}>
        {value}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  )
}

// ------------------------------------------------------------ helpers

function buildBands(target: number): Band[] {
  const edges = [target, ...[30, 120, 1440].filter((e) => e > target)]
  const bands: Band[] = edges.map((e, i) => ({
    max: e,
    label: i === 0 ? '≤ ' + fmtMin(e) : fmtMin(edges[i - 1]) + ' – ' + fmtMin(e),
    color: BAND_COLORS[i],
  }))
  bands.push({
    max: Infinity,
    label: '> ' + fmtMin(edges[edges.length - 1]),
    color: BAND_COLORS[edges.length],
  })
  return bands
}

function sorted(values: number[]): number[] {
  return [...values].sort((a, b) => a - b)
}

function median(s: number[]): number | null {
  const n = s.length
  if (n === 0) return null
  const mid = Math.floor(n / 2)
  return n % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function percentile(s: number[], p: number): number | null {
  if (s.length === 0) return null
  const idx = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))
  return s[idx]
}

function avg(s: number[]): number | null {
  return s.length === 0 ? null : s.reduce((a, b) => a + b, 0) / s.length
}

function toneFor(mins: number | null, target: number): string {
  if (mins == null) return 'text-foreground'
  if (mins <= target) return 'text-emerald-400'
  if (mins <= target * 3) return 'text-amber-400'
  return 'text-rose-400'
}

function trim(x: number): string {
  return String(Number(x.toFixed(1)))
}

/** Duracion legible: 45 s, 7.5 min, 3.2 h, 5.9 d. */
function fmt(mins: number | null): string {
  if (mins == null) return '—'
  if (mins < 1) return Math.max(1, Math.round(mins * 60)) + ' s'
  if (mins < 60) return (mins < 10 ? trim(mins) : String(Math.round(mins))) + ' min'
  if (mins < 1440) return trim(mins / 60) + ' h'
  return trim(mins / 1440) + ' d'
}

/** Para los limites de los rangos: 5 min, 2 h, 24 h. */
function fmtMin(mins: number): string {
  if (mins < 60) return trim(mins) + ' min'
  if (mins <= 1440) return trim(mins / 60) + ' h'
  return trim(mins / 1440) + ' d'
}
