Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { Keyboard } from 'react-native';
import { FORM_FIELD_GAP } from '../../../constants/FormTokens';
import { medicationStyles } from '../medicationStyles';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { MedicationFormScreen } from '../screens/MedicationFormScreen';
import { MedicationFrequencyField } from '../components/MedicationFrequencyField';
import { SelectionChip } from '../../../components/SelectionChip';
import { MedicalVisitMedicationCards } from '../../medical-visits/components/MedicalVisitDetailSections';
import MedicalVisitMedicationEditor from '../../medical-visits/components/MedicalVisitMedicationEditor';
import { createMedicationDraft } from '../types';
import { createMedication } from '../../../services/medicationService';
import { syncCareNotifications } from '../../../services/careNotificationSync';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Medication, MedicationCourse } from '../../../types';

jest.mock('react-native', () => ({
  ...Object.fromEntries(
    [
      'Text',
      'View',
      'TextInput',
      'TouchableOpacity',
      'ActivityIndicator',
      'Modal',
      'Pressable',
      'ScrollView',
    ].map((name) => [name, name]),
  ),
  Alert: { alert: jest.fn() },
  Keyboard: { dismiss: jest.fn() },
  StyleSheet: { create: (value: object) => value },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
const mockReplace = jest.fn();
let mockParams: HomeStackParamList['MedicationForm'];
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../../../components/ScreenPageHeader', () => ({
  ScreenPageHeader: 'Header',
  ScreenPageFrame: 'Frame',
}));
jest.mock('../../../components/KeyboardAwareScrollView', () => 'ScrollView');
jest.mock('../../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../../components/RecordActionButton', () => ({ RecordActionButton: 'RecordAction' }));
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));
jest.mock('../../../hooks/usePressFeedback', () => ({ useReducedMotion: () => true }));
jest.mock('../../../utils/haptics', () => ({ hapticError: jest.fn() }));
jest.mock('../../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({
    markSaved: (_values: unknown, proceed?: () => void) => proceed?.(),
  }),
}));
const mockPet = { id: 'p1', name: '小米' };
jest.mock('../../../hooks/useFormPet', () => ({ useFormPet: () => mockPet }));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
jest.mock('../../../contexts/PetContext', () => ({ usePet: () => ({ pets: [mockPet] }) }));
jest.mock('../../../services/careNotificationSync', () => ({ syncCareNotifications: jest.fn() }));
jest.mock('../../../services/medicationService', () => ({
  createMedication: jest.fn(),
  updateMedication: jest.fn(),
}));

const prescription: Medication = {
  name: '藥袋 A',
  instructions: '依藥袋說明',
  timesPerDay: 2,
  startDate: '',
  endDate: '',
  mealTiming: 'after',
  notes: '回診時帶藥袋',
  sourceMedicationKey: 'a'.repeat(64),
};
const source = {
  id: 'v1',
  petId: 'p1',
  visitedAt: '2026-10-16T16:00:00Z',
  medication: prescription,
  sourceMedicationKey: 'a'.repeat(64),
};
let screen: ReactTestRenderer;
const mount = async (element: React.ReactElement) => {
  await act(async () => {
    screen = create(element);
  });
};
const button = (title: string) =>
  screen.root.findAllByType('AppButton' as never).find((node) => node.props.title === title)!;
const option = (label: string) =>
  screen.root
    .findAllByType('TouchableOpacity' as never)
    .find((node) => node.props.accessibilityLabel === label)!;
