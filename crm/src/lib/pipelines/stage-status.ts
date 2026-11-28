import type { DealStatus, PipelineStage, StageKind } from '@/types';

// ============================================================
// Etapa -> estatus de la oportunidad.
//
// La regla vive en la base de datos (trigger deals_10_status_from_stage,
// migracion 045): la etapa decide el estatus en cada insercion o cambio
// de etapa, venga de donde venga. Estas funciones repiten el mismo
// criterio en el cliente para la actualizacion optimista y para decidir
// cuando pedir confirmacion.
// ============================================================

/** Estatus que corresponde a una etapa segun su tipo. */
export function statusForStageKind(
  kind: StageKind | null | undefined
): DealStatus {
  if (kind === 'won') return 'won';
  if (kind === 'lost') return 'lost';
  return 'open';
}

export type StageMoveConfirmation = 'won' | 'lost' | 'reopen';

/**
 * Si mover una oportunidad de una etapa a otra cambia su estatus, que
 * confirmacion hay que pedir: marcar como ganada, como perdida o
 * reabrirla. `null` cuando el estatus no cambia (abierta -> abierta).
 */
export function stageMoveConfirmation(
  fromKind: StageKind | null | undefined,
  toKind: StageKind | null | undefined
): StageMoveConfirmation | null {
  const from = statusForStageKind(fromKind);
  const to = statusForStageKind(toKind);
  if (from === to) return null;
  if (to === 'won') return 'won';
  if (to === 'lost') return 'lost';
  return 'reopen';
}

const KIND_ORDER: Record<StageKind, number> = { open: 0, lost: 1, won: 2 };

/**
 * Orden de las columnas: etapas normales por posicion, despues Perdida
 * y al final Ganada, aunque las posiciones guardadas esten desordenadas.
 */
export function sortStages<T extends Pick<PipelineStage, 'position' | 'kind'>>(
  stages: T[]
): T[] {
  return [...stages].sort(
    (a, b) =>
      KIND_ORDER[a.kind ?? 'open'] - KIND_ORDER[b.kind ?? 'open'] ||
      a.position - b.position
  );
}

/** Etapa de sistema (Ganada o Perdida): no se borra, mueve ni recolorea. */
export function isSystemStage(
  stage: Pick<PipelineStage, 'kind'> | null | undefined
): boolean {
  return stage?.kind === 'won' || stage?.kind === 'lost';
}
