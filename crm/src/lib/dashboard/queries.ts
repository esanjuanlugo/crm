import type { SupabaseClient } from '@supabase/supabase-js'
import {
  daysAgoStart,
  DOW_SHORT_MON_FIRST,
  lastNDayKeys,
  localDayKey,
  mondayIndex,
  startOfLocalDay,
} from './date-utils'
import type {
  ActivityItem,
  ConversationsSeriesPoint,
  MetricsBundle,
  PipelineDonutByPipeline,
  PipelineDonutData,
  PipelineStageSlice,
  ResponseTimeBucket,
  ResponseTimeSummary,
  WonDealsSummary,
  DealsComparisonPoint,
} from './types'

// ------------------------------------------------------------
// Toda la agregación del lado del cliente. RLS limita cada consulta al
// usuario autenticado automáticamente, por lo que nunca pasamos user_id explícitamente
// aquí. El rendimiento es aceptable para la escala actual (unos pocos miles de
// mensajes); si el conjunto de datos de un tenant supera esta escala, migraríamos las
// agregaciones pesadas a RPC de SQL. Anotado en el PR.
// ------------------------------------------------------------

type DB = SupabaseClient

// --- 1. Tarjetas de métricas --------------------------------------------

export async function loadMetrics(db: DB): Promise<MetricsBundle> {
  const todayStart = startOfLocalDay().toISOString()
  const yesterdayStart = daysAgoStart(1).toISOString()

  const [
    openConvCur,
    newConvToday,
    newConvYesterday,
    newContactsToday,
    newContactsYesterday,
    openDeals,
    messagesToday,
    messagesYesterday,
  ] = await Promise.all([
    db.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('created_at', todayStart),
    db
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
    db.from('contacts').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
    db
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
    db.from('deals').select('value, status').eq('status', 'open'),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .gte('created_at', todayStart),
    db
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_type', 'agent')
      .gte('created_at', yesterdayStart)
      .lt('created_at', todayStart),
  ])

  const openDealsRows = (openDeals.data ?? []) as { value: number | null }[]
  const openDealsValue = openDealsRows.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return {
    activeConversations: {
      current: openConvCur.count ?? 0,
      // "vs. ayer" para un conteo del estado actual no tiene una respuesta clara
      // sin snapshots; mostramos la diferencia en conversaciones NUEVAS abiertas
      // hoy frente a ayer. Esa es la señal diaria relevante para el negocio.
      previous: (newConvToday.count ?? 0) - (newConvYesterday.count ?? 0),
    },
    newContactsToday: {
      current: newContactsToday.count ?? 0,
      previous: newContactsYesterday.count ?? 0,
    },
    openDealsValue,
    openDealsCount: openDealsRows.length,
    messagesSentToday: {
      current: messagesToday.count ?? 0,
      previous: messagesYesterday.count ?? 0,
    },
  }
}

// --- 2. Conversaciones a lo largo del tiempo ----------------------------

export async function loadConversationsSeries(
  db: DB,
  rangeDays: number,
): Promise<ConversationsSeriesPoint[]> {
  const start = daysAgoStart(rangeDays - 1).toISOString()
  const { data, error } = await db
    .from('messages')
    .select('created_at, sender_type')
    .gte('created_at', start)
    .order('created_at', { ascending: true })
  if (error) throw error

  const keys = lastNDayKeys(rangeDays)
  const buckets = new Map<string, { incoming: number; outgoing: number }>()
  for (const k of keys) buckets.set(k, { incoming: 0, outgoing: 0 })

  for (const row of (data ?? []) as { created_at: string; sender_type: string }[]) {
    const key = localDayKey(row.created_at)
    const bucket = buckets.get(key)
    if (!bucket) continue
    if (row.sender_type === 'customer') bucket.incoming += 1
    else bucket.outgoing += 1 // agent + bot both count as outgoing
  }

  return keys.map((day) => ({ day, ...(buckets.get(day) ?? { incoming: 0, outgoing: 0 }) }))
}

// --- 3. Gráfico de anillo del pipeline ----------------------------------