const openFrequency = async (label = '每日次數') => {
  await act(async () => option(label).props.onPress());
};
beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  (createMedication as jest.Mock).mockResolvedValue({ record: { id: 'course-1' } });
  (syncCareNotifications as jest.Mock).mockResolvedValue(undefined);
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('frequency shows one centered field and six choices only after opening the selector', async () => {
  const change = jest.fn();
  await mount(<MedicationFrequencyField value={2} onChange={change} />);
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  const field = option('每日次數');
  expect(field.props.accessibilityValue.text).toBe('每天 2 次');
  const content = field.children as import('react-test-renderer').ReactTestInstance[];
  expect(content[0].props.style.width).toBe(content[2].props.style.width);
  expect(content[1].props.style).toMatchObject({ textAlign: 'center', flex: 1 });
  await openFrequency();
  expect(Keyboard.dismiss).toHaveBeenCalledTimes(1);
  const choices = screen.root.findAll(
    (node) =>
      node.type === ('TouchableOpacity' as never) && node.props.accessibilityRole === 'radio',
  );
  expect(choices.map((node) => node.props.accessibilityLabel)).toEqual(
    [1, 2, 3, 4, 5, 6].map((count) => `每天 ${count} 次`),
  );
  expect(option('每天 2 次').props.accessibilityState.selected).toBe(true);
  for (const choice of choices) {
    const children = choice.children as import('react-test-renderer').ReactTestInstance[];
    expect(children[0].props.style.width).toBe(children[2].props.style.width);
  }
  expect(change).not.toHaveBeenCalled();
  await act(async () => option('每天 3 次').props.onPress());
  expect(change).toHaveBeenCalledWith(3);
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  await act(async () => screen.update(<MedicationFrequencyField value={3} onChange={change} />));
  await openFrequency();
  expect(option('每天 3 次').props.accessibilityState.selected).toBe(true);
});

test('cancel, outside tap, accessibility escape and native back close without changing frequency', async () => {
  const change = jest.fn();
  await mount(<MedicationFrequencyField value={6} onChange={change} />);
  await openFrequency();
  await act(async () => option('取消選擇每日次數').props.onPress());
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  await openFrequency();
  const backdrop = screen.root.findByType('Pressable' as never);
  await act(async () => backdrop.props.onPress());
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  await openFrequency();
  await act(async () => screen.root.findByType('Modal' as never).props.onRequestClose());
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  await openFrequency();
  const dialog = screen.root.findByProps({ accessibilityViewIsModal: true });
  await act(async () => dialog.props.onAccessibilityEscape());
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
  expect(change).not.toHaveBeenCalled();
  expect(option('每日次數').props.accessibilityValue.text).toBe('每天 6 次');
});

test('changing frequency alone never adds reminder slots', async () => {
  await mount(<MedicationFormScreen />);
  await openFrequency();
  await act(async () => option('每天 3 次').props.onPress());
  await act(async () => option('飯後').props.onPress());
  const name = screen.root.findByProps({ accessibilityLabel: '藥品名稱（必填）' });
  await act(async () => name.props.onChangeText('藥袋 A'));
  await act(async () => button('儲存').props.onPress());
  expect(createMedication).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({
      timesPerDay: 3,
      mealTiming: 'after_meal',
      reminderEnabled: false,
      reminderTimes: [],
    }),
  );
});

test('visit import pre-fills a Taiwan date, instructions and meal timing but leaves reminders off until confirmed', async () => {
  mockParams = { sourceVisit: source };
  await mount(<MedicationFormScreen />);
  expect(screen.root.findByProps({ accessibilityLabel: '藥品名稱（必填）' }).props.value).toBe(
    '藥袋 A',
  );
  expect(option('每日次數').props.accessibilityValue.text).toBe('每天 2 次');
  expect(option('飯後').props.accessibilityState.selected).toBe(true);
  expect(createMedication).not.toHaveBeenCalled();
  await act(async () => button('儲存').props.onPress());
  expect(createMedication).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({
      startDate: '2026-10-17',
      instructions: '依藥袋說明',
      mealTiming: 'after_meal',
      medicalVisitId: 'v1',
      medicalVisitMedicationKey: source.sourceMedicationKey,
      reminderTimes: [],
      reminderEnabled: false,
    }),
  );
  expect(mockReplace).toHaveBeenCalledWith('MedicationDetail', { recordId: 'course-1' });
});

