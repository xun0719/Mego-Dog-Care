import { Medication } from '../../types';

export const emptyMedication = (): Medication => ({
  name: '',
  instructions: '',
  timesPerDay: 1,
  startDate: '',
  endDate: '',
  mealTiming: 'any',
  notes: '',
});
