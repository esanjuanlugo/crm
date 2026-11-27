/**
 * Convierte conteos en porcentajes enteros que suman exactamente 100
 * (metodo del resto mayor). Ademas, todo conteo > 0 recibe al menos 1 %,
 * para que un tramo con respuestas nunca aparezca como "0 %".
 *
 * Ej.: [6, 1, 1, 1] -> [67, 11, 11, 11]; [6, 1, 1] -> [75, 13, 12].
 */
export function roundPercents(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total <= 0) return counts.map(() => 0)

  const exact = counts.map((n) => (n / total) * 100)
  const out = exact.map((x, i) => (counts[i] > 0 ? Math.max(1, Math.floor(x)) : 0))

  let diff = 100 - out.reduce((a, b) => a + b, 0)

  // Reparte lo que falta a los de mayor parte decimal.
  if (diff > 0) {
    const order = exact
      .map((x, i) => ({ i, frac: x - Math.floor(x) }))
      .filter(({ i }) => counts[i] > 0)
      .sort((a, b) => b.frac - a.frac)
    for (let k = 0; diff > 0 && order.length > 0; k = (k + 1) % order.length) {
      out[order[k].i] += 1
      diff -= 1
    }
  }

  // Si el minimo de 1 % se paso de 100, quita a los que mas tienen.
  while (diff < 0) {
    let max = -1
    for (let i = 0; i < out.length; i++) if (out[i] > 1 && (max === -1 || out[i] > out[max])) max = i
    if (max === -1) break
    out[max] -= 1
    diff += 1
  }

  return out
}