test('duplicating a course drops its visit-source identity and reminders', () => {
  const draft = createMedicationDraft(
    {
      ...createMedicationDraft(undefined, false, source),
      id: 'course',
      petId: 'p1',
    } as MedicationCourse,
    true,
  );
  expect(draft.medicalVisitId).toBeUndefined();
  expect(draft.medicalVisitMedicationKey).toBeUndefined();
  expect(draft.reminderTimes).toEqual([]);
  expect(draft.name).toBe('藥袋 A');
});

test('visit prescription offers import, and switches to view rather than create once linked', async () => {
  const createCourse = jest.fn();
  const view = jest.fn();
  await mount(
    <MedicalVisitMedicationCards
      medications={[prescription]}
      onCreateCourse={createCourse}
      onViewCourse={view}
    />,
  );
  expect(button('建立用藥療程').props.style.marginTop).toBe(FORM_FIELD_GAP);
  await act(async () => button('建立用藥療程').props.onPress());
  expect(createCourse).toHaveBeenCalledWith(prescription);
  await act(async () =>
    screen.update(
      <MedicalVisitMedicationCards
        medications={[{ ...prescription, linkedMedicationId: 'course-1' }]}
        onCreateCourse={createCourse}
        onViewCourse={view}
      />,
    ),
  );
  expect(button('建立用藥療程')).toBeUndefined();
  expect(button('查看用藥療程').props.style.marginTop).toBe(FORM_FIELD_GAP);
  await act(async () => button('查看用藥療程').props.onPress());
  expect(view).toHaveBeenCalledWith('course-1');
});

test('unsupported source frequency is kept as-is and cannot be silently lowered on import', async () => {
  const createCourse = jest.fn();
  await mount(
    <MedicalVisitMedicationCards
      medications={[{ ...prescription, timesPerDay: 8 }]}
      onCreateCourse={createCourse}
    />,
  );
  expect(button('建立用藥療程').props.disabled).toBe(true);
  expect(createCourse).not.toHaveBeenCalled();
  expect(
    createMedicationDraft(undefined, false, {
      ...source,
      medication: { ...prescription, timesPerDay: 8 },
    }).timesPerDay,
  ).toBe(8);
});

test('read-only memorial prescription does not offer new-course creation', async () => {
  await mount(
    <MedicalVisitMedicationCards medications={[prescription]} onViewCourse={jest.fn()} />,
  );
  expect(button('建立用藥療程')).toBeUndefined();
});

test('visit editor keeps name and bag instructions visible, while optional details can expand and collapse', async () => {
  await mount(
    <MedicalVisitMedicationEditor
      medication={prescription}
      index={0}
      onUpdate={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  expect(screen.root.findAllByType('DatePicker' as never)).toHaveLength(0);
  expect(button('補充服用資訊').props.style.marginTop).toBe(FORM_FIELD_GAP);
  await act(async () => button('補充服用資訊').props.onPress());
  expect(button('收合服用資訊').props.style.marginTop).toBe(FORM_FIELD_GAP);
  expect(screen.root.findAllByType('DatePicker' as never)).toHaveLength(2);
  expect(
    screen.root
      .findAllByType('Text' as never)
      .some((node) => node.props.children === '每日次數（新增藥物時必填）'),
  ).toBe(true);
  await act(async () => button('收合服用資訊').props.onPress());
  expect(screen.root.findAllByType('DatePicker' as never)).toHaveLength(0);
});

test('spaced reminder rows retain add, edit and delete behavior without an empty list', async () => {
  await mount(<MedicationFormScreen />);
  const reminderList = () =>
    screen.root.findAll(
      (node) =>
        node.type === ('View' as never) && node.props.style === medicationStyles.reminderList,
    );
  const timePicker = () =>
    screen.root.findAllByType('DatePicker' as never).find((node) => node.props.mode === 'time')!;
  expect(reminderList()).toHaveLength(0);
  await act(async () => timePicker().props.onChange(new Date('2026-10-17T00:00:00Z')));
  await act(async () => timePicker().props.onChange(new Date('2026-10-17T02:00:00Z')));
  expect(reminderList()).toHaveLength(1);
  expect(reminderList()[0].props.style.marginTop).toBe(FORM_FIELD_GAP);
  const actions = (kind: string) =>
    screen.root.findAllByType('RecordAction' as never).filter((node) => node.props.kind === kind);
  expect(actions('edit')).toHaveLength(2);
  await act(async () => actions('edit')[0].props.onPress());
  await act(async () => timePicker().props.onChange(new Date('2026-10-17T01:00:00Z')));
  expect(actions('edit')).toHaveLength(2);
  await act(async () => actions('delete')[1].props.onPress());
  await act(async () =>
    screen.root
      .findByProps({ accessibilityLabel: '藥品名稱（必填）' })
      .props.onChangeText('藥袋 A'),
  );
  await act(async () => button('儲存').props.onPress());
  expect(createMedication).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ reminderEnabled: true, reminderTimes: ['09:00'] }),
  );
  await act(async () => actions('delete')[0].props.onPress());
  expect(reminderList()).toHaveLength(0);
});

