import { adjustTimePart, clampDate, dateInRange } from '../datePicker';
const minimum = new Date('2026-10-03T15:00:00');
const maximum = new Date('2026-10-05T10:00:00');
test('opening clamps an initial date into the allowed range', () => {
  expect(clampDate(new Date('2026-10-01'), minimum, maximum)).toEqual(minimum);
  expect(clampDate(new Date('2026-10-06'), minimum, maximum)).toEqual(maximum);
});
test('calendar allows the same day while final datetime checks the time too', () => {
  const noon = new Date('2026-10-03T12:00:00');
  expect(dateInRange(noon, minimum, maximum, true)).toBe(true);
  expect(dateInRange(noon, minimum, maximum)).toBe(false);
  expect(dateInRange(new Date('invalid'), minimum, maximum)).toBe(false);
});
test('minute adjustments use five-minute steps and wrap around', () => {
  expect(adjustTimePart(57, 5, 60)).toBe(2);
  expect(adjustTimePart(2, -5, 60)).toBe(57);
});
