import { describe, it, expect } from 'vitest';
import {
  statusForStageKind,
  stageMoveConfirmation,
  sortStages,
  isSystemStage,
} from './stage-status';
import { computeStageProbability } from '../pipeline-probability';
import type { StageKind } from '@/types';

describe('statusForStageKind', () => {
  it('maps each stage kind to its deal status', () => {
    expect(statusForStageKind('won')).toBe('won');
    expect(statusForStageKind('lost')).toBe('lost');
    expect(statusForStageKind('open')).toBe('open');
  });

  it('treats a missing kind as an ordinary stage', () => {
    expect(statusForStageKind(undefined)).toBe('open');
    expect(statusForStageKind(null)).toBe('open');
  });
});

describe('stageMoveConfirmation', () => {
  it('asks to mark as won or lost when entering a system stage', () => {
    expect(stageMoveConfirmation('open', 'won')).toBe('won');
    expect(stageMoveConfirmation('open', 'lost')).toBe('lost');
  });

  it('asks to reopen when leaving a system stage for an ordinary one', () => {
    expect(stageMoveConfirmation('won', 'open')).toBe('reopen');
    expect(stageMoveConfirmation('lost', 'open')).toBe('reopen');
  });

  it('asks again when switching between won and lost', () => {
    expect(stageMoveConfirmation('won', 'lost')).toBe('lost');
    expect(stageMoveConfirmation('lost', 'won')).toBe('won');
  });

  it('does not ask when the status stays the same', () => {
    expect(stageMoveConfirmation('open', 'open')).toBeNull();
    expect(stageMoveConfirmation(undefined, 'open')).toBeNull();
    expect(stageMoveConfirmation('won', 'won')).toBeNull();
  });
});

describe('sortStages', () => {
  const s = (id: string, position: number, kind?: StageKind) => ({
    id,
    position,
    kind,
  });

  it('puts ordinary stages first, then Perdida, then Ganada', () => {
    const sorted = sortStages([
      s('won', 0, 'won'),
      s('b', 2, 'open'),
      s('lost', 1, 'lost'),
      s('a', 5),
    ]);
    expect(sorted.map((x) => x.id)).toEqual(['b', 'a', 'lost', 'won']);
  });

  it('does not mutate the input', () => {
    const input = [s('won', 0, 'won'), s('a', 1, 'open')];
    sortStages(input);
    expect(input[0].id).toBe('won');
  });
});

describe('isSystemStage', () => {
  it('flags only won and lost stages', () => {
    expect(isSystemStage({ kind: 'won' })).toBe(true);
    expect(isSystemStage({ kind: 'lost' })).toBe(true);
    expect(isSystemStage({ kind: 'open' })).toBe(false);
    expect(isSystemStage({})).toBe(false);
    expect(isSystemStage(null)).toBe(false);
  });
});

describe('computeStageProbability', () => {
  const stages = [
    { id: 'a', kind: 'open' as const },
    { id: 'b', kind: 'open' as const },
    { id: 'c', kind: 'open' as const },
    { id: 'd', kind: 'open' as const },
    { id: 'lost', kind: 'lost' as const },
    { id: 'won', kind: 'won' as const },
  ];
  const pct = (id: string) =>
    Math.round(
      computeStageProbability(
        stages.find((x) => x.id === id)!,
        stages
      ) * 100
    );

  it('gives Perdida 0 % and Ganada 100 %', () => {
    expect(pct('lost')).toBe(0);
    expect(pct('won')).toBe(100);
  });

  it('spreads ordinary stages from 10 % to 90 %', () => {
    expect(['a', 'b', 'c', 'd'].map(pct)).toEqual([10, 37, 63, 90]);
  });

  it('keeps the old behaviour without system stages', () => {
    const legacy = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    const p = (id: string) =>
      Math.round(
        computeStageProbability(
          legacy.find((v) => v.id === id)!,
          legacy
        ) * 100
      );
    expect([p('x'), p('y'), p('z')]).toEqual([10, 90, 100]);
  });
});
