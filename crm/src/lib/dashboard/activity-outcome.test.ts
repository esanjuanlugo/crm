import { describe, it, expect } from 'vitest';
import { dealOutcomeFromStageKind } from './queries';

describe('dealOutcomeFromStageKind', () => {
  it('marks deals in the Won / Lost system stages', () => {
    expect(dealOutcomeFromStageKind('won')).toBe('won');
    expect(dealOutcomeFromStageKind('lost')).toBe('lost');
  });

  it('returns null for ordinary stages or a missing kind', () => {
    expect(dealOutcomeFromStageKind('open')).toBeNull();
    expect(dealOutcomeFromStageKind(undefined)).toBeNull();
    expect(dealOutcomeFromStageKind(null)).toBeNull();
  });
});
