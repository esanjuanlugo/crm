import fs from "node:fs";

const load = (p) => {
  const raw = fs.readFileSync(p, "utf8");
  return { txt: raw.replace(/\r\n/g, "\n"), crlf: raw.includes("\r\n") };
};
const save = (p, txt, crlf) =>
  fs.writeFileSync(p, crlf ? txt.replace(/\n/g, "\r\n") : txt, "utf8");

// ---------------------------------------------------------------- 1) Tiempo de primera respuesta (grafica nueva)
const responseTime = `"use client"

import { Clock } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { ResponseTimeSummary } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  title: 'Tiempo de primera respuesta',
  description:
    'Cu\u00e1nto tardas en contestar el primer mensaje de un cliente. Cada barra reparte tus respuestas del d\u00eda seg\u00fan lo que tardaron.',
  period: '\u00daltimos 14 d\u00edas',
  target: 'Objetivo',
  typical: 'Tiempo t\u00edpico',
  typicalHint: 'La mitad de tus respuestas tarda menos que esto',
  nineOfTen: '9 de cada 10 en menos de',
  nineOfTenHint: 'Casi siempre respondes dentro de este tiempo',
  withinTarget: 'Dentro del objetivo',
  withinTargetHint: 'respuestas en',
  average: 'Promedio',
  averageSkewed: 'Lo suben respuestas muy tard\u00edas',
  thisWeek: 'Esta semana',
  lastWeek: 'Semana pasada',
  day: 'D\u00eda',
  distribution: 'Reparto de las respuestas por tiempo de espera',
  typicalCol: 'T\u00edpico \u00b7 resp.',
  noReplies: 'Sin respuestas',
  replies: 'respuestas',
  of: 'de',
  note: 'El tiempo t\u00edpico es la mediana: no cambia por una sola respuesta que tard\u00f3 varios d\u00edas, por eso es m\u00e1s fiable que el promedio.',
  emptyTitle: 'A\u00fan no hay respuestas registradas',
  emptyHint: 'Este gr\u00e1fico se completa a medida que respondes a los mensajes de los clientes.',
  days: ['Lun', 'Mar', 'Mi\u00e9', 'Jue', 'Vie', 'S\u00e1b', 'Dom'],
}

const COPY_EN: typeof COPY_ES = {
  title: 'First response time',
  description:
    'How long you take to answer a customer\u2019s first message. Each bar splits that day\u2019s replies by how long they took.',
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
  typicalCol: 'Typical \u00b7 replies',
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
      ? L.thisWeek + ' ' + fmt(median(thisWeek)) + ' \u00b7 ' + L.lastWeek + ' ' + fmt(median(lastWeek))
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
                value={withinPct == null ? '\u2014' : withinPct + ' %'}
                hint={within + ' ' + L.of + ' ' + all.length + ' ' + L.withinTargetHint + ' \u2264 ' + fmtMin(target)}
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
                      <span className="text-muted-foreground">{' \u00b7 ' + r.total}</span>
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
    label: i === 0 ? '\u2264 ' + fmtMin(e) : fmtMin(edges[i - 1]) + ' \u2013 ' + fmtMin(e),
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
  if (mins == null) return '\u2014'
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
`;

