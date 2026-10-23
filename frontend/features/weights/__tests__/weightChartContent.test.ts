import { weightTimePositions } from '../weightChartContent';
import type { WeightRecord } from '../../../types';
const records = (dates: string[]) => dates.map((measuredAt) => ({ measuredAt }) as WeightRecord);
test('one-day and thirty-day gaps occupy proportional horizontal distances', () => {
  expect(weightTimePositions(records(['2026-01-01', '2026-01-02', '2026-02-01']), 310)).toEqual([
    0, 10, 310,
  ]);
});
test('same-day times remain distinct and identical timestamps share a position', () => {
  expect(
    weightTimePositions(
      records([
        '2026-10-13T08:00:00+08:00',
        '2026-10-13T09:00:00+08:00',
        '2026-10-13T09:00:00+08:00',
        '2026-10-13T10:00:00+08:00',
      ]),
      100,
    ),
  ).toEqual([0, 50, 50, 100]);
});
test('all timestamps equal avoid a zero denominator', () => {
  expect(weightTimePositions(records(['2026-01-01', '2026-01-01']), 100)).toEqual([50, 50]);
});
