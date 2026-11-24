"use client"

import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight, Trophy } from 'lucide-react'
import type { WonDealsSummary } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  title: 'Oportunidades ganadas',
  description: 'Negocios que cerraste con éxito',
  viewPipelines: 'Ver embudos',
  monthValue: 'Ganado este mes',
  total: 'Total histórico',
  average: 'Ticket promedio',
  vsPrev: 'vs mes anterior',
  recent: 'Últimas ganadas',
  empty: 'Aún no hay oportunidades ganadas',
  emptyHint: 'Cuando marques una oportunidad como ganada aparecerá aquí.',
  one: 'oportunidad',
  many: 'oportunidades',
  noContact: 'Sin contacto',
}

const COPY_EN: typeof COPY_ES = {
  title: 'Won deals',
  description: 'Deals you closed successfully',
  viewPipelines: 'View pipelines',
  monthValue: 'Won this month',
  total: 'All-time total',
  average: 'Average deal size',
  vsPrev: 'vs last month',
  recent: 'Latest wins',
  empty: 'No won deals yet',
  emptyHint: 'When you mark a deal as won it will show up here.',
  one: 'deal',
  many: 'deals',
  noContact: 'No contact',
}

interface WonDealsProps {
  data: WonDealsSummary | null
  loading: boolean
  /** Account default currency for the totals. */
  currency: string
}

function relativeDay(iso: string, es: boolean): string {
  const day = new Date(iso)
  day.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diff <= 0) return es ? 'hoy' : 'today'
  if (diff === 1) return es ? 'ayer' : 'yesterday'
  if (diff < 30) return es ? 'hace ' + diff + ' d' : diff + ' d ago'
  return new Date(iso).toLocaleDateString(es ? 'es-MX' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function WonDeals({ data, loading, currency }: WonDealsProps) {
  const locale = useLocale()
  const es = locale === 'es'
  const L = es ? COPY_ES : COPY_EN

  const hasData = !!data && data.totalCount > 0
  const word = (n: number) => (n === 1 ? L.one : L.many)
  const diff = data ? data.monthCount - data.prevMonthCount : 0
  const average = data && data.totalCount > 0 ? data.totalValue / data.totalCount : 0

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-amber-400" /> {L.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{L.description}</p>
        </div>
        <Link
          href="/pipelines"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {L.viewPipelines} <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : !hasData ? (
          <EmptyState icon={Trophy} title={L.empty} hint={L.emptyHint} />
        ) : (
          <div className="grid gap-5 lg:grid-cols-5">
            {/* Cifras */}
            <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2 lg:grid-cols-1">
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{L.monthValue}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(data.monthValue, currency)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                  <span>
                    {data.monthCount} {word(data.monthCount)}
                  </span>
                  <span
                    className={cn(
                      'font-medium',
                      diff > 0 && 'text-emerald-400',
                      diff < 0 && 'text-red-400',
                    )}
                  >
                    {(diff > 0 ? '+' : '') + diff} {L.vsPrev}
                  </span>
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{L.total}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(data.totalValue, currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.totalCount} {word(data.totalCount)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">{L.average}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {formatCurrency(average, currency)}
                </p>
              </div>
            </div>

            {/* Ultimas ganadas */}
            <div className="min-w-0 lg:col-span-3">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {L.recent}
              </h3>
              <ul className="divide-y divide-border/60">
                {data.recent.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.contactName ?? L.noContact} {'\u00b7'} {relativeDay(d.closedAt, es)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(d.value, d.currency || currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