// ---------------------------------------------------------------- 2) Ganadas vs perdidas (laptop y pantalla grande)
const wonLost = `"use client"

import { BarChart3 } from 'lucide-react'
import { useLocale } from 'next-intl'
import type { DealsComparisonPoint } from '@/lib/dashboard/types'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  title: 'Ganadas vs perdidas',
  description: 'Oportunidades nuevas, ganadas y perdidas por mes',
  created: 'Nuevas',
  won: 'Ganadas',
  lost: 'Perdidas',
  closeRate: 'Tasa de cierre',
  closeRateMonth: 'Tasa de cierre del mes',
  period: '\u00daltimos 6 meses',
  perMonth: 'al mes en promedio',
  ofClosed: 'de las cerradas',
  bestMonth: 'Mejor mes',
  wonSuffix: 'ganadas',
  empty: 'A\u00fan no hay oportunidades para comparar',
  emptyHint: 'Cuando crees y cierres oportunidades aparecer\u00e1n aqu\u00ed.',
}

const COPY_EN: typeof COPY_ES = {
  title: 'Won vs lost',
  description: 'New, won and lost deals per month',
  created: 'New',
  won: 'Won',
  lost: 'Lost',
  closeRate: 'Close rate',
  closeRateMonth: 'Close rate this month',
  period: 'Last 6 months',
  perMonth: 'per month on average',
  ofClosed: 'of closed deals',
  bestMonth: 'Best month',
  wonSuffix: 'won',
  empty: 'No deals to compare yet',
  emptyHint: 'When you create and close deals they will show up here.',
}

interface WonLostChartProps {
  data: DealsComparisonPoint[] | null
  loading: boolean
}

/** Alto del area de barras: crece con la pantalla (laptop -> monitor grande). */
const PLOT_H = 'h-56 lg:h-64 3xl:h-80'

function niceAxis(max: number): { top: number; ticks: number[] } {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]
  const step = steps.find((s) => max / s <= 4) ?? Math.ceil(max / 4)
  const top = Math.max(step, Math.ceil(max / step) * step)
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return { top, ticks }
}

function Bar({
  value,
  top,
  color,
  label,
}: {
  value: number
  top: number
  color: string
  label: string
}) {
  const pct = value > 0 ? Math.max(2, (value / top) * 100) : 0
  return (
    <div
      className="relative flex h-full w-full max-w-6 flex-col justify-end xl:max-w-7 3xl:max-w-12"
      title={label + ': ' + value}
    >
      {value > 0 && (
        <span
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums text-foreground 3xl:text-xs"
          style={{ bottom: 'calc(' + pct + '% + 2px)' }}
        >
          {value}
        </span>
      )}
      <div
        className={'w-full rounded-t-md ' + (value > 0 ? color : 'bg-border')}
        style={{ height: value > 0 ? pct + '%' : '2px' }}
      />
    </div>
  )
}

function Stat({
  dot,
  label,
  value,
  hint,
}: {
  dot?: string
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {dot && <span className={'h-2 w-2 rounded-full ' + dot} />}
        {label}
      </p>
      <p className="mt-0.5 text-xl font-semibold leading-tight tabular-nums text-foreground 3xl:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

export function WonLostChart({ data, loading }: WonLostChartProps) {
  const locale = useLocale()
  const es = locale === 'es'
  const L = es ? COPY_ES : COPY_EN

  const points = data ?? []
  const max = points.reduce((m, p) => Math.max(m, p.created, p.won, p.lost), 0)
  const totals = points.reduce(
    (a, p) => ({ created: a.created + p.created, won: a.won + p.won, lost: a.lost + p.lost }),
    { created: 0, won: 0, lost: 0 },
  )
  const closed = totals.won + totals.lost
  const closeRate = closed > 0 ? Math.round((totals.won / closed) * 100) : null
  const avgNew = points.length > 0 ? Math.round(totals.created / points.length) : 0
  const best = points.reduce<DealsComparisonPoint | null>(
    (b, p) => (p.won > 0 && (!b || p.won > b.won) ? p : b),
    null,
  )
  const { top, ticks } = niceAxis(max)

  const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(es ? 'es-MX' : 'en-US', { month: 'short' })
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="h-4 w-4 text-primary" /> {L.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {L.description} {'\u00b7'} {L.period}
          </p>
        </div>
        {closeRate !== null && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{L.closeRate}</p>
            <p className="text-lg font-semibold leading-tight text-foreground">{closeRate} %</p>
          </div>
        )}
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-[300px] w-full" />
        ) : max === 0 ? (
          <EmptyState icon={BarChart3} title={L.empty} hint={L.emptyHint} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_17rem] xl:gap-6 3xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Grafica */}
            <div className="min-w-0 overflow-x-auto">
              <div className="min-w-[340px]">
                <div className="flex">
                  {/* Eje Y */}
                  <div className={'relative mt-5 w-8 shrink-0 ' + PLOT_H}>
                    {ticks.map((tick) => (
                      <span
                        key={tick}
                        className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
                        style={{ bottom: (tick / top) * 100 + '%' }}
                      >
                        {tick}
                      </span>
                    ))}
                  </div>

                  {/* Area de barras */}
                  <div className={'relative mt-5 min-w-0 flex-1 ' + PLOT_H}>
                    {ticks.map((tick) => (
                      <div
                        key={tick}
                        className={
                          'absolute inset-x-0 border-t ' +
                          (tick === 0 ? 'border-border' : 'border-dashed border-border/50')
                        }
                        style={{ bottom: (tick / top) * 100 + '%' }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-end">
                      {points.map((p) => (
                        <div
                          key={p.key}
                          className="flex h-full min-w-0 flex-1 items-end justify-center gap-1 rounded-lg transition-colors hover:bg-muted/30 sm:gap-1.5 3xl:gap-2"
                        >
                          <Bar value={p.created} top={top} color="bg-blue-500" label={L.created} />
                          <Bar value={p.won} top={top} color="bg-emerald-500" label={L.won} />
                          <Bar value={p.lost} top={top} color="bg-red-500" label={L.lost} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Meses + tasa de cierre del mes */}
                <div className="flex pl-8">
                  {points.map((p) => {
                    const c = p.won + p.lost
                    const rate = c > 0 ? Math.round((p.won / c) * 100) : null
                    return (
                      <div key={p.key} className="min-w-0 flex-1 pt-2 text-center">
                        <p className="text-xs capitalize text-foreground 3xl:text-sm">{monthLabel(p.key)}</p>
                        <p
                          className="text-[10px] tabular-nums text-muted-foreground"
                          title={L.closeRateMonth}
                        >
                          {rate === null ? '\u2014' : rate + ' %'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Resumen: columna lateral en pantallas grandes, fila debajo en laptop */}
            <div className="grid grid-cols-2 content-start gap-3 sm:grid-cols-4 xl:grid-cols-1">
              <Stat dot="bg-blue-500" label={L.created} value={totals.created} hint={avgNew + ' ' + L.perMonth} />
              <Stat
                dot="bg-emerald-500"
                label={L.won}
                value={totals.won}
                hint={closeRate !== null ? closeRate + ' % ' + L.ofClosed : undefined}
              />
              <Stat dot="bg-red-500" label={L.lost} value={totals.lost} />
              {best && (
                <Stat
                  label={L.bestMonth}
                  value={monthLabel(best.key).replace(/^./, (c) => c.toUpperCase())}
                  hint={best.won + ' ' + L.wonSuffix}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
`;

