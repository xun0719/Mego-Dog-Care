Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SelectionChip } from '../../../components/SelectionChip';
import { QuickOptionGroup, MultiSelectOptionGroup } from '../../../components/QuickHealthFields';
import { HealthEventOptionGroup, HealthEventToggle } from '../components/HealthEventOptions';
import { CreateHealthEventChoiceField } from '../components/CreateHealthEventChoices';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
const mount = async (element: React.ReactElement) => {
  await act(async () => {
    screen = create(element);
  });
};
const control = (label: string) =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === label,
  );
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each([HealthEventOptionGroup, QuickOptionGroup])(
  'single-choice adapters preserve values and announce a single selection: %p',
  async (Component) => {
    const change = jest.fn();
    await mount(
      <Component
        options={[
          ['normal', '正常'],
          ['soft', '偏軟'],
        ]}
        value="normal"
        onChange={change}
      />,
    );
    expect(control('正常').props.accessibilityRole).toBe('radio');
    expect(control('正常').props.accessibilityState).toMatchObject({
      selected: true,
      checked: true,
    });
    expect(control('偏軟').props.accessibilityState.checked).toBe(false);
    await act(async () => control('偏軟').props.onPress());
    expect(change).toHaveBeenCalledWith('soft');
    expect(
      screen.root.findAllByType(SelectionChip).every((node) => node.props.size === 'form'),
    ).toBe(true);
  },
);

test('standalone symptom toggles are checkboxes rather than radios', async () => {
  const press = jest.fn();
  await mount(<HealthEventToggle text="黏液" active onPress={press} />);
  expect(control('黏液').props.accessibilityRole).toBe('checkbox');
  expect(control('黏液').props.accessibilityState.checked).toBe(true);
  await act(async () => control('黏液').props.onPress());
  expect(press).toHaveBeenCalledTimes(1);
});

test('multiple-choice adapters add and remove only the pressed value', async () => {
  const change = jest.fn();
  const options: [string, string][] = [
    ['mucus', '黏液'],
    ['blood', '疑似血液'],
  ];
  await mount(<MultiSelectOptionGroup options={options} values={['mucus']} onChange={change} />);
  expect(control('疑似血液').props.accessibilityRole).toBe('checkbox');
  await act(async () => control('疑似血液').props.onPress());
  expect(change).toHaveBeenLastCalledWith(['mucus', 'blood']);
  await act(async () =>
    screen.update(
      <MultiSelectOptionGroup options={options} values={['mucus', 'blood']} onChange={change} />,
    ),
  );
  expect(control('疑似血液').props.accessibilityState.checked).toBe(true);
  await act(async () => control('黏液').props.onPress());
  expect(change).toHaveBeenLastCalledWith(['blood']);
});

test('generic health questions retain their string payload and named group', async () => {
  const change = jest.fn();
  await mount(
    <CreateHealthEventChoiceField
      label="觀察位置"
      values={['左眼', '右眼']}
      value="左眼"
      onChange={change}
    />,
  );
  expect(
    screen.root.findByProps({ accessibilityRole: 'radiogroup' }).props.accessibilityLabel,
  ).toBe('觀察位置');
  await act(async () => control('右眼').props.onPress());
  expect(change).toHaveBeenCalledWith('右眼');
});

test('long form labels can wrap inside the available width without clipping or a fixed height', async () => {
  await mount(
    <SelectionChip
      size="form"
      label="這是一段比較長、需要換行顯示的選項說明"
      selected
      onPress={jest.fn()}
    />,
  );
  const button = control('這是一段比較長、需要換行顯示的選項說明');
  const style = Object.assign({}, ...button.props.style.filter(Boolean));
  expect(style).toMatchObject({ minHeight: 48, maxWidth: '100%' });
  expect(style.height).toBeUndefined();
  const text = button.findByType('Text' as never);
  expect(text.props.numberOfLines).toBeUndefined();
  expect(text.props.style[0]).toMatchObject({ textAlign: 'center', flexShrink: 1 });
});
