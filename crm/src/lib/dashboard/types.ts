// Shared result shapes the dashboard components consume. Centralised
// here so each component stays thin and the page-level loader wires
// them up without type gymnastics.

export interface MetricDelta {
  current: number
  previous: number
}

export interface MetricsBundle {
  activeConversations: MetricDelta
  newContactsToday: MetricDelta
  openDealsValue: number
  openDealsCount: number
  messagesSentToday: MetricDelta
}

export interface ConversationsSeriesPoint {
  day: string // YYYY-MM-DD local
  incoming: number
  outgoing: number
}

export interface PipelineStageSlice {
  id: string
  name: string
  color: string
  dealCount: number
  totalValue: number
}

export interface PipelineDonutData {
  stages: PipelineStageSlice[]
  totalValue: number
}

/** Datos de la grafica de un embudo concreto (una entrada por embudo). */
export interface PipelineDonutByPipeline {
  id: string
  name: string
  data: PipelineDonutData
}

export interface ResponseTimeBucket {
  /** 0 = Mon … 6 = Sun (Monday-first). */
  dow: number
  /** Average first-response time in minutes. Null means no samples. */
  avgMinutes: number | null
  samples: number
}

export interface ResponseTimeSample {
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
}

export type ActivityKind =
  | 'message'
  | 'deal'
  | 'broadcast'
  | 'automation'
  | 'contact'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  /** Primary line of text rendered in the feed. Pre-formatted. */
  text: string
  /** ISO timestamp the item happened at, drives relative-time + sort. */
  at: string
  /** Optional deep-link for the whole row (not all items have a target). */
  href?: string
  /** Who or what the row is about (contact name, deal title, broadcast...). */
  actor?: string
  /** What happened to the actor ("envio un mensaje", "paso a Negociacion"...). */
  action?: string
  /** Secondary line: message preview, phone, etc. */
  detail?: string
  /**
   * Solo oportunidades: 'won'/'lost' si esta en la etapa Ganada/Perdida
   * (pipeline_stages.kind, migracion 045); null en etapas normales.
   */
  dealOutcome?: 'won' | 'lost' | null
  /** Solo oportunidades: monto y moneda (para "se gano · MXN 10,000"). */
  dealValue?: number
  dealCurrency?: string | null
}

/** Una oportunidad ganada reciente (para la lista del Panel). */
export interface WonDealItem {
  id: string
  title: string
  value: number
  currency: string | null
  /** Fecha en que se marco como ganada (aprox.: ultima actualizacion). */
  closedAt: string
  contactName: string | null
  /** Nombre del embudo al que pertenece la oportunidad. */
  pipelineName: string | null
}

export interface WonDealsSummary {
  monthCount: number
  monthValue: number
  prevMonthCount: number
  prevMonthValue: number
  totalCount: number
  totalValue: number
  recent: WonDealItem[]
}

/** Un mes del comparativo nuevas / ganadas / perdidas. key = AAAA-MM. */
export interface DealsComparisonPoint {
  key: string
  created: number
  won: number
  lost: number
}
