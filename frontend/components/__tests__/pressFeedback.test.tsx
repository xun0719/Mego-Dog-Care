Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppButton } from '../AppButton';
import { RecordActionButton } from '../RecordActionButton';
import { SoftButton } from '../SoftMotion';
import { SettingsHomeRow } from '../../features/settings/components/SettingsHomeRows';
import { pressFeedbackStyle } from '../../hooks/usePressFeedback';
let mockReduced = false;
let mockListener: (value: boolean) => void;
const mockRemove = jest.fn();
jest.mock('react-native', () => ({
  Pressable: 'Button',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { select: (value: { ios: object }) => value.ios },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(mockReduced),
    addEventListener: (_event: string, callback: typeof mockListener) => {
      mockListener = callback;
      return { remove: mockRemove };
    },
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../AuthenticatedPetAvatar', () => 'Avatar');
const components = [
  ['共用按鈕', <AppButton title="儲存" onPress={jest.fn()} />],
  ['紀錄操作', <RecordActionButton label="編輯" kind="edit" onPress={jest.fn()} />],
  ['設定列', <SettingsHomeRow title="我的毛孩" onPress={jest.fn()} />],
  ['柔和按鈕', <SoftButton onPress={jest.fn()} />],
] as const;
let screen: ReactTestRenderer;
function style() {
  const button = screen.root.findByType('Button' as never);
  const styles =
    typeof button.props.style === 'function'
      ? button.props.style({ pressed: true })
      : button.props.style;
  return Object.assign({}, ...styles.flat().filter(Boolean));
}
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.clearAllMocks();
});
test.each(components)(
  '%s retains opacity feedback without scaling under reduced motion',
  async (_name, element) => {
    mockReduced = true;
    await act(async () => {
      screen = create(element);
    });
    await act(async () => screen.root.findByType('Button' as never).props.onPressIn?.({}));
    expect(style().opacity).toBe(0.82);
    expect(style().transform).toBeUndefined();
  },
);
test.each(components)('%s uses the same normal press scale', async (_name, element) => {
  mockReduced = false;
  await act(async () => {
    screen = create(element);
  });
  await act(async () => screen.root.findByType('Button' as never).props.onPressIn?.({}));
  expect(style().transform).toEqual([{ scale: 0.98 }]);
  expect(style().opacity).toBe(0.82);
});
test('changing the system preference updates feedback and removes the subscription on unmount', async () => {
  mockReduced = false;
  await act(async () => {
    screen = create(<AppButton title="儲存" onPress={jest.fn()} />);
  });
  await act(async () => mockListener(true));
  expect(style().transform).toBeUndefined();
  await act(async () => screen.unmount());
  expect(mockRemove).toHaveBeenCalled();
});
test('disabled and idle controls do not produce press transforms', () => {
  expect(pressFeedbackStyle(true, false, true)).toEqual({});
  expect(pressFeedbackStyle(false, false)).toEqual({});
});
