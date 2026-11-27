import { describe, expect, it } from 'vitest'
import { roundPercents } from './percent'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('roundPercents', () => {
  it('suma exactamente 100', () => {
    expect(roundPercents([6, 1, 1])).toEqual([75, 13, 12])
    expect(roundPercents([6, 1, 1, 1])).toEqual([67, 11, 11, 11])
    expect(roundPercents([1, 1, 1])).toEqual([34, 33, 33])
    expect(roundPercents([1, 2])).toEqual([33, 67])
  })

  it('deja en 0 los tramos sin respuestas', () => {
    expect(roundPercents([3, 0, 1])).toEqual([75, 0, 25])
  })

  it('nunca muestra 0 % en un tramo con respuestas', () => {
    const out = roundPercents([998, 1, 1])
    expect(out[1]).toBeGreaterThanOrEqual(1)
    expect(out[2]).toBeGreaterThanOrEqual(1)
    expect(sum(out)).toBe(100)
  })

  it('devuelve ceros si no hay respuestas', () => {
    expect(roundPercents([0, 0])).toEqual([0, 0])
    expect(roundPercents([])).toEqual([])
  })

  it('suma 100 en combinaciones variadas', () => {
    for (let a = 0; a < 8; a++)
      for (let b = 0; b < 8; b++)
        for (let c = 0; c < 8; c++) {
          const counts = [a, b, c, 1]
          const out = roundPercents(counts)
          expect(sum(out)).toBe(100)
          counts.forEach((n, i) => expect(out[i] > 0).toBe(n > 0))
        }
  })
})
