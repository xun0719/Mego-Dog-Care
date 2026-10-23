import { readFileSync } from 'fs';
import { join } from 'path';
import { ATTACHMENT_LIMITS } from '../../constants/Attachments';
import { analyzeHealthTrend, type DailyRecord } from '../healthTrendEngine';

/**
 * 健康觀察門檻的單一來源是 backend/app/core/policy_defaults.json，後端 AI 監測也讀同一份。
 * 前端為了保留中文提示文案而自行維護規則表，因此以本測試比對數值是否一致。
 */
type SharedRule = {
  category: DailyRecord extends never ? never : 'water' | 'food' | 'energy' | 'stool';
  status: string;
  watchDays: number;
  continuedDays: number | null;
};

const DEFAULTS_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'backend',
  'app',
  'core',
  'policy_defaults.json',
);

const shared: { healthTrendRules: SharedRule[] } = JSON.parse(readFileSync(DEFAULTS_PATH, 'utf8'));

const days = (count: number, value: Partial<DailyRecord>): DailyRecord[] =>
  Array.from({ length: count }, (_, index) => ({
    date: `2026-03-${String(20 - index).padStart(2, '0')}`,
    ...value,
  }));

const levelFor = (rule: SharedRule, count: number) => {
  const records = days(count, { [rule.category]: rule.status } as Partial<DailyRecord>);
  const result = analyzeHealthTrend(records, '2026-03-20');
  return result.alerts.find((alert) => alert.category === rule.category)?.level;
};

describe('健康觀察門檻與 policy_defaults.json 一致', () => {
  test('共用檔列出全部八條規則', () => {
    expect(shared.healthTrendRules).toHaveLength(8);
  });

  test.each(shared.healthTrendRules.map((rule) => [`${rule.category}/${rule.status}`, rule]))(
    '%s 在共用檔設定的天數觸發對應級距',
    (_name, rule) => {
      const typed = rule as SharedRule;
      expect(levelFor(typed, typed.watchDays - 1)).toBeUndefined();
      expect(levelFor(typed, typed.watchDays)).toBe('watch');
      if (typed.continuedDays !== null) {
        expect(levelFor(typed, typed.continuedDays)).toBe('continued');
      } else {
        expect(levelFor(typed, typed.watchDays + 3)).toBe('watch');
      }
    },
  );
});

describe('附件張數上限與共用檔一致', () => {
  test('前端常數等於 policy_defaults.json', () => {
    const sharedLimits: Record<string, number> = JSON.parse(
      readFileSync(DEFAULTS_PATH, 'utf8'),
    ).attachmentLimits;
    expect({ ...ATTACHMENT_LIMITS }).toEqual(sharedLimits);
  });
});
