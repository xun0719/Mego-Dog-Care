Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ReminderToggleField } from '../ReminderToggleField';
import { Colors } from '../../constants/Colors';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Switch: 'Switch',
  StyleSheet: { create: (styles: object) => styles },
}));
let screen: ReactTestRenderer;
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each([false, true])(
  'reminder value %s keeps the switch vertically centered and outside the wrapping text',
  async (value) => {
    const onValueChange = jest.fn();
    await act(async () => {
      screen = create(
        <ReminderToggleField
          title="建立 App 內提醒"
          description="手機通知依設定與系統權限排定，可以換行而不擠壓開關。"
          value={value}
          onValueChange={onValueChange}
        />,
      );
    });
    const toggle = screen.root.findByType('Switch' as never);
    expect(toggle.props.value).toBe(value);
    expect(toggle.props.accessibilityState).toEqual({ checked: value, disabled: false });
    expect(toggle.parent?.props.style).toMatchObject({
      minWidth: 56,
      minHeight: 44,
      flexShrink: 0,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    });
    const card = toggle.parent!.parent!;
    expect(card.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ padding: 14, gap: 14, alignItems: 'center', borderWidth: 1 }),
      ]),
    );
    const title = card.findAll(
      (node) => node.type === ('Text' as never) && node.props.children === '建立 App 內提醒',
    )[0];
    expect(title.parent?.props.style).toMatchObject({ flex: 1, minWidth: 0 });
    expect(title.props.style.marginTop).toBeUndefined();
    expect(toggle.parent).not.toBe(title.parent);
    if (value)
      expect(card.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.successSoft })]),
      );
    await act(async () => toggle.props.onValueChange(!value));
    expect(onValueChange).toHaveBeenCalledWith(!value);
  },
);

test('unavailable reminders preserve readable instructions and expose a disabled switch', async () => {
  await act(async () => {
    screen = create(
      <ReminderToggleField
        title="是否建立回診提醒？"
        accessibilityLabel="建立回診 App 內提醒"
        description="請先選擇下次回診日期，才能建立 App 內提醒。"
        value={false}
        disabled
        onValueChange={jest.fn()}
      />,
    );
  });
  const toggle = screen.root.findByType('Switch' as never);
  expect(toggle.props.disabled).toBe(true);
  expect(toggle.props.accessibilityState).toEqual({ checked: false, disabled: true });
  expect(toggle.props.accessibilityHint).toContain('請先選擇下次回診日期');
  expect(toggle.parent?.parent?.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ backgroundColor: Colors.surfaceSoft })]),
  );
});
