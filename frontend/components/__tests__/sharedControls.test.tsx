Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MonthPicker from '../MonthPicker';
import FilterChip from '../FilterChip';
import { SelectionChip } from '../SelectionChip';
import { SettingsHomeRow } from '../../features/settings/components/SettingsHomeRows';
jest.mock('react-native', () => ({
  Modal: 'Modal',
  Pressable: 'Button',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'Button',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
  Animated: { Value: class {}, View: 'AnimatedView', spring: () => ({ start: jest.fn() }) },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../AuthenticatedPetAvatar', () => 'Avatar');
let screen: ReactTestRenderer;
const label = (value: string) =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === value,
  );
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('shared month picker selects a stable year-month and closes', async () => {
  const onChange = jest.fn();
  const onClose = jest.fn();
  await act(async () => {
    screen = create(<MonthPicker visible month="2026-10" onChange={onChange} onClose={onClose} />);
  });
  expect(label('選擇 2026 年 10 月').props.accessibilityState.selected).toBe(true);
  await act(async () => label('選擇 2026 年 3 月').props.onPress());
  expect(onChange).toHaveBeenCalledWith('2026-03');
  expect(onClose).toHaveBeenCalledTimes(1);
});
test('shared filter reports its selection and invokes the filter action', async () => {
  const onPress = jest.fn();
  await act(async () => {
    screen = create(<FilterChip label="體重" selected onPress={onPress} />);
  });
  expect(label('體重').props.accessibilityState.selected).toBe(true);
  label('體重').props.onPress();
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('single choices center the label without a reserved one-sided icon', async () => {
  for (const selected of [false, true]) {
    await act(async () => {
      screen = create(<SelectionChip label="飯後" selected={selected} onPress={jest.fn()} />);
    });
    const control = label('飯後');
    expect(control.children).toHaveLength(1);
    expect(control.findByType('Text' as never).props.style[0].textAlign).toBe('center');
    expect(control.props.accessibilityState.selected).toBe(selected);
    await act(async () => screen.unmount());
  }
});
test('multi-select choices keep matching left and right spaces while retaining checked state', async () => {
  const onPress = jest.fn();
  await act(async () => {
    screen = create(<SelectionChip multiple label="日常" selected onPress={onPress} />);
  });
  const control = label('日常');
  const children = control.children as import('react-test-renderer').ReactTestInstance[];
  expect(children[0].props.style.width).toBe(children[2].props.style.width);
  expect(control.props.accessibilityRole).toBe('checkbox');
  expect(control.props.accessibilityState.checked).toBe(true);
  expect(control.findByType('Icon' as never).props.name).toBe('checkmark');
  await act(async () => control.props.onPress());
  expect(onPress).toHaveBeenCalledTimes(1);
});
test('long setting descriptions are rendered without a line truncation limit', async () => {
  await act(async () => {
    screen = create(
      <SettingsHomeRow
        title="手機權限與提醒"
        description="通知、相簿、相機與定位"
        onPress={jest.fn()}
      />,
    );
  });
  const text = screen.root.find(
    (node) => node.type === ('Text' as never) && node.props.children === '通知、相簿、相機與定位',
  );
  expect(text.props.numberOfLines).toBeUndefined();
  expect(label('手機權限與提醒，通知、相簿、相機與定位')).toBeTruthy();
});
