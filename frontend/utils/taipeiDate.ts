export const TAIPEI_TIME_ZONE = 'Asia/Taipei';

function partsOf(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

/** Date key for a date selected in the device's calendar UI. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

/** Calendar date as MEGO defines it: Asia/Taipei, independent of device timezone. */
export function taipeiDateKey(date: Date = new Date()): string {
  const parts = partsOf(date, TAIPEI_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Serialize an instant as a stable date-only value represented at Taipei noon. */
export function toTaipeiDateValue(date: Date): string {
  return `${taipeiDateKey(date)}T12:00:00+08:00`;
}

/** Date-only fields are Taiwan dates, never device-local timestamps. */
export function taipeiDateFromKey(key: string, time = '12:00'): Date {
  return new Date(`${key}T${time}:00+08:00`);
}

/** Local Date used ONLY as a wall-clock carrier inside the JavaScript calendar. */
export function taipeiWallDate(value: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TAIPEI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second,
    value.getMilliseconds(),
  );
}

/** UTC components carry Taiwan wall time inside the picker, without device DST. */
export function taipeiPickerValue(value: Date = new Date()): Date {
  return new Date(value.getTime() + 8 * 3600000);
}

export function fromTaipeiPickerValue(value: Date, dateOnly = false): Date {
  const selected = new Date(value);
  if (dateOnly) selected.setUTCHours(0, 0, 0, 0);
  else selected.setUTCSeconds(0, 0);
  return new Date(selected.getTime() - 8 * 3600000);
}

export function formatTaipeiTime(value: string | Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TAIPEI_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value instanceof Date ? value : new Date(value));
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.hour}:${p.minute}`;
}

export function formatTaipeiDateTime(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return (value instanceof Date ? value : new Date(value)).toLocaleString('zh-TW', {
    ...options,
    timeZone: TAIPEI_TIME_ZONE,
  });
}

/** Start of a Taipei calendar day as an absolute timestamp. */
export function taipeiDayStart(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00+08:00`).getTime();
}

export function addDateKeyDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

export function formatTaipeiDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('zh-TW', { ...options, timeZone: TAIPEI_TIME_ZONE });
}
