Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ScreenPageHeader, ScreenPageState } from '../ScreenPageHeader';
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Pressable: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('page header exposes a labeled 44-unit back button and delegates navigation', async () => {
  await act(async () => {
    screen = create(<ScreenPageHeader title="就醫紀錄" />);
  });
  const back = screen.root.findByType('Button' as never);
  expect(back.props.accessibilityRole).toBe('button');
  expect(back.props.accessibilityLabel).toBe('返回上一頁');
  const style =
    typeof back.props.style === 'function'
      ? back.props.style({ pressed: false })
      : back.props.style;
  expect(style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: expect.any(String),
      }),
    ]),
  );
  await act(async () => back.props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});
test('the shared header keeps readable, untruncated copy between the back button and optional icon', async () => {
  await act(async () => {
    screen = create(
      <ScreenPageHeader title="疫苗紀錄" description="查看接種與下次日期" icon="medkit-outline" />,
    );
  });
  const description = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.children === '查看接種與下次日期',
  )[0];
  expect(description.props.numberOfLines).toBeUndefined();
  expect(description.props.ellipsizeMode).toBeUndefined();
  expect(description.props.style.lineHeight).toBeGreaterThan(description.props.style.fontSize);
  const header = screen.root.findAllByType('View' as never)[0];
  expect(header.children).toHaveLength(3);
  expect(screen.root.findAllByType('Icon' as never).map((node) => node.props.name)).toEqual([
    'chevron-back',
    'medkit-outline',
  ]);
});
test('the category icon is optional', async () => {
  await act(async () => {
    screen = create(<ScreenPageHeader title="提醒" />);
  });
  expect(screen.root.findAllByType('Icon' as never)).toHaveLength(1);
});
test('custom back copy and handler preserve the same shared back-button presentation', async () => {
  const onBack = jest.fn();
  await act(async () => {
    screen = create(
      <ScreenPageHeader title="選擇動物醫院" backLabel="返回就醫紀錄表單" onBack={onBack} />,
    );
  });
  const back = screen.root.findByType('Button' as never);
  expect(back.props.accessibilityLabel).toBe('返回就醫紀錄表單');
  await act(async () => back.props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(mockGoBack).not.toHaveBeenCalled();
});
test('a root-mode heading has no unnecessary back control', async () => {
  await act(async () => {
    screen = create(<ScreenPageHeader title="就醫地圖" showBack={false} />);
  });
  expect(screen.root.findAllByType('Button' as never)).toHaveLength(0);
});
test.each(['載入中', '載入失敗', '找不到紀錄'])(
  'state %s retains top safe area and visible back action',
  async (state) => {
    await act(async () => {
      screen = create(
        <ScreenPageState title="疫苗紀錄">
          <>{state}</>
        </ScreenPageState>,
      );
    });
    expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
      'top',
      'left',
      'right',
    ]);
    await act(async () => screen.root.findByType('Button' as never).props.onPress());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  },
);
