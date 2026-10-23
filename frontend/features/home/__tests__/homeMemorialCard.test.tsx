Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HomeMemorialCard } from '../components/HomeMemorialCard';
import type { Pet } from '../../../types';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles, hairlineWidth: 1 },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../components/SoftMotion', () => {
  const mockReact = jest.requireActual('react');
  return {
    SoftButton: ({ children, ...props }: { children: unknown }) =>
      mockReact.createElement('Button', props, children),
  };
});

const pet: Pet = {
  id: 'p1',
  userId: 'u1',
  name: '小米',
  species: 'dog',
  gender: 'female',
  neutered: true,
  adoptionDate: '2015-06-01',
  memorial: true,
  passedAwayDate: '2026-10-01',
  memorialNote: '謝謝你',
};

let screen: ReactTestRenderer;
const handlers = {
  onOpenRecords: jest.fn(),
  onOpenPhotos: jest.fn(),
  onOpenWeights: jest.fn(),
  onOpenMemorial: jest.fn(),
};
const mount = async (value: Pet) => {
  await act(async () => {
    screen = create(<HomeMemorialCard pet={value} compact={false} {...handlers} />);
  });
};
const texts = () =>
  screen.root.findAllByType('Text' as never).map((node) => [node.props.children].flat().join(''));
const button = (label: string) =>
  screen.root.find((node) => node.props.accessibilityLabel === label);
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('memorial home shows the period, time together and note instead of add actions', async () => {
  await mount(pet);
  expect(texts()).toEqual(
    expect.arrayContaining([
      '在回憶中',
      '2015/06/01 – 2026/10/01',
      '陪伴了 11 年 4 個月',
      '「謝謝你」',
    ]),
  );
  expect(texts().some((text) => text.includes('新增'))).toBe(false);
});

test('memorial home links back to records, album, weights and the memorial page', async () => {
  await mount(pet);
  button('回顧紀錄').props.onPress();
  button('照護相簿').props.onPress();
  button('體重曲線').props.onPress();
  button('查看紀念頁').props.onPress();
  Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
});

test('an empty memorial note is not shown', async () => {
  await mount({ ...pet, memorialNote: undefined });
  expect(texts().some((text) => text.startsWith('「'))).toBe(false);
});
