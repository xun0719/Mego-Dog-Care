jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  getNotificationPermissionState,
  reconcileAccountNotifications,
} from '../../../services/notificationService';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';

const mockRemove = jest.fn();
let mockAppStateListener: (state: string) => void;
jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  Switch: 'Switch',
  TouchableOpacity: 'TouchableOpacity',
  Pressable: 'TouchableOpacity',
  StyleSheet: { create: (styles: object) => styles },
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Linking: { openSettings: jest.fn() },
  AppState: {
    addEventListener: (_event: string, listener: (state: string) => void) => {
      mockAppStateListener = listener;
      return { remove: mockRemove };
    },
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('expo-constants', () => ({ expoConfig: {} }));
jest.mock('expo-image-picker', () => ({
  getMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  getCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, status: 'denied' }),
}));
jest.mock('expo-location', () => ({
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ session: { userId: 'u1' } }),
}));
jest.mock('../../../contexts/PetContext', () => ({
  usePet: jest.fn().mockReturnValue({ pets: [] }),
}));
jest.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { localNotificationsEnabled: false }, update: jest.fn() }),
}));
jest.mock('../../../services/notificationService', () => ({
  getNotificationPermissionState: jest.fn().mockResolvedValue('granted'),
  requestNotificationPermission: jest.fn(),
  reconcileAccountNotifications: jest
    .fn()
    .mockResolvedValue({ permission: 'granted', scheduled: 0, cancelled: 0 }),
}));
jest.mock('../components/SettingsLayout', () => ({
  SettingsPage: 'Page',
  SettingsRow: 'Row',
  SettingsDocumentParagraph: 'Paragraph',
  SettingsDocumentSection: 'Section',
  settingsPalette: {},
}));
jest.mock('../../pets/components/PetIdentityCarousel', () => ({
  PetIdentityCarousel: 'PetIdentityCarousel',
}));

let screen: ReactTestRenderer;
const row = (title: string) =>
  screen.root.findAll((node) => node.type === ('Row' as never) && node.props.title === title)[0];
const mount = async () => {
  await act(async () => {
    screen = create(<NotificationSettingsScreen />);
  });
};

beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each([
  [{ granted: true, status: 'granted' }, '已開啟'],
  [{ granted: false, status: 'denied' }, '未開啟'],
  [{ granted: false, status: 'undetermined' }, '尚未詢問'],
])(
  'reads location status without requesting permission or coordinates: %j',
  async (status, label) => {
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue(status);
    await mount();
    expect(row('定位權限').props.value).toBe(label);
    expect(row('相簿照片').props.value).toBe('已開啟');
    expect(row('相機權限').props.value).toBe('未開啟');
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  },
);

test('refreshes location status after returning from phone settings and removes listener on exit', async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock)
    .mockResolvedValueOnce({ granted: false, status: 'denied' })
    .mockResolvedValueOnce({ granted: true, status: 'granted' });
  await mount();
  expect(row('定位權限').props.value).toBe('未開啟');
  await act(async () => row('前往手機設定管理權限').props.onPress());
  expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  await act(async () => mockAppStateListener('active'));
  expect(row('定位權限').props.value).toBe('已開啟');
  await act(async () => screen.unmount());
  expect(mockRemove).toHaveBeenCalledTimes(1);
});

test('location status errors do not hide other permission states', async () => {
  (Location.getForegroundPermissionsAsync as jest.Mock).mockRejectedValue(new Error('unavailable'));
  await mount();
  expect(row('定位權限').props.value).toBe('暫時無法讀取');
  expect(row('手機通知權限').props.value).toBe('已開啟');
  expect(row('相簿照片').props.value).toBe('已開啟');
});

test('camera-read failures preserve independent notification and photo statuses', async () => {
  (ImagePicker.getCameraPermissionsAsync as jest.Mock).mockRejectedValueOnce(
    new Error('unavailable'),
  );
  await mount();
  expect(row('相機權限').props.value).toBe('暫時無法讀取');
  expect(row('相簿照片').props.value).toBe('已開啟');
  expect(row('手機通知權限').props.value).toBe('已開啟');
});
test('notification-read failures are distinguished from an undecided permission', async () => {
  (getNotificationPermissionState as jest.Mock).mockRejectedValueOnce(new Error('unavailable'));
  await mount();
  expect(row('手機通知權限').props.value).toBe('暫時無法讀取');
  expect(row('相機權限').props.value).toBe('未開啟');
});

test.each([false, true])(
  'saving notification preference %s immediately reconciles schedules',
  async (value) => {
    await mount();
    await act(async () => screen.root.findByType('Switch' as never).props.onValueChange(value));
    expect(reconcileAccountNotifications).toHaveBeenCalledWith('u1', []);
  },
);
