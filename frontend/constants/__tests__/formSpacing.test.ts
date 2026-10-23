import { FORM_ACTION_GAP, FORM_FIELD_GAP } from '../FormTokens';
import { vaccinationStyles } from '../../features/vaccinations/vaccinationStyles';
import { dewormingStyles } from '../../features/dewormings/dewormingStyles';
import { medicationStyles } from '../../features/medications/medicationStyles';
import { dailyLogStyles } from '../../features/daily-logs/dailyLogStyles';

jest.mock('react-native', () => ({ StyleSheet: { create: (styles: object) => styles } }));

test('field-to-action and final-submit spacing have separate shared values', () => {
  expect(FORM_FIELD_GAP).toBe(16);
  expect(FORM_ACTION_GAP).toBe(24);
  expect(FORM_ACTION_GAP).toBeGreaterThan(FORM_FIELD_GAP);
});

test.each([
  ['疫苗', vaccinationStyles],
  ['驅蟲', dewormingStyles],
  ['用藥', medicationStyles],
] as const)(
  '%s separates the submit and destructive actions from previous controls',
  (_name, styles) => {
    expect(styles.primary.marginTop).toBe(FORM_ACTION_GAP);
    expect(styles.deleteButton.marginTop).toBe(FORM_FIELD_GAP);
  },
);

test('medication reminder groups and course actions have explicit separation', () => {
  expect(medicationStyles.reminderList.marginTop).toBe(FORM_FIELD_GAP);
  expect(medicationStyles.reminderList.gap).toBeGreaterThanOrEqual(12);
  expect(medicationStyles.secondaryAction.marginTop).toBe(FORM_FIELD_GAP);
});

test('the optional daily photo-adoption button has space above it', () => {
  expect(dailyLogStyles.suggestionAction.marginTop).toBe(FORM_FIELD_GAP);
});
