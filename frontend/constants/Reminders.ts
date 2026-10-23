/** 用途：集中提醒畫面的週期選項與「今晚」時間規則。 */
import { RecurrenceRule, ReminderType } from '../types';
import { addDateKeyDays, taipeiDateKey, taipeiDateFromKey } from '../utils/taipeiDate';

export const REMINDER_TYPES: Array<[ReminderType, string, RecurrenceRule]> = [
  ['vaccine', '疫苗', 'yearly'],
  ['deworming', '驅蟲', 'quarterly'],
  ['medication', '用藥', 'none'],
  ['follow_up', '回診', 'none'],
  ['other', '其他', 'none'],
];
export const RECURRENCE_RULES: Array<[RecurrenceRule, string]> = [
  ['none', '不重複'],
  ['daily', '每天'],
  ['weekly', '每週'],
  ['monthly', '每月'],
  ['quarterly', '每 3 個月'],
  ['half_yearly', '每半年'],
  ['yearly', '每年'],
];

export function tonightAt(now = new Date(), value = '20:00') {
  const today = taipeiDateKey(now);
  const date = taipeiDateFromKey(today, value);
  return date.getTime() <= now.getTime()
    ? taipeiDateFromKey(addDateKeyDays(today, 1), value)
    : date;
}
