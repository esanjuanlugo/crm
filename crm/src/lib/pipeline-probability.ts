import type { PipelineStage } from "@/types";

/**
 * Probabilidad de cierre de una etapa (se usa para el valor ponderado).
 * Ganada vale 100 % y Perdida 0 % (etapas de sistema, migracion 045).
 * Las etapas normales suben de forma pareja de 10 % (la primera) a 90 %
 * (la ultima antes de Perdida/Ganada). Con 4 normales: 10 %, 37 %,
 * 63 % y 90 %. Una sola etapa normal vale 10 %.
 *
 * Sin etapas de sistema (datos anteriores a la 045) la ultima etapa se
 * trata como Ganada, igual que antes.
 */
export function computeStageProbability(
  stage: Pick<PipelineStage, "id" | "kind">,
  sortedStages: Pick<PipelineStage, "id" | "kind">[],
): number {
  if (stage.kind === "won") return 1;
  if (stage.kind === "lost") return 0;

  const hasSystem = sortedStages.some((s) => s.kind === "won" || s.kind === "lost");
  let open = sortedStages.filter((s) => s.kind !== "won" && s.kind !== "lost");
  if (!hasSystem) {
    if (open.length <= 1) return 1;
    if (open[open.length - 1].id === stage.id) return 1;
    open = open.slice(0, -1);
  }

  const index = open.findIndex((s) => s.id === stage.id);
  if (index < 0) return 0;
  if (open.length <= 1) return 0.1;
  const t = index / (open.length - 1);
  return 0.1 + t * (0.9 - 0.1);
}
