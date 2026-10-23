import { tonightAt } from '../../constants/Reminders';
import { filterWeightsByPeriod } from '../../features/weights/weightListContent';
import { calculatePetAge } from '../../features/home/homeContent';
import type { WeightRecord } from '../../types';

afterEach(() => jest.useRealTimers());

test('tonight is Taiwan evening, rolling to tomorrow only when that time has passed', () => {
  expect(tonightAt(new Date('2026-10-01T01:00:00Z')).toISOString()).toBe(
    '2026-10-01T12:00:00.000Z',
  );
  expect(tonightAt(new Date('2026-10-01T12:00:00Z')).toISOString()).toBe(
    '2026-10-02T12:00:00.000Z',
  );
});

test('seven-day weight history includes the first day midnight and excludes tomorrow', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-30T16:30:00Z'));
  const items = [
    { id: 'outside', measuredAt: '2026-09-24T15:59:59.999Z' },
    { id: 'first', measuredAt: '2026-09-24T16:00:00Z' },
    { id: 'today', measuredAt: '2026-09-30T16:00:00Z' },
    { id: 'tomorrow', measuredAt: '2026-10-01T16:00:00Z' },
  ] as WeightRecord[];
  expect(filterWeightsByPeriod(items, 7).map(({ id }) => id)).toEqual(['first', 'today']);
  expect(filterWeightsByPeriod(items, 'all')).toEqual(items);
});

test('age advances on the Taiwan birthday, independent of device timezone', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-30T16:00:00Z'));
  expect(calculatePetAge('2025-10-01')).toBe('1 歲');
  expect(calculatePetAge('2025-10-02')).toBe('未滿 1 歲');
});
