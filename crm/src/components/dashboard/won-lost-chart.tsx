"use client"

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
  period: 'Últimos 6 meses',
  perMonth: 'al mes en promedio',
  ofClosed: 'de las cerradas',
  bestMonth: 'Mejor mes',
  wonSuffix: 'ganadas',
  empty: 'Aún no hay oportunidades para comparar',
  emptyHint: 'Cuando crees y cierres oportunidades aparecerán aquí.',
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
            {L.description} {'·'} {L.period}
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
                          {rate === null ? '—' : rate + ' %'}
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
