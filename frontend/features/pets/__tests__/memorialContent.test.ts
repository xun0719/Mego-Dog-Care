import {
  companionshipText,
  memorialPeriodText,
  splitPetsByMemorial,
  validateMemorialDate,
} from '../memorialContent';

const pet = { birthDate: '2015-04-02', adoptionDate: '2015-06-01' };

test('memorial date must be on or before today and after birth and arrival', () => {
  expect(validateMemorialDate('2026-10-01', pet, '2026-10-12')).toBeNull();
  expect(validateMemorialDate('2026-10-12', pet, '2026-10-12')).toBeNull();
  expect(validateMemorialDate('2026-10-13', pet, '2026-10-12')).toBe('離開日期不能晚於今天');
  expect(validateMemorialDate('2015-05-01', pet, '2026-10-12')).toBe(
    '離開日期不能早於生日或到家日',
  );
  expect(validateMemorialDate('', pet, '2026-10-12')).toBe('請選擇離開的日期');
  expect(validateMemorialDate('2010-01-01', {}, '2026-10-12')).toBeNull();
});

test('memorial period prefers the arrival date and falls back to the passing date', () => {
  expect(memorialPeriodText({ ...pet, passedAwayDate: '2026-10-01' })).toBe(
    '2015/06/01 – 2026/10/01',
  );
  expect(memorialPeriodText({ passedAwayDate: '2026-10-01' })).toBe('2026/10/01 離開');
  expect(memorialPeriodText(pet)).toBe('');
});

test('companionship counts whole months from arrival', () => {
  expect(companionshipText({ adoptionDate: '2015-06-01', passedAwayDate: '2026-10-01' })).toBe(
    '陪伴了 11 年 4 個月',
  );
  expect(companionshipText({ adoptionDate: '2026-01-15', passedAwayDate: '2026-03-10' })).toBe(
    '陪伴了 1 個月',
  );
  expect(companionshipText({ adoptionDate: '2026-09-20', passedAwayDate: '2026-10-01' })).toBe(
    '陪伴了不到 1 個月',
  );
  expect(companionshipText({ adoptionDate: '2020-01-01' })).toBe('');
});

test('memorial pets are listed after pets still in care', () => {
  const pets = [{ id: 'a', memorial: true }, { id: 'b', memorial: false }, { id: 'c' }];
  const { active, memorial } = splitPetsByMemorial(pets);
  expect(active.map((item) => item.id)).toEqual(['b', 'c']);
  expect(memorial.map((item) => item.id)).toEqual(['a']);
});
