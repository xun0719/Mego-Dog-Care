Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import type { Pet } from '../../../types';
import PetMemorialScreen from '../screens/PetMemorialScreen';
import { MEMORIAL_EFFECTS, MEMORIAL_EFFECT_GROUPS } from '../memorialContent';
import { syncCareNotifications } from '../../../services/careNotificationSync';
import { taipeiDateFromKey } from '../../../utils/taipeiDate';
import { memorialStyles } from '../memorialStyles';

jest.mock('react-native', () => ({
  ...Object.fromEntries(['Text', 'View', 'ScrollView'].map((name) => [name, name])),
  StyleSheet: { create: (value: object) => value },
  Alert: { alert: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: mockNavigate };
jest.mock('@react-navigation/native', () => ({ useNavigation: () => mockNavigation }));
jest.mock('../../../components/SoftMotion', () => ({ SoftButton: 'SoftButton' }));
jest.mock('../../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../../components/ScreenState', () => 'ScreenState');
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));
jest.mock('../../../hooks/usePressFeedback', () => ({ useReducedMotion: () => true }));
jest.mock('../../../utils/haptics', () => ({ hapticError: jest.fn() }));
jest.mock('../../../services/careNotificationSync', () => ({ syncCareNotifications: jest.fn() }));
const mockMarkSaved = jest.fn();
jest.mock('../../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({ markSaved: mockMarkSaved }),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
const activePet: Pet = {
  id: 'p1',
  userId: 'u1',
  name: '小米',
  species: 'dog',
  gender: 'female',
  neutered: true,
  birthDate: '2015-04-02',
  adoptionDate: '2015-06-01',
  memorial: false,
};
let mockSelectedPet: Pet | null;
let mockPets: Pet[];
const mockSelectPet = jest.fn();
const mockMemorialize = jest.fn();
const mockRestore = jest.fn();
jest.mock('../../../contexts/PetContext', () => ({
  usePet: () => ({
    selectedPet: mockSelectedPet,
    pets: mockPets,
    selectPet: mockSelectPet,
    memorializeSelectedPet: mockMemorialize,
    restoreSelectedPet: mockRestore,
  }),
}));

let screen: ReactTestRenderer;
const mount = async () => {
  await act(async () => {
    screen = create(<PetMemorialScreen navigation={mockNavigation} />);
  });
};
const dateField = () => screen.root.findByType('DatePicker' as never);
const byButton = (title: string) =>
  screen.root.findAllByType('AppButton' as never).find((node) => node.props.title === title)!;
const visibleText = () =>
  screen.root.findAllByType('Text' as never).map((node) => node.props.children);
const submit = async () => {
  await act(async () => byButton('移到回憶').props.onPress());
};
const confirmAlert = () => {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  return calls.at(-1)![2][1].onPress as () => Promise<void>;
};
const memorialPet = (): Pet => ({
  ...activePet,
  memorial: true,
  passedAwayDate: '2026-10-01',
  memorialNote: '謝謝你陪我們走過的每一天。',
  avatarAttachmentId: 'avatar-p1',
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-17T10:00:00+08:00'));
  global.requestAnimationFrame = (callback) => {
    callback(0);
    return 0;
  };
  mockSelectedPet = { ...activePet };
  mockPets = [mockSelectedPet];
  mockMemorialize.mockResolvedValue(2);
  mockRestore.mockResolvedValue(undefined);
  (syncCareNotifications as jest.Mock).mockResolvedValue(undefined);
  mockMarkSaved.mockImplementation((_values, proceed) => proceed?.());
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});

test('setup uses one daily-style heading, compact pet card, grouped effects and floating dock clearance', async () => {
  await mount();
  const headings = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
  );
  expect(headings.map((node) => node.props.children)).toEqual(['移到回憶']);
  expect(screen.root.findByType('SoftButton' as never).props.style).toMatchObject({
    width: 44,
    height: 44,
  });
  expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
    'top',
    'left',
    'right',
  ]);
  expect(screen.root.findByType('ScrollView' as never).props.contentContainerStyle).toEqual([
    expect.objectContaining({ padding: 18 }),
    { paddingBottom: 124 },
  ]);
  expect(visibleText()).toEqual(
    expect.arrayContaining(['這次設定的毛孩', '會保留', '會停止', ...MEMORIAL_EFFECTS]),
  );
  expect(MEMORIAL_EFFECT_GROUPS.flatMap((group) => [...group.items])).toEqual(MEMORIAL_EFFECTS);
  expect(
    screen.root
      .findAllByType('Icon' as never)
      .some((node) => node.props.name === 'checkmark-circle-outline'),
  ).toBe(false);
  expect(memorialStyles.compactAvatar).toMatchObject({ width: 64, height: 64 });
  expect(memorialStyles.name).not.toHaveProperty('height');
  await act(async () => screen.root.findByType('SoftButton' as never).props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test('passing date starts blank, is explicitly required and is constrained by arrival and today', async () => {
  await mount();
  expect(dateField().props.value).toBeUndefined();
  expect(dateField().props.label).toBe('離開的日期（必填）');
  expect(dateField().props.minimumDate).toEqual(taipeiDateFromKey('2015-06-01'));
  expect(dateField().props.maximumDate).toEqual(new Date());
  await submit();
  expect(visibleText()).toContain('請選擇離開的日期');
  expect(Alert.alert).not.toHaveBeenCalled();
  expect(mockMemorialize).not.toHaveBeenCalled();
});

test.each([
  ['2015-05-01', '離開日期不能早於生日或到家日'],
  ['2026-10-18', '離開日期不能晚於今天'],
])('rejects invalid date %s before showing confirmation', async (day, message) => {
  await mount();
  await act(async () => dateField().props.onChange(taipeiDateFromKey(day)));
  await submit();
  expect(visibleText()).toContain(message);
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('note uses the shared modal-editor contract with its own label and 300-character limit', async () => {
  await mount();
  const notes = screen.root.findByType('Notes' as never);
  expect(notes.props).toMatchObject({ label: '想對牠說的話（選填）', maxLength: 300, value: '' });
  await act(async () => notes.props.onChange('謝謝你的陪伴'));
  expect(screen.root.findByType('Notes' as never).props.value).toBe('謝謝你的陪伴');
});

test('requires confirmation, submits the Taipei date and trimmed note, and reconciles notifications for the same pet', async () => {
  await mount();
  await act(async () => dateField().props.onChange(new Date('2026-09-30T16:10:00Z')));
  await act(async () =>
    screen.root.findByType('Notes' as never).props.onChange('  謝謝你的陪伴  '),
  );
  await submit();
  expect(Alert.alert).toHaveBeenLastCalledWith(
    '把小米移到回憶？',
    MEMORIAL_EFFECTS.join('\n\n'),
    expect.any(Array),
  );
  expect(mockMemorialize).not.toHaveBeenCalled();
  await act(async () => confirmAlert()());
  expect(mockMemorialize).toHaveBeenCalledWith(
    { passedAwayDate: '2026-10-01', memorialNote: '謝謝你的陪伴' },
    'p1',
  );
  expect(syncCareNotifications).toHaveBeenCalledWith('u1', [
    expect.objectContaining({ id: 'p1', memorial: true }),
  ]);
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test('canceling the confirmation does not mutate data or notifications', async () => {
  await mount();
  await act(async () => dateField().props.onChange(taipeiDateFromKey('2026-10-01')));
  await submit();
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)![2];
  expect(buttons[0]).toMatchObject({ text: '再想想', style: 'cancel' });
  expect(buttons[0].onPress).toBeUndefined();
  expect(mockMemorialize).not.toHaveBeenCalled();
  expect(syncCareNotifications).not.toHaveBeenCalled();
});

test('a failed save keeps the entered date and note available for retry', async () => {
  mockMemorialize.mockRejectedValue(new Error('網路暫時中斷'));
  await mount();
  await act(async () => dateField().props.onChange(taipeiDateFromKey('2026-10-01')));
  await act(async () => screen.root.findByType('Notes' as never).props.onChange('想念你'));
  await submit();
  await act(async () => confirmAlert()());
  expect(Alert.alert).toHaveBeenLastCalledWith('無法移到回憶', '網路暫時中斷');
  expect(dateField().props.value).toEqual(taipeiDateFromKey('2026-10-01'));
  expect(screen.root.findByType('Notes' as never).props.value).toBe('想念你');
  expect(mockGoBack).not.toHaveBeenCalled();
});

test('memorial view shows dates, companionship and full note, not setup inputs', async () => {
  mockSelectedPet = memorialPet();
  mockPets = [mockSelectedPet];
  await mount();
  expect(visibleText()).toEqual(
    expect.arrayContaining([
      '回憶',
      '小米',
      '在回憶中',
      '2015/06/01 – 2026/10/01',
      '陪伴了 11 年 4 個月',
      mockSelectedPet.memorialNote,
      '一起留下的日常',
      '誤設處理',
    ]),
  );
  expect(screen.root.findAllByType('DatePicker' as never)).toHaveLength(0);
  expect(screen.root.findAllByType('Notes' as never)).toHaveLength(0);
  expect(screen.root.findByType('Avatar' as never).props).toMatchObject({
    attachmentId: 'avatar-p1',
    userId: 'u1',
  });
  expect(screen.root.findAllByType('AppButton' as never).map((node) => node.props.title)).toEqual([
    '查看照護紀錄',
    '查看照護相簿',
    '從回憶還原',
  ]);
});

test.each([
  ['查看照護紀錄', 'TimelineOverview'],
  ['查看照護相簿', 'PhotosOverview'],
])('%s selects the pet being viewed before navigating to %s', async (title, destination) => {
  const target = memorialPet();
  mockSelectedPet = target;
  mockPets = [target, { ...activePet, id: 'p2', name: '另一隻毛孩' }];
  await mount();
  mockSelectedPet = mockPets[1];
  await act(async () => screen.update(<PetMemorialScreen navigation={mockNavigation} />));
  await act(async () => byButton(title).props.onPress());
  expect(mockSelectPet).toHaveBeenCalledWith('p1');
  expect(mockNavigate).toHaveBeenCalledWith('Timeline', { screen: destination });
  expect(mockSelectPet.mock.invocationCallOrder[0]).toBeLessThan(
    mockNavigate.mock.invocationCallOrder[0],
  );
});

test('restore stays behind a separate confirmation and never recreates old reminders', async () => {
  mockSelectedPet = memorialPet();
  mockPets = [mockSelectedPet];
  await mount();
  await act(async () => byButton('從回憶還原').props.onPress());
  expect(mockRestore).not.toHaveBeenCalled();
  expect((Alert.alert as jest.Mock).mock.calls.at(-1)![1]).toContain('之前停止的提醒不會自動恢復');
  await act(async () => confirmAlert()());
  expect(mockRestore).toHaveBeenCalledWith('p1');
  expect(syncCareNotifications).toHaveBeenCalledWith('u1', [
    expect.objectContaining({ id: 'p1', memorial: false }),
  ]);
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});

test('missing pet still has a header and a back action, with no setup or restore controls', async () => {
  mockSelectedPet = null;
  mockPets = [];
  await mount();
  expect(screen.root.findByType('ScreenState' as never).props.text).toBe(
    '請先選擇毛孩，再查看回憶。',
  );
  expect(screen.root.findAllByType('AppButton' as never)).toHaveLength(0);
  await act(async () => screen.root.findByType('SoftButton' as never).props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});
