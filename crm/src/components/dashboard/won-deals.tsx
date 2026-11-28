"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { ArrowRight, ChevronDown, Trophy, XCircle } from 'lucide-react'
import type { WonDealsSummary } from '@/lib/dashboard/types'
import { formatCurrency } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

const COPY_ES = {
  viewPipelines: 'Ver embudos',
  tabWon: 'Ganadas',
  tabLost: 'Perdidas',
  vsPrev: 'vs mes anterior',
  one: 'oportunidad',
  many: 'oportunidades',
  noContact: 'Sin contacto',
  showAll: 'Ver historial completo',
  showLess: 'Ver menos',
  limited: 'Mostrando las últimas',
  of: 'de',
  won: {
    title: 'Oportunidades ganadas',
    description: 'Negocios que cerraste con éxito',
    monthValue: 'Ganado este mes',
    total: 'Total histórico',
    average: 'Ticket promedio',
    recent: 'Últimas ganadas',
    empty: 'Aún no hay oportunidades ganadas',
    emptyHint: 'Cuando muevas una oportunidad a Ganada aparecerá aquí.',
  },
  lost: {
    title: 'Oportunidades perdidas',
    description: 'Historial de negocios que no se cerraron',
    monthValue: 'Perdido este mes',
    total: 'Total histórico perdido',
    average: 'Ticket promedio perdido',
    recent: 'Historial de perdidas',
    empty: 'No hay oportunidades perdidas',
    emptyHint: 'Cuando muevas una oportunidad a Perdida aparecerá aquí.',
  },
}

const COPY_EN: typeof COPY_ES = {
  viewPipelines: 'View pipelines',
  tabWon: 'Won',
  tabLost: 'Lost',
  vsPrev: 'vs last month',
  one: 'deal',
  many: 'deals',
  noContact: 'No contact',
  showAll: 'View full history',
  showLess: 'Show less',
  limited: 'Showing the latest',
  of: 'of',
  won: {
    title: 'Won deals',
    description: 'Deals you closed successfully',
    monthValue: 'Won this month',
    total: 'All-time total',
    average: 'Average deal size',
    recent: 'Latest wins',
    empty: 'No won deals yet',
    emptyHint: 'When you move a deal to Won it will show up here.',
  },
  lost: {
    title: 'Lost deals',
    description: 'History of deals that did not close',
    monthValue: 'Lost this month',
    total: 'All-time lost',
    average: 'Average lost deal size',
    recent: 'Lost deals history',
    empty: 'No lost deals',
    emptyHint: 'When you move a deal to Lost it will show up here.',
  },
}

type Mode = 'won' | 'lost'

interface WonDealsProps {
  /** Oportunidades ganadas. */
  data: WonDealsSummary | null
  loading: boolean
  /** Oportunidades perdidas (se ven con el boton Perdidas). */
  lostData?: WonDealsSummary | null
  lostLoading?: boolean
  /** Account default currency for the totals. */
  currency: string
}

const PREVIEW_COUNT = 6

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

export function WonDeals({
  data: wonData,
  loading: wonLoading,
  lostData = null,
  lostLoading = false,
  currency,
}: WonDealsProps) {
  const locale = useLocale()
  const es = locale === 'es'
  const C = es ? COPY_ES : COPY_EN
  const [mode, setMode] = useState<Mode>('won')
  const [expanded, setExpanded] = useState(false)

  const isWon = mode === 'won'
  const L = isWon ? C.won : C.lost
  const data = isWon ? wonData : lostData
  const loading = isWon ? wonLoading : lostLoading
  const Icon = isWon ? Trophy : XCircle

  const hasData = !!data && data.totalCount > 0
  const word = (n: number) => (n === 1 ? C.one : C.many)
  const diff = data ? data.monthCount - data.prevMonthCount : 0
  const average = data && data.totalCount > 0 ? data.totalValue / data.totalCount : 0
  const items = data ? data.recent : []
  const shown = expanded ? items : items.slice(0, PREVIEW_COUNT)
  const hasMore = items.length > PREVIEW_COUNT

  const changeMode = (m: Mode) => {
    setMode(m)
    setExpanded(false)
  }

  return (
    <section
      className={cn(
        'rounded-xl border bg-card',
        isWon ? 'border-border' : 'border-red-500/30',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Icon className={cn('h-4 w-4', isWon ? 'text-amber-400' : 'text-red-400')} /> {L.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{L.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            {(['won', 'lost'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changeMode(m)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  mode === m
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m === 'won' ? C.tabWon : C.tabLost}
              </button>
            ))}
          </div>
          <Link
            href="/pipelines"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {C.viewPipelines} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      <div className="p-5">
        {loading || !data ? (
          <Skeleton className="h-40 w-full" />
        ) : !hasData ? (
          <EmptyState icon={Icon} title={L.empty} hint={L.emptyHint} />
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
                      diff > 0 && (isWon ? 'text-emerald-400' : 'text-red-400'),
                      diff < 0 && (isWon ? 'text-red-400' : 'text-emerald-400'),
                    )}
                  >
                    {(diff > 0 ? '+' : '') + diff} {C.vsPrev}
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

            {/* Ultimas */}
            <div className="min-w-0 lg:col-span-3">
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
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        isWon ? 'bg-amber-400/10 text-amber-400' : 'bg-red-500/10 text-red-400',
                      )}
                    >
                      <Icon className="h-4 w-4" />
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
                        {d.contactName ?? C.noContact} {'\u00b7'} {relativeDay(d.closedAt, es)}
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
                  {expanded ? C.showLess : C.showAll + ' (' + data.totalCount + ')'}
                  <ChevronDown
                    className={cn('h-3 w-3 transition-transform', expanded && 'rotate-180')}
                  />
                </button>
              )}
              {expanded && data.totalCount > items.length && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {C.limited} {items.length} {C.of} {data.totalCount}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}