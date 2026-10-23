jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ goBack: jest.fn() }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import MedicalVisitFormScreen from '../MedicalVisitFormScreen';
import { createMedicalVisit, updateMedicalVisit } from '../../services/medicalVisitService';
const mockScrollTo = jest.fn();
const mockPet = { id: 'p1', name: '小米' };
const mockNavigation = { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn() };
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Switch: 'Switch',
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  Pressable: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/AttachmentPicker', () => 'AttachmentPicker');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/KeyboardAwareScrollView', () => {
  const react = jest.requireActual('react');
  return react.forwardRef((props: { children: React.ReactNode }, ref: React.Ref<unknown>) => {
    react.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
    return react.createElement('ScrollView', props, props.children);
  });
});
jest.mock('../../services/medicalVisitService', () => ({
  createMedicalVisit: jest.fn(),
  updateMedicalVisit: jest.fn(),
}));
jest.mock('../../services/notificationService', () => ({
  reconcileAccountNotifications: jest.fn().mockResolvedValue(undefined),
}));
let screen: ReactTestRenderer;
const submit = () =>
  screen.root
    .findAllByType('AppButton' as never)
    .at(-1)!
    .props.onPress();
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
      <MedicalVisitFormScreen
        navigation={mockNavigation as never}
        route={{ params: {} } as never}
      />,
    );
  });
}
test('invalid reason displays an inline error and scrolls to that field without submitting', async () => {
  await mount();
  const positioned = screen.root.findAll(
    (node) => node.type === ('View' as never) && node.props.onLayout,
  );
  positioned[1].props.onLayout({ nativeEvent: { layout: { y: 180 } } });
  await act(async () => submit());
  expect(
    screen.root
      .findAll(
        (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert',
      )
      .map((node) => node.props.children),
  ).toContain('請填寫看診原因');
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 164, animated: false });
  expect(createMedicalVisit).not.toHaveBeenCalled();
});
test('correcting the reason clears validation errors and saves', async () => {
  await mount();
  await act(async () => submit());
  const input = screen.root.find(
    (node) =>
      node.type === ('Input' as never) && node.props.accessibilityLabel === '看診原因（必填）',
  );
  await act(async () => input.props.onChangeText('例行檢查'));
  await act(async () => submit());
  expect(createMedicalVisit).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ reason: '例行檢查' }),
  );
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert',
    ),
  ).toHaveLength(0);
});

test('map selection is a separated full-width button and returns to the same form', async () => {
  await mount();
  const mapButton = screen.root.findByProps({ accessibilityLabel: '從地圖選擇動物醫院' });
  expect(mapButton.props.style).toMatchObject({
    marginTop: 12,
    alignSelf: 'stretch',
    minHeight: 48,
    borderWidth: 1,
  });
  expect(mapButton.props.activeOpacity).toBeLessThan(1);
  await act(async () => mapButton.props.onPress());
  expect(mockNavigation.navigate).toHaveBeenCalledWith('VetMap', { selectForVisit: true });
  await act(async () =>
    screen.update(
      <MedicalVisitFormScreen
        navigation={mockNavigation as never}
        route={{ params: { clinicName: '測試動物醫院' } } as never}
      />,
    ),
  );
  expect(screen.root.findByProps({ accessibilityLabel: '動物醫院名稱（選填）' }).props.value).toBe(
    '測試動物醫院',
  );
  expect(mockNavigation.setParams).toHaveBeenCalledWith({ clinicName: undefined });
});

test('editing a visit sends only prescription fields, never the read-only course link metadata', async () => {
  await act(async () => {
    screen = create(
      <MedicalVisitFormScreen
        navigation={mockNavigation as never}
        route={
          {
            params: {
              visit: {
                id: 'v1',
                petId: 'p1',
                reason: '例行檢查',
                visitedAt: '2026-10-16T12:00:00+08:00',
                medications: [
                  {
                    name: '藥袋 A',
                    instructions: '依醫囑',
                    timesPerDay: 2,
                    startDate: '',
                    endDate: '',
                    mealTiming: 'after',
                    notes: '',
                    sourceMedicationKey: 'a'.repeat(64),
                    linkedMedicationId: 'course-1',
                  },
                ],
              },
            },
          } as never
        }
      />,
    );
  });
  await act(async () => submit());
  const saved = (updateMedicalVisit as jest.Mock).mock.calls[0][2];
  expect(saved.medications).toEqual([
    {
      name: '藥袋 A',
      instructions: '依醫囑',
      timesPerDay: 2,
      startDate: '',
      endDate: '',
      mealTiming: 'after',
      notes: '',
    },
  ]);
});

test('clearing the shared follow-up date also cancels its reminder without filling a new date', async () => {
  await mount();
  const date = () =>
    screen.root
      .findAllByType('DatePicker' as never)
      .find((node) => node.props.label === '下次回診日期（選填）')!;
  expect(date().props.placeholder).toBe('選擇下次回診日期');
  expect(date().props.value).toBeUndefined();
  expect(screen.root.findByType('Switch' as never).props.accessibilityHint).toBe(
    '請先選擇下次回診日期。\n選好後即可開啟提醒。',
  );
  await act(async () => date().props.onChange(new Date('2099-10-20T10:00:00+08:00')));
  const reminder = screen.root.findByType('Switch' as never);
  expect(reminder.props.accessibilityHint).toBe(
    '關閉後儲存，會移除原有回診提醒。\n手機通知依設定與系統權限排定。',
  );
  await act(async () => reminder.props.onValueChange(true));
  await act(async () => date().props.onClear());
  expect(date().props.value).toBeUndefined();
  expect(screen.root.findByType('Switch' as never).props.disabled).toBe(true);
  expect(screen.root.findByType('Switch' as never).props.value).toBe(false);
  await act(async () =>
    screen.root
      .findByProps({ accessibilityLabel: '看診原因（必填）' })
      .props.onChangeText('例行檢查'),
  );
  await act(async () => submit());
  expect(createMedicalVisit).toHaveBeenLastCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ followUpAt: null, createFollowUpReminder: false }),
  );
});

jest.mock('../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({ markSaved: jest.fn() }),
}));
