Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { VaccinationFormScreen } from '../screens/VaccinationFormScreen';
import { createVaccination } from '../../../services/vaccinationService';

const mockScrollTo = jest.fn();
const mockPet = { id: 'p1', name: '小米', memorial: false };
const mockNavigation = { replace: jest.fn(), popToTop: jest.fn(), setParams: jest.fn() };

jest.mock('react-native', () => ({
  AccessibilityInfo: { isReduceMotionEnabled: undefined, addEventListener: undefined },
  Alert: { alert: jest.fn() },
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
jest.mock('../../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../../hooks/useFormPet', () => ({ useFormPet: () => mockPet }));
jest.mock('../../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({
    markSaved: (_draft: unknown, after?: () => void) => after?.(),
  }),
}));
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../../components/ScreenPageHeader', () => ({
  ScreenPageHeader: 'Header',
  ScreenPageFrame: 'Frame',
}));
jest.mock('../../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../../components/ReminderToggleField', () => ({ ReminderToggleField: 'Toggle' }));
jest.mock('../../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../../components/KeyboardAwareScrollView', () => {
  const react = jest.requireActual('react');
  return react.forwardRef((props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
    react.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return react.createElement('ScrollView', props, props.children);
  });
});
jest.mock('../../../services/vaccinationService', () => ({
  createVaccination: jest.fn().mockResolvedValue({ record: { id: 'v1' } }),
  updateVaccination: jest.fn(),
}));
jest.mock('../../../services/careNotificationSync', () => ({
  syncCareNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../utils/quickRecordFeedback', () => ({ showQuickRecordFeedback: jest.fn() }));

let screen: ReactTestRenderer;
const submit = () => screen.root.findByType('AppButton' as never).props.onPress();
const alerts = () =>
  screen.root
    .findAll((node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert')
    .map((node) => node.props.children);

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
    screen = create(<VaccinationFormScreen />);
  });
}

test('missing vaccine name shows an inline error instead of an alert, and blocks saving', async () => {
  await mount();
  const positioned = screen.root.findAll(
    (node) => node.type === ('View' as never) && node.props.onLayout,
  );
  positioned[0].props.onLayout({ nativeEvent: { layout: { y: 120 } } });
  await act(async () => submit());
  expect(alerts()).toContain('請填寫疫苗名稱。');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(createVaccination).not.toHaveBeenCalled();
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 104, animated: false });
});

test('typing in the field clears its error before the next submit', async () => {
  await mount();
  await act(async () => submit());
  expect(alerts()).toHaveLength(1);
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '疫苗名稱（必填）',
  );
  await act(async () => input.props.onChangeText('狂犬病'));
  expect(alerts()).toHaveLength(0);
  await act(async () => submit());
  expect(createVaccination).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ vaccineName: '狂犬病' }),
  );
});

test('a next-due date earlier than the administered date is reported on that field', async () => {
  await mount();
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '疫苗名稱（必填）',
  );
  await act(async () => input.props.onChangeText('狂犬病'));
  const nextDue = screen.root.findAll((node) => node.type === ('DatePicker' as never))[1];
  await act(async () => nextDue.props.onChange(new Date('2000-01-02T00:00:00+08:00')));
  await act(async () => submit());
  expect(alerts()).toContain('下次接種日期不能早於接種日期。');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(createVaccination).not.toHaveBeenCalled();
});

test('a blocked submit also gives haptic feedback, since the error may be off-screen', async () => {
  await mount();
  await act(async () => submit());
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Error);
});

test('a successful submit does not give error feedback', async () => {
  await mount();
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '疫苗名稱（必填）',
  );
  await act(async () => input.props.onChangeText('狂犬病'));
  await act(async () => submit());
  expect(Haptics.notificationAsync).not.toHaveBeenCalled();
});

test('a successful save navigates without a confirmation dialog', async () => {
  await mount();
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '疫苗名稱（必填）',
  );
  await act(async () => input.props.onChangeText('狂犬病'));
  await act(async () => submit());
  // 畫面會換到詳情頁，轉場本身就是回饋，不需要「已儲存」對話框。
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockNavigation.replace).toHaveBeenCalledWith('VaccinationDetail', { recordId: 'v1' });
});

test('a notification sync failure is still reported, since it needs attention', async () => {
  const sync = jest.requireMock('../../../services/careNotificationSync');
  sync.syncCareNotifications.mockResolvedValueOnce(
    '手機通知同步失敗，回到首頁或重新開啟 App 時會重試。',
  );
  await mount();
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '疫苗名稱（必填）',
  );
  await act(async () => input.props.onChangeText('狂犬病'));
  await act(async () => submit());
  expect(Alert.alert).toHaveBeenCalledWith(
    '紀錄已儲存，通知尚未同步',
    expect.stringContaining('手機通知同步失敗'),
  );
});