test('visit editor automatically reveals an invalid collapsed field', async () => {
  await mount(
    <MedicalVisitMedicationEditor
      medication={prescription}
      errors={{ timesPerDay: '請確認每日次數' }}
      index={0}
      onUpdate={jest.fn()}
      onRemove={jest.fn()}
    />,
  );
  expect(screen.root.findByProps({ accessibilityLabel: '藥物 1 每日次數' })).toBeDefined();
  expect(screen.root.findByType(MedicationFrequencyField).props.invalid).toBe(true);
  expect(
    screen.root
      .findAllByType('Text' as never)
      .some(
        (node) =>
          node.props.accessibilityRole === 'alert' && node.props.children === '請確認每日次數',
      ),
  ).toBe(true);
});

test('visit frequency preserves all ten choices, including existing values above six', async () => {
  const update = jest.fn();
  await mount(
    <MedicalVisitMedicationEditor
      medication={{ ...prescription, timesPerDay: 8 }}
      index={0}
      onUpdate={update}
      onRemove={jest.fn()}
    />,
  );
  await act(async () => button('補充服用資訊').props.onPress());
  expect(option('藥物 1 每日次數').props.accessibilityValue.text).toBe('每天 8 次');
  await openFrequency('藥物 1 每日次數');
  expect(option('每天 8 次').props.accessibilityState.selected).toBe(true);
  expect(
    screen.root.findAll(
      (node) =>
        node.type === ('TouchableOpacity' as never) &&
        node.props.accessibilityRole === 'radio' &&
        /^每天 /.test(node.props.accessibilityLabel),
    ),
  ).toHaveLength(10);
  await act(async () => option('每天 10 次').props.onPress());
  expect(update).toHaveBeenCalledWith('timesPerDay', 10);
  expect(screen.root.findAllByType('Modal' as never)).toHaveLength(0);
});

test('both medication forms use equal-width meal choices without a one-sided indicator', async () => {
  for (const element of [
    <MedicationFormScreen key="course" />,
    <MedicalVisitMedicationEditor
      key="visit"
      medication={prescription}
      index={0}
      onUpdate={jest.fn()}
      onRemove={jest.fn()}
    />,
  ]) {
    await mount(element);
    if (button('補充服用資訊')) await act(async () => button('補充服用資訊').props.onPress());
    const meals = screen.root.findAllByType(SelectionChip);
    expect(meals.map((node) => node.props.label)).toEqual(['飯前', '飯後', '不限']);
    for (const meal of meals) {
      expect(meal.props.style).toMatchObject({ flex: 1, minWidth: 0 });
      expect(option(meal.props.label).findAllByType('Icon' as never)).toHaveLength(0);
    }
    expect(meals.filter((meal) => meal.props.selected)).toHaveLength(1);
    await act(async () => screen.unmount());
  }
});
