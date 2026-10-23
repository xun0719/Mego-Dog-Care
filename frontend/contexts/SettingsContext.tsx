/** 用途：集中提供裝置層級設定、載入與可回復的持久化更新。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  resetSettings,
  saveSettings,
} from '../services/settingsService';
import { invalidateAllNotificationSchedules } from '../services/notificationService';
interface Value {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  reset: () => Promise<void>;
  reload: () => Promise<void>;
}
const Context = createContext<Value | undefined>(undefined);
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
    localNotificationsEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await loadSettings());
      setError(null);
    } catch (e) {
      setError((e as Error).message || '設定讀取失敗，請重試');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (patch.localNotificationsEnabled === false) invalidateAllNotificationSchedules();
      const previous = settings,
        next = { ...settings, ...patch };
      setSettings(next);
      setSaving(true);
      setError(null);
      try {
        await saveSettings(next);
      } catch (e) {
        setSettings(previous);
        setError((e as Error).message || '設定儲存失敗');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [settings],
  );
  const reset = async () => {
    setSaving(true);
    try {
      setSettings(await resetSettings());
      setError(null);
    } finally {
      setSaving(false);
    }
  };
  const value = useMemo(
    () => ({ settings, loading, saving, error, update, reset, reload }),
    [settings, loading, saving, error, update, reload],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSettings() {
  const value = useContext(Context);
  if (!value) throw new Error('useSettings 必須在 SettingsProvider 內使用');
  return value;
}
