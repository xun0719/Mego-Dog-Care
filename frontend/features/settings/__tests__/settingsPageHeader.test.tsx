Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SettingsPage } from '../components/SettingsLayout';
import { SettingsPageState } from '../components/SettingsPageHeader';
import { SETTINGS_PAGES, type SettingsPageKey } from '../settingsPages';
import { Colors } from '../../../constants/Colors';
import type { StyleProp, ViewStyle } from 'react-native';

const mockGoBack = jest.fn();
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: mockGoBack }) }));
jest.mock('../../../components/SoftMotion', () => ({ SoftButton: 'SoftButton' }));
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));

let screen: ReactTestRenderer;
const flatten = (value: StyleProp<ViewStyle>): ViewStyle =>
  Array.isArray(value)
    ? Object.assign({}, ...value.filter(Boolean).map(flatten))
    : ((value || {}) as ViewStyle);

beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each(Object.keys(SETTINGS_PAGES) as SettingsPageKey[])(
  '%s uses a single daily-style heading, back action, right icon and scroll clearance',
  async (page) => {
    await act(async () => {
      screen = create(
        <SettingsPage page={page}>
          <>內文</>
        </SettingsPage>,
      );
    });
    const headings = screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
    );
    expect(headings).toHaveLength(1);
    expect(headings[0].props.children).toBe(SETTINGS_PAGES[page].title);
    const back = screen.root.findByType('SoftButton' as never);
    expect(back.props.accessibilityLabel).toBe('返回上一頁');
    expect(flatten(back.props.style)).toMatchObject({ width: 44, height: 44, borderRadius: 14 });
    const icons = screen.root.findAllByType('Icon' as never);
    expect(icons.map((node) => node.props.name)).toEqual([
      'chevron-back',
      SETTINGS_PAGES[page].icon,
    ]);
    expect(icons[1].props.color).toBe(Colors.primaryDecoration);
    const description = screen.root.findAll(
      (node) =>
        node.type === ('Text' as never) && node.props.children === SETTINGS_PAGES[page].description,
    )[0];
    expect(description.props.numberOfLines).toBeUndefined();
    const scroll = screen.root.findByType('ScrollView' as never);
    expect(flatten(scroll.props.contentContainerStyle)).toMatchObject({
      padding: 18,
      paddingBottom: 124,
    });
    expect(scroll.findAllByType('SoftButton' as never)).toHaveLength(1);
    expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
      'top',
      'left',
      'right',
    ]);
    await act(async () => back.props.onPress());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  },
);

test.each(['載入中', '載入失敗', '沒有資料'])(
  'state %s retains the same account name, description, icon and back action',
  async (message) => {
    await act(async () => {
      screen = create(
        <SettingsPageState page="AccountInfo">
          <>{message}</>
        </SettingsPageState>,
      );
    });
    const heading = screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
    );
    expect(heading).toHaveLength(1);
    expect(heading[0].props.children).toBe('我的帳號');
    expect(screen.root.findAllByType('Icon' as never)[1].props.color).toBe(
      Colors.primaryDecoration,
    );
    await act(async () => screen.root.findByType('SoftButton' as never).props.onPress());
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  },
);
