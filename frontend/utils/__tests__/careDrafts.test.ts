import { toPetFormData } from '../petFormMapping';
import { createMedicationDraft } from '../../features/medications/types';
import { createVaccinationDraft } from '../../features/vaccinations/types';
import { createDewormingDraft } from '../../features/dewormings/types';
import type { PetData, MedicationCourse, Vaccination, Deworming } from '../../types';
test('pet mapping retains identification fields and date names', () => {
  const value = {
    name: 'Kuro',
    birthday: '2020-01-01',
    arrivalDate: '2021-01-01',
    microchipNumber: '12345',
    coatColor: '白色',
    distinctiveFeatures: '左耳黑點',
  } as PetData;
  expect(toPetFormData(value)).toMatchObject({
    birthDate: '2020-01-01',
    adoptionDate: '2021-01-01',
    microchipNumber: '12345',
    coatColor: '白色',
    distinctiveFeatures: '左耳黑點',
  });
});
test('duplicate medication retains instructions but resets completed course and reminders', () => {
  const value = {
    name: '藥品',
    instructions: '依醫囑',
    timesPerDay: 2,
    mealTiming: 'after_meal',
    notes: '備註',
    status: 'completed',
    startDate: '2020-01-01',
    endDate: '2020-01-02',
    reminderTimes: ['09:00'],
    reminderEnabled: true,
    medicalVisitId: 'visit',
  } as MedicationCourse;
  expect(createMedicationDraft(value, true)).toMatchObject({
    name: '藥品',
    instructions: '依醫囑',
    status: 'active',
    endDate: '',
    reminderTimes: [],
    reminderEnabled: false,
  });
  expect(createMedicationDraft(value, true).medicalVisitId).toBeUndefined();
  expect(createMedicationDraft(value, false).status).toBe('completed');
});
test('duplicate vaccines reset dates, attachments and reminders', () => {
  const value = {
    vaccineName: '疫苗',
    hospitalName: '醫院',
    notes: '備註',
    administeredAt: '2020-01-01',
    nextDueAt: '2020-02-01',
    createReminder: true,
    attachmentIds: ['old'],
  } as Vaccination;
  expect(createVaccinationDraft(value, true)).toMatchObject({
    vaccineName: '疫苗',
    nextDueAt: '',
    createReminder: false,
  });
  expect(createVaccinationDraft(value, true).attachmentIds).toBeUndefined();
  expect(createVaccinationDraft(value, true).administeredAt).not.toBe(value.administeredAt);
});
test('duplicate deworming retains product and dosage while clearing schedule', () => {
  const value = {
    type: 'internal',
    productName: '產品',
    dosageText: '依醫囑',
    notes: '',
    administeredAt: '2020-01-01',
    nextDueAt: '2020-02-01',
    createReminder: true,
    attachmentIds: ['old'],
  } as Deworming;
  expect(createDewormingDraft(value, true)).toMatchObject({
    type: 'internal',
    productName: '產品',
    dosageText: '依醫囑',
    nextDueAt: '',
    createReminder: false,
  });
  expect(createDewormingDraft(value, true).attachmentIds).toBeUndefined();
});
