import type { PipelineStage } from "@/types";

/**
 * Probabilidad de cierre de una etapa (se usa para el valor ponderado).
 * La primera etapa vale 10 %, las siguientes suben de forma pareja hasta
 * 90 % en la etapa anterior a la ultima, y la ultima (Ganada) vale 100 %.
 * Con 5 etapas: 10 %, 37 %, 63 %, 90 % y 100 %.
 */
export function computeStageProbability(
  stage: PipelineStage,
  sortedStages: PipelineStage[],
): number {
  const n = sortedStages.length;
  if (n <= 1) return 1;
  const index = sortedStages.findIndex((s) => s.id === stage.id);
  if (index < 0) return 0;
  if (index === n - 1) return 1;
  const slots = n - 1;
  if (slots <= 1) return 0.1;
  const t = index / (slots - 1);
  return 0.1 + t * (0.9 - 0.1);
}
