import {
  analyzeHealthTrend as analyze,
  getHealthObservationText,
  DailyRecord,
} from '../healthTrendEngine';

const records = (values: Partial<DailyRecord>[]): DailyRecord[] =>
  values.map((value, index) => ({
    date: `2026-09-${String(20 + index).padStart(2, '0')}`,
    ...value,
  }));

describe('healthTrendEngine', () => {
  test('單日喝水偏少維持穩定', () => {
    expect(analyzeHealthTrend(records([{ water: 'low' }])).overallLevel).toBe('stable');
  });

  test('喝水偏少連續兩天為 watch', () => {
    const result = analyzeHealthTrend(records([{ water: 'low' }, { water: 'low' }]));
    expect(result).toMatchObject({ overallLevel: 'watch', watchCount: 1, continuedCount: 0 });
    expect(getHealthObservationText(result)).toBe('紀錄不足或中斷，請持續記錄；已有 1 項需留意');
  });

  test('喝水偏少連續三天為 continued', () => {
    const result = analyzeHealthTrend(
      records([{ water: 'low' }, { water: 'low' }, { water: 'low' }]),
    );
    expect(result).toMatchObject({ overallLevel: 'continued', watchCount: 0, continuedCount: 1 });
    expect(getHealthObservationText(result)).toContain('紀錄不足或中斷');
  });

  test('便便偏軟連續兩天為 watch', () => {
    expect(analyzeHealthTrend(records([{ stool: 'soft' }, { stool: 'soft' }])).overallLevel).toBe(
      'watch',
    );
  });

  test('單日水狀便為 watch', () => {
    expect(analyzeHealthTrend(records([{ stool: 'watery' }])).overallLevel).toBe('watch');
  });

  test('水狀便連續兩天為 continued', () => {
    expect(
      analyzeHealthTrend(records([{ stool: 'watery' }, { stool: 'watery' }])).overallLevel,
    ).toBe('continued');
  });

  test('喝水偏少與便便偏軟同時 watch 時會計算兩項', () => {
    const result = analyzeHealthTrend(
      records([
        { water: 'low', stool: 'soft' },
        { water: 'low', stool: 'soft' },
      ]),
    );
    expect(result).toMatchObject({ overallLevel: 'watch', watchCount: 2, continuedCount: 0 });
    expect(getHealthObservationText(result)).toBe('紀錄不足或中斷，請持續記錄；已有 2 項需留意');
  });

  test('continued 優先顯示，但仍保留 watch alert', () => {
    const result = analyzeHealthTrend(
      records([
        { water: 'low', stool: 'normal' },
        { water: 'low', stool: 'soft' },
        { water: 'low', stool: 'soft' },
      ]),
    );
    expect(result).toMatchObject({ overallLevel: 'continued', watchCount: 1, continuedCount: 1 });
    expect(getHealthObservationText(result)).toContain('紀錄不足或中斷');
  });

  test('正常值會中斷喝水偏少趨勢', () => {
    const result = analyzeHealthTrend(
      records([{ water: 'low' }, { water: 'normal' }, { water: 'low' }]),
    );
    expect(result).toMatchObject({ overallLevel: 'stable', watchCount: 0, continuedCount: 0 });
  });
});

function analyzeHealthTrend(records: DailyRecord[]) {
  return analyze(records, records.at(-1)?.date ?? '2026-09-20');
}

test('coverage distinguishes empty, stale, interrupted and current normal records', () => {
  const normal = { water: 'normal', food: 'normal', energy: 'normal', stool: 'normal' } as const;
  const states = [
    analyze([], '2026-10-13'),
    analyze([{ date: '2026-10-12', ...normal }], '2026-10-13'),
    analyze(
      [
        { date: '2026-10-10', ...normal },
        { date: '2026-10-13', ...normal },
      ],
      '2026-10-13',
    ),
    analyze([{ date: '2026-10-13', ...normal }], '2026-10-13'),
  ];
  expect(states.map((x) => x.dataStatus)).toEqual(['empty', 'stale', 'insufficient', 'current']);
  expect(new Set(states.map(getHealthObservationText)).size).toBe(4);
  expect(states[1].lastRecordDate).toBe('2026-10-12');
  expect(getHealthObservationText(states[3])).not.toContain('今天狀況穩定');
});
test('today incomplete data is not enough to call stable', () => {
  expect(analyze([{ date: '2026-10-13', water: 'normal' }], '2026-10-13').dataStatus).toBe(
    'insufficient',
  );
});
