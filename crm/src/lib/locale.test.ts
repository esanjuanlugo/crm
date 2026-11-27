import { describe, it, expect } from 'vitest';
import { intlLocale } from './locale';
import { dealClosedAt } from './dashboard/queries';

describe('intlLocale', () => {
  it('maps app locales to Intl tags', () => {
    expect(intlLocale('es')).toBe('es-419');
    expect(intlLocale('en')).toBe('en-US');
    expect(intlLocale('ko')).toBe('ko-KR');
    expect(intlLocale('es_MX')).toBe('es-419');
  });

  it('passes unknown locales through', () => {
    expect(intlLocale('fr-FR')).toBe('fr-FR');
  });

  it('formats money like the current UI in Spanish', () => {
    const f = (v: number) =>
      new Intl.NumberFormat(intlLocale('es'), {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      })
        .format(v)
        .replace(/\s/g, ' '); // Intl uses a non-breaking space
    expect(f(930000)).toBe('MXN 930,000');
    expect(f(9000)).toBe('MXN 9,000');
  });
});

describe('dealClosedAt', () => {
  it('prefers closed_at over the last edit', () => {
    expect(
      dealClosedAt({
        closed_at: '2026-01-10T00:00:00Z',
        updated_at: '2026-11-27T00:00:00Z',
        created_at: '2025-12-01T00:00:00Z',
      })
    ).toBe('2026-01-10T00:00:00Z');
  });

  it('falls back to updated_at, then created_at', () => {
    expect(
      dealClosedAt({ updated_at: '2026-02-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z' })
    ).toBe('2026-02-01T00:00:00Z');
    expect(dealClosedAt({ closed_at: null, created_at: '2026-01-01T00:00:00Z' })).toBe(
      '2026-01-01T00:00:00Z'
    );
  });
});
