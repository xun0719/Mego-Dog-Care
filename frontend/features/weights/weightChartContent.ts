import type { WeightRecord } from '../../types';
export function weightTimePositions(
  items: Pick<WeightRecord, 'measuredAt'>[],
  width: number,
): number[] {
  const stamps = items.map((item) => new Date(item.measuredAt).getTime());
  const valid = stamps.filter(Number.isFinite);
  const first = Math.min(...valid),
    last = Math.max(...valid);
  return stamps.map((stamp) =>
    !Number.isFinite(stamp) || !valid.length || last === first
      ? width / 2
      : ((stamp - first) / (last - first)) * width,
  );
}
