"use client"

import Link from 'next/link'
import { useState } from 'react'
import type { ComponentType } from 'react'
import {
  MessageSquare,
  UserPlus,
  Briefcase,
  Radio,
  Zap,
  Inbox,
  Trophy,
  X,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { ActivityItem, ActivityKind } from '@/lib/dashboard/types'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/currency'
import { WON_BADGE } from './won-deals'
import { EmptyState } from './empty-state'
import { Skeleton } from './skeleton'

interface ActivityFeedProps {
  items: ActivityItem[] | null
  loading: boolean
}

const PAGE_SIZES = [5, 10, 20, 50] as const
type PageSize = (typeof PAGE_SIZES)[number]

interface KindTheme {
  icon: ComponentType<{ className?: string }>
  /** Clases de Tailwind para la insignia redonda y la etiqueta. */
  badge: string
}

const KIND_THEME: Record<ActivityKind, KindTheme> = {
  message: { icon: MessageSquare, badge: 'bg-blue-500/10 text-blue-400' },
  contact: { icon: UserPlus, badge: 'bg-primary/10 text-primary' },
  deal: { icon: Briefcase, badge: 'bg-emerald-500/10 text-emerald-400' },
  // Fucsia: el ambar queda reservado para las ganadas.
  broadcast: { icon: Radio, badge: 'bg-fuchsia-500/10 text-fuchsia-400' },
  automation: { icon: Zap, badge: 'bg-rose-500/10 text-rose-400' },
}

const KIND_ORDER: ActivityKind[] = ['message', 'contact', 'deal', 'broadcast', 'automation']

// Ganada: el mismo dorado con trofeo que "Ultimas ganadas" (WonDeals).
// Perdida: rojo suave, como la etapa Perdida del tablero.
type DealOutcome = 'won' | 'lost'
const OUTCOME_THEME: Record<DealOutcome, KindTheme> = {
  won: { icon: Trophy, badge: WON_BADGE },
  lost: { icon: X, badge: 'bg-red-500/10 text-red-400 light:text-red-600' },
}

/** Filtro: un tipo de actividad, o solo ganadas / solo perdidas. */
type FeedFilter = 'all' | ActivityKind | DealOutcome

const COPY_ES = {
  all: 'Todo',
  today: 'Hoy',
  yesterday: 'Ayer',
  noMatches: 'No hay actividad de este tipo',
  kinds: {
    message: 'Mensaje',
    contact: 'Contacto',
    deal: 'Oportunidad',
    broadcast: 'Difusión',
    automation: 'Automatización',
  } as Record<ActivityKind, string>,
}

const COPY_EN: typeof COPY_ES = {
  all: 'All',
  today: 'Today',
  yesterday: 'Yesterday',
  noMatches: 'No activity of this type',
  kinds: {
    message: 'Message',
    contact: 'Contact',
    deal: 'Deal',
    broadcast: 'Broadcast',
    automation: 'Automation',
  },
}

function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function ActivityFeed({ items, loading }: ActivityFeedProps) {
  const t = useTranslations('Dashboard.activityFeed')
  const locale = useLocale()
  const es = locale === 'es'
  const L = es ? COPY_ES : COPY_EN
  const dateLocale = es ? 'es-MX' : 'en-US'

  // Empieza en 10: en pantallas anchas se reparte en dos columnas de 5.
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [filter, setFilter] = useState<FeedFilter>('all')

  const all = items ?? []
  const counts: Record<ActivityKind, number> = {
    message: 0,
    contact: 0,
    deal: 0,
    broadcast: 0,
    automation: 0,
  }
  const outcomeCounts: Record<DealOutcome, number> = { won: 0, lost: 0 }
  for (const it of all) {
    counts[it.kind] += 1
    if (it.kind === 'deal' && it.dealOutcome) outcomeCounts[it.dealOutcome] += 1
  }
  const presentKinds = KIND_ORDER.filter((k) => counts[k] > 0)
  // Chips Ganadas / Perdidas solo si hay alguna.
  const presentOutcomes = (['won', 'lost'] as const).filter((o) => outcomeCounts[o] > 0)

  const filtered =
    filter === 'all'
      ? all
      : filter === 'won' || filter === 'lost'
        ? all.filter((it) => it.kind === 'deal' && it.dealOutcome === filter)
        : all.filter((it) => it.kind === filter)
  const totalLoaded = filtered.length
  const visible = filtered.slice(0, pageSize)

  // Un tamano de pagina solo sirve si muestra filas que el anterior no muestra.
  const isSizeUseful = (_size: PageSize, i: number) =>
    i === 0 || totalLoaded > PAGE_SIZES[i - 1]

  // Agrupar por dia (la lista ya viene ordenada de mas reciente a mas antigua).
  const now = new Date()
  const todayKey = dayKey(now)
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  const yesterdayKey = dayKey(yest)

  const groups: { key: number; label: string; rows: ActivityItem[] }[] = []
  for (const it of visible) {
    const d = new Date(it.at)
    const key = Number.isNaN(d.getTime()) ? 0 : dayKey(d)
    let g = groups[groups.length - 1]
    if (!g || g.key !== key) {
      g = {
        key,
        label:
          key === todayKey
            ? L.today
            : key === yesterdayKey
              ? L.yesterday
              : key === 0
                ? ''
                : d.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'short' }),
        rows: [],
      }
      groups.push(g)
    }
    g.rows.push(it)
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <span className="truncate">{t('title')}</span>
          {items && items.length > 0 && (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
              {items.length}
            </span>
          )}
        </h2>
        <Link
          href="/inbox"
          className="shrink-0 text-xs font-medium text-primary hover:text-primary/80"
        >
          {t('viewAll')}
        </Link>
      </header>

      {loading || !items ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="p-5">
          <EmptyState
            icon={Inbox}
            title={t('noActivity')}
            hint={t('noActivityHint')}
          />
        </div>
      ) : (
        <>
          {/* Filtros por tipo */}
          {presentKinds.length > 1 && (
            <div className="flex min-w-0 scroll-px-4 gap-1.5 overflow-x-auto border-b border-border px-4 py-3 [scrollbar-width:none] sm:scroll-px-5 sm:px-5 [&::-webkit-scrollbar]:hidden">
              <FilterChip
                active={filter === 'all'}
                onClick={() => setFilter('all')}
                label={L.all}
                count={items.length}
              />
              {presentKinds.map((k) => (
                <FilterChip
                  key={k}
                  active={filter === k}
                  onClick={() => setFilter(k)}
                  label={L.kinds[k]}
                  count={counts[k]}
                />
              ))}
              {presentOutcomes.map((o) => (
                <FilterChip
                  key={o}
                  active={filter === o}
                  onClick={() => setFilter(o)}
                  label={o === 'won' ? t('filterWon') : t('filterLost')}
                  count={outcomeCounts[o]}
                />
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">{L.noMatches}</p>
          ) : (
            <div>
              {groups.map((g) => (
                <div key={g.key}>
                  {g.label && (
                    <div className="flex items-center gap-3 bg-muted/30 px-5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>{g.label}</span>
                      <span className="h-px flex-1 bg-border/60" />
                    </div>
                  )}
                  <ul className="grid grid-cols-1 xl:grid-cols-2 xl:gap-x-6">
                    {g.rows.map((it) => {
                      const outcome = it.kind === 'deal' ? (it.dealOutcome ?? null) : null
                      const theme = outcome ? OUTCOME_THEME[outcome] : KIND_THEME[it.kind]
                      const Icon = theme.icon
                      const label = outcome
                        ? outcome === 'won'
                          ? t('won')
                          : t('lost')
                        : L.kinds[it.kind]
                      // Ganada/Perdida: "se gano · MXN 10,000" en lugar de "esta en Ganada".
                      const action = outcome
                        ? t(outcome === 'won' ? 'dealWon' : 'dealLost', {
                            amount: formatCurrency(it.dealValue ?? 0, it.dealCurrency || undefined),
                          })
                        : it.action
                      const exact = new Date(it.at).toLocaleString(dateLocale)
                      const row = (
                        <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
                          <span
                            className={cn(
                              'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
                              theme.badge,
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground">
                              {it.actor && action ? (
                                <>
                                  <span className="font-medium">{it.actor}</span>{' '}
                                  <span className="text-muted-foreground">{action}</span>
                                </>
                              ) : (
                                it.text
                              )}
                            </p>
                            {it.detail && (
                              <p className="truncate text-xs text-muted-foreground">{it.detail}</p>
                            )}
                            {/* Celular: etiqueta y hora debajo del texto */}
                            <div className="mt-1 flex items-center gap-2 md:hidden">
                              <span
                                className={cn(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                  theme.badge,
                                )}
                              >
                                {label}
                              </span>
                              <span
                                className="truncate whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
                                title={exact}
                              >
                                {relativeTime(it.at, t)}
                              </span>
                            </div>
                          </div>
                          <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
                            <span
                              className={cn(
                                'hidden rounded-full px-2 py-0.5 text-[10px] font-medium md:inline',
                                theme.badge,
                              )}
                            >
                              {label}
                            </span>
                            {/* Siempre en una linea ("hace 42 min" no se parte) */}
                            <span
                              className="min-w-16 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground"
                              title={exact}
                            >
                              {relativeTime(it.at, t)}
                            </span>
                          </div>
                        </div>
                      )
                      return (
                        <li
                          key={it.id}
                          className="min-w-0 border-b border-border/50 transition-colors hover:bg-muted/40"
                        >
                          {it.href ? (
                            <Link href={it.href} className="block">
                              {row}
                            </Link>
                          ) : (
                            row
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-4 py-3 text-xs sm:px-5">
            <span className="min-w-0 text-muted-foreground tabular-nums">
              {t('showingOf', {
                visible: visible.length,
                totalLoaded,
                plus: filter === 'all' && totalLoaded === 50 ? '+' : '',
              })}
            </span>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-muted-foreground">{t('show')}</span>
              {PAGE_SIZES.map((size, i) => {
                const disabled = !isSizeUseful(size, i)
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setPageSize(size)}
                    disabled={disabled}
                    className={cn(
                      'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md px-2 py-1 font-medium tabular-nums transition-colors sm:min-h-0 sm:min-w-0',
                      pageSize === size
                        ? 'bg-secondary text-secondary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground',
                    )}
                  >
                    {size}
                  </button>
                )
              })}
            </div>
          </footer>
        </>
      )}
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  )
}

function relativeTime(iso: string, t: ReturnType<typeof useTranslations>): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return t('timeS', { sec: Math.max(1, diffSec) })
  if (diffSec < 3600) return t('timeM', { min: Math.floor(diffSec / 60) })
  if (diffSec < 86400) return t('timeH', { hr: Math.floor(diffSec / 3600) })
  if (diffSec < 2_592_000) return t('timeD', { day: Math.floor(diffSec / 86400) })
  return new Date(iso).toLocaleDateString()
}
