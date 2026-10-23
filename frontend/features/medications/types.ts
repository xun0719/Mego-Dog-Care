/**
 * 用途：用藥功能內部表單型別與預設值。
 * 畫面入口：screens/MedicationFormScreen.tsx
 * API：../../../services/medicationService.ts
 */
import type { MedicationCourse, MedicationMealTiming } from '../../types';
import type { HomeStackParamList } from '../../navigation/types';
import { taipeiDateKey, taipeiDateFromKey } from '../../utils/taipeiDate';

export type MedicationDraft = {
  name: string;
  instructions: string;
  timesPerDay: number;
  startDate: string;
  endDate: string;
  mealTiming: MedicationMealTiming;
  notes: string;
  status: MedicationCourse['status'];
  reminderEnabled: boolean;
  reminderTimes: string[];
  reminderTimeDraft: string;
  medicalVisitId?: string;
  medicalVisitMedicationKey?: string;
  [key: string]: string | number | boolean | string[] | undefined;
};

export const mealTimingLabels: Record<MedicationMealTiming, string> = {
  before_meal: '飯前',
  after_meal: '飯後',
  anytime: '不限',
};

const createBlankMedicationDraft = (): MedicationDraft => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: taipeiDateKey(),
  endDate: '',
  mealTiming: 'anytime',
  notes: '',
  status: 'active',
  reminderEnabled: false,
  reminderTimes: [],
  reminderTimeDraft: '',
});

export const timeValue = (value?: string) => {
  const [hour, minute] = (value || '08:00').split(':').map(Number);
  const time = `${String(Number.isFinite(hour) ? hour : 8).padStart(2, '0')}:${String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')}`;
  return taipeiDateFromKey(taipeiDateKey(), time);
};

export function createMedicationDraft(
  existing?: MedicationCourse,
  duplicate = false,
  source?: NonNullable<HomeStackParamList['MedicationForm']>['sourceVisit'],
): MedicationDraft {
  const blank = createBlankMedicationDraft();
  if (!existing && source) {
    const med = source.medication;
    return {
      ...blank,
      name: med.name,
      instructions: med.instructions,
      timesPerDay: med.timesPerDay,
      startDate: med.startDate || taipeiDateKey(new Date(source.visitedAt)),
      endDate: med.endDate,
      mealTiming:
        med.mealTiming === 'before'
          ? 'before_meal'
          : med.mealTiming === 'after'
            ? 'after_meal'
            : 'anytime',
      notes: med.notes,
      medicalVisitId: source.id,
      medicalVisitMedicationKey: source.sourceMedicationKey,
    };
  }
  if (!existing) return blank;
  if (!duplicate)
    return {
      ...blank,
      ...existing,
      medicalVisitId: existing.medicalVisitId ?? undefined,
      medicalVisitMedicationKey: existing.medicalVisitMedicationKey ?? undefined,
    };
  return {
    ...blank,
    name: existing.name,
    instructions: existing.instructions,
    timesPerDay: existing.timesPerDay,
    mealTiming: existing.mealTiming,
    notes: existing.notes,
  };
}
