import type { DailyLog } from '../../types';
import { taipeiDateKey } from '../../utils/taipeiDate';

export function dailyLogDateLabel(date: string, today = taipeiDateKey()) {
  if (date === today) return '今日';
  const [year, month, day] = date.split('-').map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

export function emptyDailyLog(date: string): Partial<DailyLog> {
  return { localDate: date, loggedAt: new Date(`${date}T12:00:00+08:00`).toISOString() };
}

export function dailyLogSnapshot(draft: Partial<DailyLog>) {
  return JSON.stringify([
    draft.localDate,
    draft.loggedAt,
    draft.waterLevel,
    draft.foodLevel,
    draft.energyLevel,
    draft.stoolLevel,
    draft.notes || '',
  ]);
}

export function shouldAutoApplyStool(current: DailyLog['stoolLevel'] | undefined) {
  return !current;
}
