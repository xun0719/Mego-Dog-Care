import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_SETTINGS, loadSettings, localNotificationsEnabled } from '../settingsService';
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }));
const read = AsyncStorage.getItem as jest.Mock;
test('only a missing settings key initializes defaults', async () => {
  read.mockResolvedValue(null);
  await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
});
test.each(['{bad-json', '{}', 'null', '[]'])(
  'corrupt settings %s never enables notifications',
  async (stored) => {
    read.mockResolvedValue(stored);
    await expect(localNotificationsEnabled()).rejects.toThrow();
  },
);
test('storage outage never turns a previously disabled preference on', async () => {
  read.mockResolvedValue(JSON.stringify({ ...DEFAULT_SETTINGS, localNotificationsEnabled: false }));
  await expect(localNotificationsEnabled()).resolves.toBe(false);
  read.mockRejectedValue(new Error('storage unavailable'));
  await expect(localNotificationsEnabled()).rejects.toThrow('storage unavailable');
});
