Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import StoolHealthEventScreen from '../StoolHealthEventScreen';
import * as service from '../../services/healthEventService';

/**
 * 選項式欄位的錯誤顯示路徑和文字欄位不同（OptionGroup 而非 TextInput），
 * 因此另外覆蓋：未選必填選項時要顯示欄位錯誤、不呼叫 Alert、不送出。
 */
const mockScrollTo = jest.fn();
const mockPet = { id: 'p1', name: '小米', memorial: false };
const mockNavigation = { replace: jest.fn(), popToTop: jest.fn(), goBack: jest.fn() };

jest.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: undefined, addEventListener: undefined },
  Alert: { alert: jest.fn() },
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => undefined,
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
  usePreventRemove: jest.fn(),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../components/SoftMotion', () => ({ SoftButton: 'Button' }));
jest.mock('../../hooks/useFormPet', () => ({ useFormPet: () => mockPet }));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/AttachmentPicker', () => 'Attachments');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/KeyboardAwareScrollView', () => {
  const react = jest.requireActual('react');
  return react.forwardRef((props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
    react.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return react.createElement('ScrollView', props, props.children);
  });
});
jest.mock('../../services/healthEventService', () => ({
  createHealthEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
  getHealthEvent: jest.fn(),
  updateHealthEvent: jest.fn(),
}));
jest.mock('../../utils/quickRecordFeedback', () => ({ showQuickRecordFeedback: jest.fn() }));

let screen: ReactTestRenderer;
const submit = () => screen.root.findByType('AppButton' as never).props.onPress();
const alerts = () =>
  screen.root
    .findAll((node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert')
    .map((node) => node.props.children);
/** OptionGroup 的選項是 accessibilityRole="radio" 的按鈕。 */
const option = (label: string) =>
  screen.root.find(
    (node) =>
      node.type === ('Button' as never) &&
      node.props.accessibilityRole === 'radio' &&
      node.props.accessibilityLabel === label,
  );

beforeEach(() => {
  jest.clearAllMocks();
  global.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
async function mount() {
  await act(async () => {
    screen = create(
      <StoolHealthEventScreen
        navigation={mockNavigation as never}
        route={{ params: {} } as never}
      />,
    );
  });
}

test('unselected option fields report inline errors instead of an alert', async () => {
  await mount();
  await act(async () => submit());
  const messages = alerts();
  expect(messages).toContain('請選擇排便形狀。');
  expect(messages).toContain('請選擇排便顏色。');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(service.createHealthEvent).not.toHaveBeenCalled();
});

test('the first unselected option field is scrolled into view', async () => {
  await mount();
  const positioned = screen.root.findAll(
    (node) => node.type === ('View' as never) && node.props.onLayout,
  );
  // 形狀是畫面上第一個必填選項，捲動應該停在它上面而不是其他欄位。
  positioned[0].props.onLayout({ nativeEvent: { layout: { y: 200 } } });
  await act(async () => submit());
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 184, animated: false });
});

test('choosing an option clears only that field error', async () => {
  await mount();
  await act(async () => submit());
  expect(alerts()).toHaveLength(2);
  await act(async () => option('偏軟').props.onPress());
  const remaining = alerts();
  expect(remaining).not.toContain('請選擇排便形狀。');
  expect(remaining).toContain('請選擇排便顏色。');
});
