import type { Medication } from '../../types';

export type VisitErrors = Partial<Record<'visitedAt' | 'reason' | 'followUp' | 'cost', string>> & {
  medications?: Record<number, Partial<Record<'name' | 'timesPerDay' | 'endDate', string>>>;
};

export function validateMedicalVisit(input: {
  reason: string;
  visitedAt: Date;
  followUp: Date | null;
  cost: string;
  medications: Medication[];
}): VisitErrors {
  const errors: VisitErrors = {};
  if (Number.isNaN(input.visitedAt.getTime())) errors.visitedAt = '請選擇有效的就醫日期';
  if (!input.reason.trim()) errors.reason = '請填寫看診原因';
  if (
    input.followUp &&
    (Number.isNaN(input.followUp.getTime()) || input.followUp < input.visitedAt)
  )
    errors.followUp = '回診日期不可早於就醫日期，請重新選擇';
  if (input.cost && (!/^\d+(\.\d{1,2})?$/.test(input.cost) || Number(input.cost) > 10000000))
    errors.cost = '請輸入 0 至 10,000,000 的金額，最多兩位小數';
  input.medications.forEach((med, index) => {
    const fields: NonNullable<VisitErrors['medications']>[number] = {};
    if (!med.name.trim()) fields.name = '請填寫藥品名稱，或移除這筆用藥';
    if (!Number.isInteger(med.timesPerDay) || med.timesPerDay < 1 || med.timesPerDay > 10)
      fields.timesPerDay = '每日次數需為 1 至 10 的整數';
    if (med.startDate && med.endDate && med.endDate < med.startDate)
      fields.endDate = '結束日期不可早於開始日期';
    if (Object.keys(fields).length) {
      errors.medications ??= {};
      errors.medications[index] = fields;
    }
  });
  return errors;
}

/** The same visual order used by the form, including individual medication cards. */
export function firstVisitError(errors: VisitErrors): string | undefined {
  for (const field of ['visitedAt', 'reason', 'followUp', 'cost'] as const)
    if (errors[field]) return field;
  const index = Object.keys(errors.medications || {})[0];
  return index === undefined ? undefined : `medication-${index}`;
}