export async function loadPipelineDonut(db: DB): Promise<PipelineDonutData> {
  const [stagesRes, dealsRes] = await Promise.all([
    // '*' (no 'kind') so it still works before migration 045 is applied.
    db.from('pipeline_stages').select('*').order('position'),
    db.from('deals').select('stage_id, value, status').eq('status', 'open'),
  ])

  const stages =
    (stagesRes.data ?? []) as { id: string; name: string; color: string }[]
  const deals = (dealsRes.data ?? []) as { stage_id: string; value: number | null }[]

  const byStage = new Map<string, { count: number; total: number }>()
  for (const d of deals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 }
    row.count += 1
    row.total += d.value ?? 0
    byStage.set(d.stage_id, row)
  }

  const slices: PipelineStageSlice[] = stages
    .map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color || '#64748b',
      dealCount: byStage.get(s.id)?.count ?? 0,
      totalValue: byStage.get(s.id)?.total ?? 0,
    }))
    // Ocultar las etapas vacías del anillo (aunque todavía podríamos mostrarlas en la
    // leyenda si el usuario quisiera un desglose completo; recortarlas mantiene
    // el aspecto visual limpio en el caso habitual).
    .filter((s) => s.totalValue > 0 || s.dealCount > 0)

  return {
    stages: slices,
    totalValue: slices.reduce((sum, s) => sum + s.totalValue, 0),
  }
}

// Igual que loadPipelineDonut pero separado por embudo: cada embudo trae SUS
// etapas (incluidas las vacias, para poder mostrar el embudo completo).
export async function loadPipelineDonuts(db: DB): Promise<PipelineDonutByPipeline[]> {
  const [pipelinesRes, stagesRes, dealsRes] = await Promise.all([
    db.from('pipelines').select('id, name').order('created_at'),
    // '*' (no 'kind') so it still works before migration 045 is applied.
    db.from('pipeline_stages').select('*').order('position'),
    db.from('deals').select('stage_id, value, status').eq('status', 'open'),
  ])

  const pipelines = (pipelinesRes.data ?? []) as { id: string; name: string }[]
  const stages = (stagesRes.data ?? []) as {
    id: string
    name: string
    color: string
    pipeline_id: string
    kind?: string
  }[]
  const deals = (dealsRes.data ?? []) as { stage_id: string; value: number | null }[]

  const byStage = new Map<string, { count: number; total: number }>()
  for (const d of deals) {
    const row = byStage.get(d.stage_id) ?? { count: 0, total: 0 }
    row.count += 1
    row.total += d.value ?? 0
    byStage.set(d.stage_id, row)
  }

  return pipelines.map((p) => {
    const slices: PipelineStageSlice[] = stages
      .filter((s) => s.pipeline_id === p.id)
      // Anillo de oportunidades abiertas: Ganada/Perdida (045) siempre en 0.
      .filter((s) => s.kind !== 'won' && s.kind !== 'lost')
      .map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color || '#64748b',
        dealCount: byStage.get(s.id)?.count ?? 0,
        totalValue: byStage.get(s.id)?.total ?? 0,
      }))
    return {
      id: p.id,
      name: p.name,
      data: {
        stages: slices,
        totalValue: slices.reduce((sum, s) => sum + s.totalValue, 0),
      },
    }
  })
}

// --- 4. Tiempo de respuesta por día de la semana ------------------------

