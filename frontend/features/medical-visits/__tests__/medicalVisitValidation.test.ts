import { firstVisitError, validateMedicalVisit } from '../medicalVisitValidation';
import { emptyMedication } from '../medicalVisitContent';
const valid = {
  reason: '回診',
  visitedAt: new Date('2026-10-03T12:00:00'),
  followUp: null,
  cost: '',
  medications: [],
};
test('valid optional-free forms have no errors', () => {
  expect(validateMedicalVisit(valid)).toEqual({});
  expect(firstVisitError({})).toBeUndefined();
});
test('reports all invalid fields and locates the first visible error', () => {
  const errors = validateMedicalVisit({
    ...valid,
    reason: ' ',
    cost: 'abc',
    followUp: new Date('2026-10-01'),
    medications: [{ ...emptyMedication(), timesPerDay: 0 }],
  });
  expect(errors.reason).toBeTruthy();
  expect(errors.cost).toBeTruthy();
  expect(errors.followUp).toBeTruthy();
  expect(errors.medications?.[0].name).toBeTruthy();
  expect(errors.medications?.[0].timesPerDay).toBeTruthy();
  expect(firstVisitError(errors)).toBe('reason');
});
test.each(['-1', '1.234', '10000001', 'NaN'])('rejects invalid cost %s inline', (cost) => {
  expect(validateMedicalVisit({ ...valid, cost }).cost).toBeTruthy();
});
test('medication dates locate the offending card', () => {
  const medication = {
    ...emptyMedication(),
    name: '藥袋名稱',
    startDate: '2026-10-03',
    endDate: '2026-10-01',
  };
  const errors = validateMedicalVisit({ ...valid, medications: [medication] });
  expect(errors.medications?.[0].endDate).toBeTruthy();
  expect(firstVisitError(errors)).toBe('medication-0');
});
