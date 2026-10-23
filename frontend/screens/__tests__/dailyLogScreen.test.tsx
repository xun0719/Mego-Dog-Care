Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import DailyLogScreen from '../DailyLogScreen';
import { SelectionGroup } from '../../components/SelectionChip';
import * as logs from '../../services/dailyLogService';
import { classifyStoolPhoto } from '../../services/stoolClassifierService';
const mockPet = { id: 'p1' };
const mockNavigation = { setOptions: jest.fn(), popToTop: jest.fn(), goBack: jest.fn() };
let mockFocus = 0;
jest.mock('react-native', () => ({
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: jest.fn() },
  Image: 'Image',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  StyleSheet: { create: (value: object) => value, hairlineWidth: 1 },
  AppState: { currentState: 'active', addEventListener: () => ({ remove: jest.fn() }) },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return {
    useFocusEffect: (callback: () => void) => react.useEffect(callback, [callback, mockFocus]),
    useNavigation: () => mockNavigation,
  };
});
jest.mock('../../hooks/useUnsavedChangesGuard', () => ({ useUnsavedChangesGuard: jest.fn() }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({ usePet: () => ({ selectedPet: mockPet }) }));
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { homeTheme: 'morning-home' } }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../components/SoftMotion', () => ({
  SoftEntrance: 'SoftEntrance',
  SoftButton: 'SoftButton',
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/RecordActionButton', () => ({
  RecordActionButton: 'RecordActionButton',
}));
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/KeyboardAwareScrollView', () => 'ScrollView');
jest.mock('../../components/ScreenState', () => 'ScreenState');
jest.mock('../../services/dailyLogService', () => ({
  getTodayDailyLog: jest.fn(),
  getDailyLog: jest.fn(),
  createDailyLog: jest.fn(),
  updateDailyLog: jest.fn(),
  deleteDailyLog: jest.fn(),
}));
jest.mock('../../services/stoolClassifierService', () => ({ classifyStoolPhoto: jest.fn() }));
let screen: ReactTestRenderer;
const route = { params: { recordDate: '2026-10-03' } };
const props = { navigation: mockNavigation as never, route: route as never };
const button = (title: string) =>
  screen.root.find((node) => node.type === ('AppButton' as never) && node.props.title === title);
const choice = (label: string) =>
  screen.root.find(
    (node) =>
      node.type === ('TouchableOpacity' as never) && node.props.accessibilityLabel === label,
  );
