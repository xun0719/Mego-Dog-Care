import {
  addDateKeyDays,
  formatTaipeiDate,
  localDateKey,
  taipeiDateKey,
  taipeiDayStart,
  toTaipeiDateValue,
  taipeiDateFromKey,
  taipeiWallDate,
  taipeiPickerValue,
  fromTaipeiPickerValue,
  formatTaipeiTime,
} from '../taipeiDate';

test('Taipei date key changes at the Taiwan calendar-day boundary', () => {
  expect(taipeiDateKey(new Date('2026-09-30T15:59:59.999Z'))).toBe('2026-09-30');
  expect(taipeiDateKey(new Date('2026-09-30T16:00:00.000Z'))).toBe('2026-10-01');
});

test('picker serialization preserves the calendar date and records Taiwan noon', () => {
  const selected = taipeiDateFromKey('2026-09-30');
  expect(localDateKey(taipeiWallDate(selected))).toBe('2026-09-30');
  expect(toTaipeiDateValue(selected)).toBe('2026-09-30T12:00:00+08:00');
});

test('calendar wall-clock conversion preserves Taiwan date and time across device timezones', () => {
  const instant = new Date('2026-09-30T16:30:00.000Z');
  const wall = taipeiWallDate(instant);
  expect(localDateKey(wall)).toBe('2026-10-01');
  expect(wall.getHours()).toBe(0);
  expect(wall.getMinutes()).toBe(30);
  const picker = taipeiPickerValue(instant);
  expect(picker.getUTCDate()).toBe(1);
  expect(picker.getUTCHours()).toBe(0);
  expect(fromTaipeiPickerValue(picker).toISOString()).toBe(instant.toISOString());
  expect(fromTaipeiPickerValue(picker, true).toISOString()).toBe('2026-09-30T16:00:00.000Z');
  expect(formatTaipeiTime(instant)).toBe('00:30');
});

test('picker times are not shifted by a device daylight-saving gap', () => {
  const instant = new Date('2026-03-08T02:30:00+08:00');
  const picker = taipeiPickerValue(instant);
  expect(picker.getUTCHours()).toBe(2);
  expect(picker.getUTCMinutes()).toBe(30);
  expect(fromTaipeiPickerValue(picker)).toEqual(instant);
});

test('date-only birthday values before 2000 remain valid', () => {
  const date = taipeiDateFromKey('1999-03-10');
  expect(taipeiDateKey(date)).toBe('1999-03-10');
  expect(toTaipeiDateValue(date)).toBe('1999-03-10T12:00:00+08:00');
});

test('Taipei day boundaries and calendar arithmetic cross month/year correctly', () => {
  expect(new Date(taipeiDayStart('2026-10-01')).toISOString()).toBe('2026-09-30T16:00:00.000Z');
  expect(addDateKeyDays('2026-12-31', 1)).toBe('2027-01-01');
});

test('formatting uses Taipei date even when the ISO instant is on the previous UTC day', () => {
  expect(formatTaipeiDate('2026-09-30T16:00:00.000Z')).toContain('2026/10/1');
});