const rtPath = "src/components/dashboard/response-time-chart.tsx";
save(rtPath, responseTime, load(rtPath).crlf);
console.log("OK", rtPath);

const wlPath = "src/components/dashboard/won-lost-chart.tsx";
save(wlPath, wonLost, load(wlPath).crlf);
console.log("OK", wlPath);

// ---------------------------------------------------------------- 3) Datos: cada respuesta individual (para mediana, percentil 90 y rangos)
const patches = [
  {
    file: "src/lib/dashboard/types.ts",
    edits: [
      [
        `export interface ResponseTimeSummary {
  buckets: ResponseTimeBucket[]
  thisWeekAvg: number | null
  lastWeekAvg: number | null
}`,
        `export interface ResponseTimeSample {
  /** 0 = Mon ... 6 = Sun (Monday-first), day the customer wrote. */
  dow: number
  /** Minutes until the first reply. */
  minutes: number
  /** True when the customer message belongs to the current week. */
  thisWeek: boolean
}

export interface ResponseTimeSummary {
  buckets: ResponseTimeBucket[]
  thisWeekAvg: number | null
  lastWeekAvg: number | null
  /** Every first-response sample of the last 14 days (capped), for median / percentiles. */
  samples?: ResponseTimeSample[]
}`,
      ],
    ],
  },
  {
    file: "src/lib/dashboard/queries.ts",
    edits: [
      [
        `  const lastWeekMins: number[] = []\n`,
        `  const lastWeekMins: number[] = []
  const sampleList: { dow: number; minutes: number; thisWeek: boolean }[] = []\n`,
      ],
      [
        `    byDow.get(dow)!.push(diffMin)\n`,
        `    byDow.get(dow)!.push(diffMin)
    sampleList.push({ dow, minutes: diffMin, thisWeek: s.customerAt >= thisWeekStart })\n`,
      ],
      [
        `    lastWeekAvg: avg(lastWeekMins),\n  }\n}`,
        `    lastWeekAvg: avg(lastWeekMins),
    samples: sampleList.slice(-3000),
  }
}`,
      ],
    ],
  },
];

for (const { file, edits } of patches) {
  const { txt, crlf } = load(file);
  let out = txt;
  for (const [from, to] of edits) {
    if (out.includes(to)) continue; // ya aplicado
    const n = out.split(from).length - 1;
    if (n !== 1) throw new Error(file + ": coincidencias=" + n + " para:\n" + from);
    out = out.replace(from, () => to);
  }
  save(file, out, crlf);
  console.log("OK", file);
}
