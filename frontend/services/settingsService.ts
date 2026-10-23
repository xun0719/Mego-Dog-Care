/** 用途：持久化非敏感 App 偏好；不保存帳密或秘密。 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { taipeiDateKey, taipeiDateFromKey } from '../utils/taipeiDate';
import { DEFAULT_HOME_THEME, HomeThemeId, isHomeThemeId } from '../constants/HomeThemeIds';
export interface AppSettings {
  localNotificationsEnabled: boolean;
  defaultReminderTime: string;
  tonightTime: string;
  homeTheme: HomeThemeId;
}
export const DEFAULT_SETTINGS: AppSettings = {
  localNotificationsEnabled: true,
  defaultReminderTime: '09:00',
  tonightTime: '20:00',
  homeTheme: DEFAULT_HOME_THEME,
};
const KEY = 'mego.app-settings.v1';
const validTime = (value: unknown) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export async function loadSettings(): Promise<AppSettings> {
  const stored = await AsyncStorage.getItem(KEY);
  if (stored === null) return { ...DEFAULT_SETTINGS };
  const value: unknown = JSON.parse(stored);
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    typeof (value as AppSettings).localNotificationsEnabled !== 'boolean'
  )
    throw new Error('設定無法讀取，請重試；手機通知暫不新增。');
  const data = value as AppSettings;
  return {
    ...DEFAULT_SETTINGS,
    localNotificationsEnabled: data.localNotificationsEnabled,
    defaultReminderTime: validTime(data.defaultReminderTime)
      ? data.defaultReminderTime
      : DEFAULT_SETTINGS.defaultReminderTime,
    tonightTime: validTime(data.tonightTime) ? data.tonightTime : DEFAULT_SETTINGS.tonightTime,
    homeTheme: isHomeThemeId(data.homeTheme) ? data.homeTheme : DEFAULT_SETTINGS.homeTheme,
  };
}

export async function saveSettings(value: AppSettings) {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
}
export async function resetSettings() {
  await AsyncStorage.removeItem(KEY);
  return DEFAULT_SETTINGS;
}
export async function localNotificationsEnabled() {
  return (await loadSettings()).localNotificationsEnabled;
}
export function timeOnDate(value: string, base = new Date()) {
  return taipeiDateFromKey(taipeiDateKey(base), value);
}