const mount = async () => {
  await act(async () => {
    screen = create(<DailyLogScreen {...props} />);
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  mockFocus = 0;
  (logs.getTodayDailyLog as jest.Mock).mockResolvedValue({ record: null });
  (logs.createDailyLog as jest.Mock).mockImplementation((_user, _pet, data) =>
    Promise.resolve({ record: { ...data, id: 'saved' } }),
  );
  (logs.updateDailyLog as jest.Mock).mockImplementation((_user, id, data) =>
    Promise.resolve({ record: { ...data, id } }),
  );
  (classifyStoolPhoto as jest.Mock).mockResolvedValue({
    status: 'ok',
    suggestedStoolLevel: 'soft',
    suggestedStoolLabel: '偏軟',
    confidence: 0.99,
  });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('saving a backdated entry uses the requested date and matching title', async () => {
  await mount();
  await act(async () => button('儲存這天的紀錄').props.onPress());
  expect(logs.createDailyLog).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ localDate: '2026-10-03' }),
  );
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.children === '日常紀錄',
    ),
  ).toHaveLength(1);
  // 這個畫面儲存後留在原地，因此另外顯示一則成功提示，同樣帶日期；
  // 標題本身仍然只有一個。
  const dated = screen.root.findAll(
    (node) =>
      node.type === ('Text' as never) &&
      JSON.stringify(node.props.children).includes('2026 年 10 月 3 日'),
  );
  expect(dated).toHaveLength(2);
  expect(
    dated.filter((node) => JSON.stringify(node.props.children).includes('紀錄已更新')),
  ).toHaveLength(1);
  expect(mockNavigation.setOptions).not.toHaveBeenCalled();
});
test('returning focus does not reload over edited choices', async () => {
  await mount();
  await act(async () => choice('偏硬').props.onPress());
  mockFocus += 1;
  await act(async () => screen.update(<DailyLogScreen {...props} />));
  expect(logs.getTodayDailyLog).toHaveBeenCalledTimes(1);
  expect(choice('偏硬').props.accessibilityState.checked).toBe(true);
});
test('named daily groups keep independent single selections and save the original field values', async () => {
  await mount();
  for (const [groupName, label] of [
    ['喝水量', '偏少'],
    ['飼料量', '偏多'],
    ['精神狀態', '稍沒精神'],
    ['大便狀況', '偏軟'],
  ]) {
    const group = screen.root
      .findAllByType(SelectionGroup)
      .find((node) => node.props.label === groupName)!;
    const option = group.find(
      (node) =>
        node.type === ('TouchableOpacity' as never) && node.props.accessibilityLabel === label,
    );
    await act(async () => option.props.onPress());
    expect(
      group.findAll(
        (node) =>
          node.type === ('TouchableOpacity' as never) && node.props.accessibilityState?.checked,
      ),
    ).toHaveLength(1);
  }
  await act(async () => button('儲存這天的紀錄').props.onPress());
  expect(logs.createDailyLog).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({
      waterLevel: 'low',
      foodLevel: 'high',
      energyLevel: 'slightly_low',
      stoolLevel: 'soft',
    }),
  );
});
test('photo controls start collapsed and differing suggestions require explicit adoption', async () => {
  await mount();
  expect(
    screen.root.findAllByType('AppButton' as never).some((n) => n.props.title === '拍照辨識'),
  ).toBe(false);
  await act(async () => choice('偏硬').props.onPress());
  await act(async () => choice('用照片取得建議').props.onPress());
  await act(async () => button('拍照辨識').props.onPress());
  expect(choice('偏硬').props.accessibilityState.checked).toBe(true);
  await act(async () => button('採用建議：偏軟').props.onPress());
  expect(choice('偏軟').props.accessibilityState.checked).toBe(true);
});
test('photo suggestion auto-applies only to a previously empty choice', async () => {
  await mount();
  await act(async () => choice('用照片取得建議').props.onPress());
  await act(async () => button('拍照辨識').props.onPress());
  expect(choice('偏軟').props.accessibilityState.checked).toBe(true);
});

jest.mock(
  '../../assets/artwork/themes/morning-home/page-decorations/daily-checkin-v1.webp',
  () => 1,
);

jest.mock(
  '../../assets/artwork/themes/afternoon-living-room/page-decorations/daily-checkin-v1.webp',
  () => 1,
);

jest.mock(
  '../../assets/artwork/themes/garden-walk/page-decorations/daily-checkin-v1.webp',
  () => 1,
);

test('deleting and recreating a historical record keeps its original date', async () => {
  (logs.getTodayDailyLog as jest.Mock).mockResolvedValue({
    record: {
      id: 'old',
      petId: 'p1',
      localDate: '2026-10-03',
      loggedAt: '2026-10-03T04:00:00Z',
      stoolLevel: 'hard',
    },
  });
  await mount();
  screen.root.findByType('RecordActionButton' as never).props.onPress();
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () => buttons.find((item: { text: string }) => item.text === '刪除').onPress());
  (logs.getTodayDailyLog as jest.Mock).mockResolvedValue({ record: null });
  await act(async () => button('儲存這天的紀錄').props.onPress());
  expect(logs.createDailyLog).toHaveBeenCalledWith(
    'u1',
    'p1',
    expect.objectContaining({ localDate: '2026-10-03' }),
  );
});
test('a choice made while classification is pending is not overwritten', async () => {
  let resolve: (value: object) => void = () => undefined;
  (classifyStoolPhoto as jest.Mock).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await mount();
  await act(async () => choice('用照片取得建議').props.onPress());
  let pending: Promise<void> = Promise.resolve();
  await act(async () => {
    pending = button('拍照辨識').props.onPress();
  });
  await act(async () => choice('偏硬').props.onPress());
  await act(async () => {
    resolve({
      status: 'ok',
      suggestedStoolLevel: 'soft',
      suggestedStoolLabel: '偏軟',
      confidence: 0.99,
    });
    await pending;
  });
  expect(choice('偏硬').props.accessibilityState.checked).toBe(true);
});

