"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight, ChevronDown, XCircle } from 'lucide-react'
import type { WonDealsSummary } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  title: 'Oportunidades perdidas',
  description: 'Historial de negocios que no se cerraron',
  viewPipelines: 'Ver embudos',
  monthValue: 'Perdido este mes',
  total: 'Total histórico perdido',
  average: 'Ticket promedio perdido',
  vsPrev: 'vs mes anterior',
  recent: 'Historial de perdidas',
  showAll: 'Ver historial completo',
  showLess: 'Ver menos',
  limited: 'Mostrando las últimas',
  of: 'de',
  empty: 'No hay oportunidades perdidas',
  emptyHint: 'Cuando marques una oportunidad como perdida aparecerá aquí.',
  one: 'oportunidad',
  many: 'oportunidades',
  noContact: 'Sin contacto',
}

const COPY_EN: typeof COPY_ES = {
  title: 'Lost deals',
  description: 'History of deals that did not close',
  viewPipelines: 'View pipelines',
  monthValue: 'Lost this month',
  total: 'All-time lost',
  average: 'Average lost deal size',
  vsPrev: 'vs last month',
  recent: 'Lost deals history',
  showAll: 'View full history',
  showLess: 'Show less',
  limited: 'Showing the latest',
  of: 'of',
  empty: 'No lost deals',
  emptyHint: 'When you mark a deal as lost it will show up here.',
  one: 'deal',
  many: 'deals',
  noContact: 'No contact',
}

interface LostDealsProps {
  data: WonDealsSummary | null
  loading: boolean
  /** Account default currency for the totals. */
  currency: string
}

const PREVIEW_COUNT = 5

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

export function LostDeals({ data, loading, currency }: LostDealsProps) {
  const locale = useLocale()
  const es = locale === 'es'
  const L = es ? COPY_ES : COPY_EN
  const [expanded, setExpanded] = useState(false)

  const hasData = !!data && data.totalCount > 0
  const word = (n: number) => (n === 1 ? L.one : L.many)
  const diff = data ? data.monthCount - data.prevMonthCount : 0
  const average = data && data.totalCount > 0 ? data.totalValue / data.totalCount : 0
  const items = data ? data.recent : []
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT)
  const hasMore = items.length > PREVIEW_COUNT

  return (
    <section className="rounded-xl border border-red-500/30 bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <XCircle className="h-4 w-4 text-red-400" /> {L.title}
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
          <EmptyState icon={XCircle} title={L.empty} hint={L.emptyHint} />
        ) : (
          <div className="space-y-5">
            {/* Cifras */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
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
                      diff > 0 && 'text-red-400',
                      diff < 0 && 'text-emerald-400',
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

            {/* Historial */}
            <div className="min-w-0">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {L.recent}
              </h3>
              <ul
                className={cn(
                  'divide-y divide-border/60',
                  expanded && 'max-h-96 overflow-y-auto pr-1',
                )}
              >
                {shown.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                      <XCircle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{d.title}</p>
                        {d.pipelineName && (
                          <span className="max-w-[45%] shrink-0 truncate rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {d.pipelineName}
                          </span>
                        )}
                      </div>
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

              {hasMore && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {expanded ? L.showLess : L.showAll + ' (' + data.totalCount + ')'}
                  <ChevronDown
                    className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
                  />
                </button>
              )}
              {expanded && data.totalCount > items.length && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {L.limited} {items.length} {L.of} {data.totalCount}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}