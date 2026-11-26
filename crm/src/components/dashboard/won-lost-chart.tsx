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
  period: 'Últimos 6 meses',
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
  period: 'Last 6 months',
  empty: 'No deals to compare yet',
  emptyHint: 'When you create and close deals they will show up here.',
}

interface WonLostChartProps {
  data: DealsComparisonPoint[] | null
  loading: boolean
}

const CHART_HEIGHT = 180

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={'h-2 w-2 rounded-full ' + color} />
      {label}
    </span>
  )
}

function Bar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const h = value > 0 ? Math.max(4, Math.round((value / max) * CHART_HEIGHT)) : 2
  return (
    <div className="flex flex-col items-center justify-end" style={{ height: CHART_HEIGHT + 18 }} title={label + ': ' + value}>
      {value > 0 && (
        <span className="mb-0.5 text-[10px] font-medium tabular-nums text-foreground">{value}</span>
      )}
      <div
        className={'w-3 rounded-t-sm sm:w-5 ' + (value > 0 ? color : 'bg-border')}
        style={{ height: h }}
      />
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
          <Skeleton className="h-[240px] w-full" />
        ) : max === 0 ? (
          <EmptyState icon={BarChart3} title={L.empty} hint={L.emptyHint} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="flex min-w-[360px] gap-2">
                {points.map((p) => (
                  <div key={p.key} className="flex flex-1 flex-col items-center">
                    <div className="flex w-full items-end justify-center gap-1 border-b border-border/60">
                      <Bar value={p.created} max={max} color="bg-blue-500" label={L.created} />
                      <Bar value={p.won} max={max} color="bg-emerald-500" label={L.won} />
                      <Bar value={p.lost} max={max} color="bg-red-500" label={L.lost} />
                    </div>
                    <span className="pt-1.5 text-xs capitalize text-muted-foreground">
                      {monthLabel(p.key)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <Legend color="bg-blue-500" label={L.created + ' (' + totals.created + ')'} />
                <Legend color="bg-emerald-500" label={L.won + ' (' + totals.won + ')'} />
                <Legend color="bg-red-500" label={L.lost + ' (' + totals.lost + ')'} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}