export async function loadResponseTime(db: DB): Promise<ResponseTimeSummary> {
  // Obtener los mensajes de los últimos 14 días de una sola vez y luego recorrer cada
  // conversación para encontrar cada par de "primer mensaje entrante" → "primer
  // mensaje saliente posterior". 14 días nos proporcionan tanto "esta semana" como "la semana pasada"
  // con suficiente solapamiento si el usuario abre el panel tarde un
  // lunes.
  const fourteenDaysAgo = daysAgoStart(13).toISOString()
  const { data, error } = await db
    .from('messages')
    .select('conversation_id, sender_type, content_type, created_at')
    .gte('created_at', fourteenDaysAgo)
    .order('conversation_id', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error

  const rows = (data ?? []) as {
    conversation_id: string
    sender_type: string
    content_type: string | null
    created_at: string
  }[]

  // Agrupar por conversación y emparejar los mensajes de clientes sin respuesta con el
  // siguiente mensaje saliente del agente/bot. Un mismo mensaje del cliente
  // solo puede contabilizarse una vez (evita inflar los promedios si el cliente
  // envía mensajes consecutivos mientras el agente tarda en responder).
  interface Sample {
    customerAt: Date
    responseAt: Date
  }
  const samples: Sample[] = []

  let currentConv = ''
  let pendingCustomer: Date | null = null
  for (const row of rows) {
    if (row.conversation_id !== currentConv) {
      currentConv = row.conversation_id
      pendingCustomer = null
    }
    const ts = new Date(row.created_at)
    if (row.sender_type === 'customer') {
      if (!pendingCustomer) pendingCustomer = ts
    } else if (row.content_type === 'template') {
      // Una plantilla (envio masivo o reenganche fuera de la ventana de
      // 24 h) no es una respuesta al cliente: no genera muestra, pero
      // cierra la espera para no inflar la siguiente respuesta.
      pendingCustomer = null
    } else if (pendingCustomer) {
      samples.push({ customerAt: pendingCustomer, responseAt: ts })
      pendingCustomer = null
    }
  }

  const now = new Date()
  const thisWeekStart = daysAgoStart(mondayIndex(now))
  const lastWeekStart = daysAgoStart(mondayIndex(now) + 7)

  // Agrupar por día de la semana y promediar los datos de ambas semanas
  // para que cada barra tenga más muestras como base. Si un día no tiene muestras
  // avgMinutes permanece como null y el gráfico muestra la barra atenuada.
  const byDow = new Map<number, number[]>()
  for (let i = 0; i < 7; i++) byDow.set(i, [])
  const thisWeekMins: number[] = []
  const lastWeekMins: number[] = []
  const sampleList: { dow: number; dayKey: string; minutes: number; thisWeek: boolean }[] = []

  for (const s of samples) {
    const diffMin = (s.responseAt.getTime() - s.customerAt.getTime()) / 60_000
    if (diffMin < 0) continue
    const dow = mondayIndex(s.customerAt)
    byDow.get(dow)!.push(diffMin)
    sampleList.push({
      dow,
      dayKey: localDayKey(s.customerAt),
      minutes: diffMin,
      thisWeek: s.customerAt >= thisWeekStart,
    })
    if (s.customerAt >= thisWeekStart) {
      thisWeekMins.push(diffMin)
    } else if (s.customerAt >= lastWeekStart && s.customerAt < thisWeekStart) {
      lastWeekMins.push(diffMin)
    }
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length

  const buckets: ResponseTimeBucket[] = Array.from({ length: 7 }, (_, dow) => {
    const samples = byDow.get(dow) ?? []
    return {
      dow,
      avgMinutes: avg(samples),
      samples: samples.length,
    }
  })

  // Evitar advertencias por etiquetas sin usar; mantener los arrays con nombres explícitos
  // para facilitar la lectura anterior.
  void DOW_SHORT_MON_FIRST

  return {
    buckets,
    thisWeekAvg: avg(thisWeekMins),
    lastWeekAvg: avg(lastWeekMins),
    samples: sampleList.slice(-3000),
  }
}

// --- 5. Feed de actividad -----------------------------------------------

/** Resultado de una oportunidad segun el tipo de su etapa (migracion 045). */
export function dealOutcomeFromStageKind(
  kind: string | null | undefined,
): 'won' | 'lost' | null {
  return kind === 'won' || kind === 'lost' ? kind : null
}

export async function loadActivity(db: DB, limit = 20): Promise<ActivityItem[]> {
  // Obtener ~10 de cada fuente (suficiente margen después de ordenar y combinar),
  // y después intercalarlos por marca de tiempo. Los límites individuales por tabla
  // mantienen pequeño el payload; el límite final se aplica después de ordenar.
  const [msgs, contacts, deals, broadcasts, autoLogs] = await Promise.all([
    db
      .from('messages')
      .select('id, content_text, sender_type, created_at, conversation_id, conversations(contact_id, contacts(name, phone))')
      .eq('sender_type', 'customer')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('contacts')
      .select('id, name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
    db
      .from('deals')
      .select('id, title, value, currency, updated_at, stage:pipeline_stages(name, kind)')
      .order('updated_at', { ascending: false })
      .limit(10),
    db
      .from('broadcasts')
      .select('id, name, status, total_recipients, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    db
      .from('automation_logs')
      .select('id, trigger_event, status, created_at, automation:automations(name), contact:contacts(name, phone)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const items: ActivityItem[] = []

  // PostgREST devuelve las selecciones anidadas como arrays por defecto, incluso cuando
  // la clave foránea es 1:1. Normalizamos tomando [0] en cada nivel.
  for (const m of (msgs.data ?? []) as unknown as Array<{
    id: string
    content_text: string | null
    created_at: string
    conversation_id: string
    conversations:
      | { contact_id: string | null; contacts: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null }[]
      | { contact_id: string | null; contacts: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null }
      | null
  }>) {
    const conv = Array.isArray(m.conversations) ? m.conversations[0] : m.conversations
    const contact = Array.isArray(conv?.contacts) ? conv?.contacts[0] : conv?.contacts
    const who = contact?.name || contact?.phone || 'Desconocido'
    items.push({
      id: `msg-${m.id}`,
      kind: 'message',
      text: `Nuevo mensaje de ${who}`,
      actor: who,
      action: 'envió un mensaje',
      detail: m.content_text
        ? m.content_text.replace(/[\n\r\t ]+/g, ' ').trim().slice(0, 140) || undefined
        : undefined,
      at: m.created_at,
      href: `/inbox?c=${m.conversation_id}`,
    })
  }

  for (const c of (contacts.data ?? []) as Array<{ id: string; name: string | null; phone: string; created_at: string }>) {
    items.push({
      id: `contact-${c.id}`,
      kind: 'contact',
      text: `Nuevo contacto: ${c.name || c.phone}`,
      actor: c.name || c.phone,
      action: 'es un contacto nuevo',
      detail: c.name ? c.phone : undefined,
      at: c.created_at,
      href: '/contacts',
    })
  }

  for (const d of (deals.data ?? []) as unknown as Array<{
    id: string
    title: string
    value: number | null
    currency: string | null
    updated_at: string
    stage: { name: string; kind?: string | null }[] | { name: string; kind?: string | null } | null
  }>) {
    const stage = Array.isArray(d.stage) ? d.stage[0] : d.stage
    items.push({
      dealOutcome: dealOutcomeFromStageKind(stage?.kind),
      dealValue: Number(d.value ?? 0),
      dealCurrency: d.currency,
      id: `deal-${d.id}`,
      kind: 'deal',
      text: stage?.name
        ? `Negocio "${d.title}" en ${stage.name}`
        : `Negocio "${d.title}" actualizado`,
      actor: d.title,
      action: stage?.name ? 'está en ' + stage.name : 'se actualizó',
      at: d.updated_at,
      href: '/pipelines',
    })
  }

  for (const b of (broadcasts.data ?? []) as Array<{
    id: string
    name: string
    status: string
    total_recipients: number
    created_at: string
  }>) {
    const label =
      b.status === 'sent'
        ? `enviado a ${b.total_recipients} contactos`
        : `${b.status} (${b.total_recipients} destinatarios)`
    items.push({
      id: `broadcast-${b.id}`,
      kind: 'broadcast',
      text: `Difusión "${b.name}" ${label}`,
      actor: b.name,
      action: label,
      at: b.created_at,
      href: '/broadcasts',
    })
  }

  for (const l of (autoLogs.data ?? []) as unknown as Array<{
    id: string
    trigger_event: string
    status: string
    created_at: string
    automation: { name: string }[] | { name: string } | null
    contact: { name: string | null; phone: string }[] | { name: string | null; phone: string } | null
  }>) {
    const automation = Array.isArray(l.automation) ? l.automation[0] : l.automation
    const contact = Array.isArray(l.contact) ? l.contact[0] : l.contact
    const who = contact?.name || contact?.phone || 'un contacto'
    const autoName = automation?.name || 'Automatización'
    items.push({
      id: `auto-${l.id}`,
      kind: 'automation',
      text: `Automation "${autoName}" ${l.status === 'failed' ? 'falló para' : 'se activó para'} ${who}`,
      actor: autoName,
      action: (l.status === 'failed' ? 'falló para ' : 'se activó para ') + who,
      at: l.created_at,
    })
  }

  return items
    .sort((a, b) => (a.at > b.at ? -1 : a.at < b.at ? 1 : 0))
    .slice(0, limit)
}

// --- Oportunidades ganadas -----------------------------------------------
// La fecha de cierre es closed_at (migracion 044: se marca solo al pasar a
// ganada/perdida). Editar una oportunidad cerrada ya no la mueve de mes.
// Si la migracion aun no se aplico, se usa updated_at como antes; por eso
// se pide '*' en lugar de nombrar la columna.

/** Fecha de cierre de una oportunidad (ver migracion 044). */
export function dealClosedAt(d: {
  closed_at?: string | null
  updated_at?: string | null
  created_at: string
}): string {
  return d.closed_at ?? d.updated_at ?? d.created_at
}

async function loadDealsByStatus(
  db: DB,
  status: 'won' | 'lost',
  recentLimit: number,
): Promise<WonDealsSummary> {
  const [{ data, error }, pipelinesRes] = await Promise.all([
    db
      .from('deals')
      .select('*, contact:contacts(name, phone)')
      .eq('status', status)
      .order('updated_at', { ascending: false })
      .limit(1000),
    db.from('pipelines').select('id, name'),
  ])
  if (error) throw error
  const pipelineNames = new Map(
    ((pipelinesRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]),
  )

  type Row = {
    id: string
    title: string
    value: number | null
    currency: string | null
    pipeline_id: string | null
    created_at: string
    updated_at: string | null
    closed_at?: string | null
    contact: { name: string | null; phone: string | null } | { name: string | null; phone: string | null }[] | null
  }
  // Mas recientes primero por fecha de cierre real.
  const rows = ((data ?? []) as unknown as Row[]).sort(
    (a, b) => new Date(dealClosedAt(b)).getTime() - new Date(dealClosedAt(a)).getTime(),
  )

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  let monthCount = 0
  let monthValue = 0
  let prevMonthCount = 0
  let prevMonthValue = 0
  let totalValue = 0

  const items = rows.map((r) => {
    const closedAt = dealClosedAt(r)
    const value = Number(r.value ?? 0)
    const c = Array.isArray(r.contact) ? r.contact[0] : r.contact
    const when = new Date(closedAt)
    totalValue += value
    if (when >= monthStart) {
      monthCount += 1
      monthValue += value
    } else if (when >= prevMonthStart) {
      prevMonthCount += 1
      prevMonthValue += value
    }
    return {
      id: r.id,
      title: r.title,
      value,
      currency: r.currency,
      closedAt,
      contactName: c?.name || c?.phone || null,
      pipelineName: pipelineNames.get(r.pipeline_id ?? '') ?? null,
    }
  })

  return {
    monthCount,
    monthValue,
    prevMonthCount,
    prevMonthValue,
    totalCount: rows.length,
    totalValue,
    recent: items.slice(0, recentLimit),
  }
}

export function loadWonDeals(db: DB): Promise<WonDealsSummary> {
  return loadDealsByStatus(db, 'won', 50)
}

// Historial de perdidas: las ultimas 50 (el resumen cuenta todas).
export function loadLostDeals(db: DB): Promise<WonDealsSummary> {
  return loadDealsByStatus(db, 'lost', 50)
}

// Comparativo mensual: oportunidades nuevas (por fecha de creacion),
// ganadas y perdidas (por fecha de cierre, como el resto del panel).
export async function loadDealsComparison(
  db: DB,
  months = 6,
): Promise<DealsComparisonPoint[]> {
  const { data, error } = await db
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (error) throw error

  const now = new Date()
  const keyOf = (d: Date) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
  const buckets = new Map<string, DealsComparisonPoint>()
  for (let i = months - 1; i >= 0; i--) {
    const key = keyOf(new Date(now.getFullYear(), now.getMonth() - i, 1))
    buckets.set(key, { key, created: 0, won: 0, lost: 0 })
  }

  const rows = (data ?? []) as {
    status: string | null
    created_at: string
    updated_at: string | null
    closed_at?: string | null
  }[]
  for (const r of rows) {
    const created = buckets.get(keyOf(new Date(r.created_at)))
    if (created) created.created += 1
    if (r.status === 'won' || r.status === 'lost') {
      const closed = buckets.get(keyOf(new Date(dealClosedAt(r))))
      if (closed) {
        if (r.status === 'won') closed.won += 1
        else closed.lost += 1
      }
    }
  }
  return Array.from(buckets.values())
}
