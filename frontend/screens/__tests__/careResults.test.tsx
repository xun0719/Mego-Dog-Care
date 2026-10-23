jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../constants/HomeThemes', () => ({
  HOME_THEME_HEALTH_EMPTY_ARTWORK: { 'morning-home': 1 },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { VaccinationListScreen } from '../../features/vaccinations/screens/VaccinationListScreen';
import { DewormingListScreen } from '../../features/dewormings/screens/DewormingListScreen';
import { MedicationListScreen } from '../../features/medications/screens/MedicationListScreen';
import { AIUsageScreen } from '../../features/settings/screens/AIUsageScreen';
import ExportCenterScreen from '../ExportCenterScreen';
import { getVaccinations } from '../../services/vaccinationService';
import { getDewormings } from '../../services/dewormingService';
import { getMedications } from '../../services/medicationService';
import { getAIUsage, getAIUsageHistory } from '../../services/aiService';
import { createExport, getExport } from '../../services/exportService';
let mockPet = { id: 'p1', name: 'A' };
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Image: 'Image',
  ScrollView: 'Scroll',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (x: object) => x },
  Alert: { alert: jest.fn() },
  FlatList: (props: { ListHeaderComponent: React.ReactNode }) =>
    require('react').createElement('List', props, props.ListHeaderComponent),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ navigate: jest.fn() }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'Safe' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: mockPet, pets: [mockPet] }),
}));
jest.mock('../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { homeTheme: 'morning-home' } }),
}));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/ScreenPageHeader', () => ({
  ScreenPageHeader: 'Header',
  ScreenPageFrame: 'Frame',
  ScreenPageState: 'PageState',
}));
jest.mock('../../components/ScreenState', () => 'State');
jest.mock('../../components/SoftMotion', () => ({ SoftEntrance: 'Entrance' }));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../services/vaccinationService', () => ({ getVaccinations: jest.fn() }));
jest.mock('../../services/dewormingService', () => ({ getDewormings: jest.fn() }));
jest.mock('../../services/medicationService', () => ({ getMedications: jest.fn() }));
jest.mock('../../services/aiService', () => ({
  getAIUsage: jest.fn(),
  getAIUsageHistory: jest.fn(),
}));
jest.mock('../../services/exportService', () => ({
  createExport: jest.fn(),
  getExport: jest.fn(),
  cancelExport: jest.fn(),
  downloadAndShareExport: jest.fn(),
}));
let screen: ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockPet = { id: 'p1', name: 'A' };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});
test.each([
  ['疫苗', VaccinationListScreen, getVaccinations],
  ['驅蟲', DewormingListScreen, getDewormings],
  ['用藥', MedicationListScreen, getMedications],
] as const)(
  '%s list never displays A records after B fails to load',
  async (_name, Component, fetch) => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ records: [{ id: 'record-a', petId: 'p1', status: 'active' }] })
      .mockRejectedValueOnce(new Error('offline B'));
    await act(async () => {
      screen = create(React.createElement(Component));
    });
    expect(screen.root.findByType('List' as never).props.data.length).toBeGreaterThan(0);
    mockPet = { id: 'p2', name: 'B' };
    await act(async () => screen.update(React.createElement(Component)));
    expect(screen.root.findByType('List' as never).props.data).toEqual([]);
    const texts = screen.root
      .findAllByType('Text' as never)
      .map((node) => JSON.stringify(node.props.children))
      .join('');
    expect(texts).toContain('offline B');
    expect(texts).not.toContain('目前沒有');
  },
);
test.each([true, false])(
  'AI usage preserves the successful section when today fails: %s',
  async (todayFails) => {
    const today = { used: 3, remaining: 7, unlimited: false };
    const recent = { totalUsed: 8, dailyUsage: [{ date: '2026-10-13', used: 8 }] };
    (getAIUsage as jest.Mock).mockImplementation(() =>
      todayFails ? Promise.reject(new Error('today offline')) : Promise.resolve(today),
    );
    (getAIUsageHistory as jest.Mock).mockImplementation(() =>
      todayFails ? Promise.resolve(recent) : Promise.reject(new Error('history offline')),
    );
    await act(async () => {
      screen = create(<AIUsageScreen />);
    });
    const texts = screen.root
      .findAllByType('Text' as never)
      .map((node) => JSON.stringify(node.props.children))
      .join('');
    expect(texts).toContain(todayFails ? '合計' : '次使用');
    expect(screen.root.findByType('State' as never).props.error).toBe(true);
  },
);
test('rapid export taps create exactly one job while submission is pending', async () => {
  let resolve!: (value: object) => void;
  (createExport as jest.Mock).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  await act(async () => {
    screen = create(<ExportCenterScreen />);
  });
  const press = screen.root.findByType('AppButton' as never).props.onPress;
  let first: Promise<void>;
  await act(async () => {
    first = press();
    void press();
  });
  expect(createExport).toHaveBeenCalledTimes(1);
  expect(screen.root.findByType('AppButton' as never).props.disabled).toBe(true);
  await act(async () => {
    resolve({ id: 'job1', status: 'completed', progress: 100 });
    await first!;
  });
});
test('poll failure preserves the job and retry queries that same ID', async () => {
  jest.useFakeTimers();
  (createExport as jest.Mock).mockResolvedValue({ id: 'job1', status: 'queued', progress: 0 });
  (getExport as jest.Mock)
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ id: 'job1', status: 'completed', progress: 100 });
  await act(async () => {
    screen = create(<ExportCenterScreen />);
  });
  await act(async () => screen.root.findByType('AppButton' as never).props.onPress());
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
  const retry = screen.root.find(
    (node) =>
      node.type === ('Button' as never) && node.props.accessibilityLabel === '重新查詢原匯出工作',
  );
  await act(async () => retry.props.onPress());
  await act(async () => {
    jest.advanceTimersByTime(900);
  });
  expect(createExport).toHaveBeenCalledTimes(1);
  expect(getExport).toHaveBeenLastCalledWith('u1', 'job1', expect.any(Object));
  expect(
    screen.root
      .findAllByType('Text' as never)
      .map((node) => JSON.stringify(node.props.children))
      .join(''),
  ).toContain('報告已完成');
});
