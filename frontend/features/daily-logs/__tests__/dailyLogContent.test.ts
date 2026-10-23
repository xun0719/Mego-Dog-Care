import {
  dailyLogDateLabel,
  dailyLogSnapshot,
  emptyDailyLog,
  shouldAutoApplyStool,
} from '../dailyLogContent';
import { taipeiDateKey } from '../../../utils/taipeiDate';
test('backdated drafts retain the requested date and a consistent timestamp', () => {
  const draft = emptyDailyLog('2026-10-03');
  expect(draft.localDate).toBe('2026-10-03');
  expect(taipeiDateKey(new Date(draft.loggedAt!))).toBe('2026-10-03');
});
test('only today is labeled as today', () => {
  expect(dailyLogDateLabel('2026-10-03', '2026-10-12')).toBe('2026 年 10 月 3 日');
  expect(dailyLogDateLabel('2026-10-12', '2026-10-12')).toBe('今日');
});
test('dirty snapshots include editable choices and notes without server metadata', () => {
  const draft = emptyDailyLog('2026-10-03');
  expect(dailyLogSnapshot({ ...draft, notes: '' })).toBe(dailyLogSnapshot(draft));
  expect(dailyLogSnapshot({ ...draft, stoolLevel: 'soft' })).not.toBe(dailyLogSnapshot(draft));
});
test('classification only auto-applies when the owner has not chosen a value', () => {
  expect(shouldAutoApplyStool(undefined)).toBe(true);
  expect(shouldAutoApplyStool('hard')).toBe(false);
});