test('edits made during saving survive and the next save updates the returned id', async () => {
  let resolve: (value: object) => void = () => undefined;
  let submitted: object;
  (logs.createDailyLog as jest.Mock).mockImplementation((_user, _pet, data) => {
    submitted = data;
    return new Promise((done) => {
      resolve = done;
    });
  });
  await mount();
  let pending: Promise<void>;
  await act(async () => {
    pending = button('儲存這天的紀錄').props.onPress();
  });
  await act(async () => choice('偏硬').props.onPress());
  await act(async () => {
    resolve({ record: { ...submitted, id: 'new-record' } });
    await pending;
  });
  expect(choice('偏硬').props.accessibilityState.checked).toBe(true);
  expect(logs.getTodayDailyLog).toHaveBeenCalledTimes(1);
  await act(async () => button('儲存這筆紀錄').props.onPress());
  expect(logs.updateDailyLog).toHaveBeenCalledWith(
    'u1',
    'new-record',
    expect.objectContaining({ stoolLevel: 'hard' }),
  );
});

test('save blocks deletion until its request completes', async () => {
  (logs.getTodayDailyLog as jest.Mock).mockResolvedValue({
    record: { id: 'old', petId: 'p1', localDate: '2026-10-03', loggedAt: '2026-10-03T04:00:00Z' },
  });
  let finish: (value: object) => void = () => undefined;
  (logs.updateDailyLog as jest.Mock).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  let pending: Promise<void>;
  await act(async () => {
    pending = button('儲存這筆紀錄').props.onPress();
  });
  const remove = screen.root.findByType('RecordActionButton' as never);
  expect(remove.props.disabled).toBe(true);
  remove.props.onPress();
  expect(logs.deleteDailyLog).not.toHaveBeenCalled();
  expect((Alert.alert as jest.Mock).mock.calls.some((call) => call[0] === '刪除紀錄')).toBe(false);
  await act(async () => {
    finish({ record: { id: 'old' } });
    await pending;
  });
});

test('duplicate delete confirmations send one request and block saving', async () => {
  (logs.getTodayDailyLog as jest.Mock).mockResolvedValue({
    record: { id: 'old', petId: 'p1', localDate: '2026-10-03', loggedAt: '2026-10-03T04:00:00Z' },
  });
  let finish: () => void = () => undefined;
  (logs.deleteDailyLog as jest.Mock).mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  await mount();
  const remove = screen.root.findByType('RecordActionButton' as never);
  remove.props.onPress();
  remove.props.onPress();
  const calls = (Alert.alert as jest.Mock).mock.calls.filter((call) => call[0] === '刪除紀錄');
  expect(calls).toHaveLength(1);
  const confirm = calls[0][2].find((item: { text: string }) => item.text === '刪除').onPress;
  let pending: Promise<void>;
  await act(async () => {
    pending = confirm();
    void confirm();
  });
  expect(logs.deleteDailyLog).toHaveBeenCalledTimes(1);
  expect(button('儲存這筆紀錄').props.disabled).toBe(true);
  await act(async () => button('儲存這筆紀錄').props.onPress());
  expect(logs.updateDailyLog).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await pending;
  });
});
