/** 用途：回憶模式的日期檢查與顯示文字，和畫面分開以便測試。 */
import type { Pet } from '../../types';

export const MEMORIAL_NOTE_MAX = 300;

/** 設定前依「保留／停止」分組；二次確認沿用相同內容。 */
export const MEMORIAL_EFFECT_GROUPS = [
  {
    title: '會保留',
    icon: 'heart-outline',
    items: ['所有紀錄、照片和體重曲線都會保留，可以隨時回來看。'],
  },
  {
    title: '會停止',
    icon: 'pause-circle-outline',
    items: [
      '不能再新增日常、健康、體重、疫苗、驅蟲、用藥、就醫紀錄和提醒。',
      '還沒完成的提醒會停止，手機也不會再跳出通知。',
      '毛孩身分 QR 的公開頁面會關閉。',
    ],
  },
] as const;

export const MEMORIAL_EFFECTS = MEMORIAL_EFFECT_GROUPS.flatMap((group) => [...group.items]);

const displayDate = (value?: string) => (value ? value.replace(/-/g, '/') : '');

/** 離開日期必須是今天以前，而且不能早於生日或到家日。 */
export function validateMemorialDate(
  dateKey: string,
  pet: Pick<Pet, 'birthDate' | 'adoptionDate'>,
  todayKey: string,
): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '請選擇離開的日期';
  if (dateKey > todayKey) return '離開日期不能晚於今天';
  const earliest = [pet.birthDate, pet.adoptionDate].filter(Boolean).sort().pop();
  if (earliest && dateKey < earliest) return '離開日期不能早於生日或到家日';
  return null;
}

/** 例如「2015/06/01 – 2026/10/01」；沒有到家日時改用生日。 */
export function memorialPeriodText(
  pet: Pick<Pet, 'birthDate' | 'adoptionDate' | 'passedAwayDate'>,
) {
  const start = pet.adoptionDate || pet.birthDate;
  if (!pet.passedAwayDate) return '';
  return start
    ? `${displayDate(start)} – ${displayDate(pet.passedAwayDate)}`
    : `${displayDate(pet.passedAwayDate)} 離開`;
}

/** 依到家日計算陪伴的時間，例如「陪伴了 11 年 4 個月」。 */
export function companionshipText(pet: Pick<Pet, 'adoptionDate' | 'passedAwayDate'>) {
  if (!pet.adoptionDate || !pet.passedAwayDate) return '';
  const [fromYear, fromMonth, fromDay] = pet.adoptionDate.split('-').map(Number);
  const [toYear, toMonth, toDay] = pet.passedAwayDate.split('-').map(Number);
  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth);
  if (toDay < fromDay) months -= 1;
  if (months < 0) return '';
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0 && rest === 0) return '陪伴了不到 1 個月';
  return `陪伴了${years ? ` ${years} 年` : ''}${rest ? ` ${rest} 個月` : ''}`;
}

/** 回憶中的毛孩排在清單後面，照顧中的毛孩維持原本順序。 */
export function splitPetsByMemorial<T extends Pick<Pet, 'memorial'>>(pets: T[]) {
  return {
    active: pets.filter((pet) => !pet.memorial),
    memorial: pets.filter((pet) => pet.memorial),
  };
}
