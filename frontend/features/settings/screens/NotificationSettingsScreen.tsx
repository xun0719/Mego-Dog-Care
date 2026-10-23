/** 用途：手機權限與照護提醒設定頁。 */
import React, { useCallback, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import { useSettings } from '../../../contexts/SettingsContext';
import {
  reconcileAccountNotifications,
  getNotificationPermissionState,
  requestNotificationPermission,
  NotificationPermissionState,
} from '../../../services/notificationService';
import {
  SettingsPage as Page,
  SettingsRow as Row,
  settingsPalette as palette,
} from '../components/SettingsLayout';
import { Colors } from '../../../constants/Colors';
import { Type } from '../../../constants/Typography';

export function NotificationSettingsScreen() {
  const { pets } = usePet();
  const syncLock = useRef(false);
  const pendingValue = useRef<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const { session } = useAuth();
  const { settings, update, saving } = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState | null>('undetermined');
  const [photoPermission, setPhotoPermission] = useState('尚未詢問');
  const [cameraPermission, setCameraPermission] = useState('尚未詢問');
  const [locationPermission, setLocationPermission] = useState('尚未詢問');
  const refreshPermissions = useCallback(async () => {
    const [notificationResult, photoResult, cameraResult, locationResult] =
      await Promise.allSettled([
        getNotificationPermissionState(),
        ImagePicker.getMediaLibraryPermissionsAsync(),
        ImagePicker.getCameraPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
    const photos = photoResult.status === 'fulfilled' ? photoResult.value : null;
    const camera = cameraResult.status === 'fulfilled' ? cameraResult.value : null;
    const location = locationResult.status === 'fulfilled' ? locationResult.value : null;
    setPermission(notificationResult.status === 'fulfilled' ? notificationResult.value : null);
    setPhotoPermission(
      !photos
        ? '暫時無法讀取'
        : photos.accessPrivileges === 'limited'
          ? '僅允許所選照片'
          : photos.granted
            ? '已開啟'
            : photos.status === 'denied'
              ? '未開啟'
              : '尚未詢問',
    );
    setCameraPermission(
      !camera
        ? '暫時無法讀取'
        : camera.granted
          ? '已開啟'
          : camera.status === 'denied'
            ? '未開啟'
            : '尚未詢問',
    );
    setLocationPermission(
      !location
        ? '暫時無法讀取'
        : location.granted
          ? '已開啟'
          : location.status === 'denied'
            ? '未開啟'
            : '尚未詢問',
    );
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refreshPermissions();
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void refreshPermissions();
      });
      return () => subscription.remove();
    }, [refreshPermissions]),
  );
  const synchronize = async () => {
    if (!session?.userId) return;
    const result = await reconcileAccountNotifications(session.userId, pets);
    setPermission(
      result.permission === 'undetermined'
        ? await getNotificationPermissionState()
        : result.permission,
    );
  };
  const toggle = async (value: boolean) => {
    if (!session?.userId || syncLock.current) return;
    pendingValue.current = value;
    syncLock.current = true;
    setSyncing(true);
    setSyncError('');
    let preferenceSaved = false;
    try {
      await update({ localNotificationsEnabled: value });
      preferenceSaved = true;
      if (value) setPermission(await requestNotificationPermission());
      await synchronize();
    } catch {
      setSyncError(
        preferenceSaved ? '偏好已儲存，但手機通知排程尚未同步，請重試。' : '偏好尚未儲存，請重試。',
      );
    } finally {
      syncLock.current = false;
      setSyncing(false);
    }
  };
  return (
    <Page page="NotificationSettings">
      <Text style={s.subheading}>通知與照護提醒</Text>
      <Text style={s.sectionDescription}>讓 MEGO 在用藥、回診與日常照護時間提醒你。</Text>
      <View style={s.notificationCard}>
        <Row
          title="手機通知權限"
          value={
            permission === null
              ? '暫時無法讀取'
              : permission === 'granted'
                ? '已開啟'
                : permission === 'denied'
                  ? '未開啟'
                  : '尚未決定'
          }
          rowStyle={s.notificationInnerRow}
          icon="notifications-outline"
        />
        <View style={[s.row, s.notificationInnerRow]}>
          <Ionicons name="paw-outline" size={20} color={palette.primary} style={s.rowIcon} />
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle}>照護提醒</Text>
            <Text style={s.notificationDescription}>
              開啟後安排手機通知；關閉仍可在 App 內查看提醒。
            </Text>
          </View>
          <Switch
            style={s.notificationSwitch}
            accessibilityLabel="照護提醒"
            disabled={saving || syncing}
            value={settings.localNotificationsEnabled}
            onValueChange={toggle}
          />
        </View>
      </View>
      {syncing && <Text style={s.note}>正在同步手機通知排程…</Text>}
      {!!syncError && (
        <View>
          <Text style={s.note}>{syncError}</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="重試通知設定與同步"
            disabled={syncing}
            onPress={() => toggle(pendingValue.current ?? settings.localNotificationsEnabled)}
          >
            <Text style={s.note}>重試</Text>
          </TouchableOpacity>
        </View>
      )}
      {permission && permission !== 'granted' ? (
        <Text style={s.note}>手機通知尚未開啟，你仍可在 App 內查看提醒。</Text>
      ) : null}
      <Text style={s.subheading}>照片與相機</Text>
      <Text style={s.sectionDescription}>
        只有在你選擇照片或拍照時才會請求權限；MEGO 不會自行瀏覽整個相簿。
      </Text>
      <View style={s.notificationCard}>
        <Row
          title="相簿照片"
          value={photoPermission}
          rowStyle={s.notificationInnerRow}
          icon="images-outline"
        />
        <Row
          title="相機權限"
          value={cameraPermission}
          rowStyle={[s.notificationInnerRow, s.lastPermissionRow]}
          icon="camera-outline"
        />
      </View>
      <Text style={s.subheading}>就醫地圖定位</Text>
      <Text style={s.sectionDescription}>
        只有點選就醫地圖的「使用目前位置」時才會詢問授權與取得位置，用於醫院距離排序。不開啟仍可瀏覽及搜尋醫院；不使用背景定位。
      </Text>
      <View style={s.notificationCard}>
        <Row
          title="定位權限"
          value={locationPermission}
          rowStyle={[s.notificationInnerRow, s.lastPermissionRow]}
          icon="location-outline"
        />
      </View>
      <Row
        title="前往手機設定管理權限"
        icon="settings-outline"
        onPress={() => Linking.openSettings()}
        rowStyle={s.roundedActionRow}
      />
    </Page>
  );
}

const s = StyleSheet.create({
  subheading: {
    fontSize: Type.callout,
    fontWeight: '800',
    color: palette.text,
    marginTop: 16,
    marginBottom: 3,
  },
  sectionDescription: {
    color: palette.sub,
    lineHeight: 19,
    fontSize: Type.footnote,
    marginBottom: 10,
  },
  lastPermissionRow: { borderBottomWidth: 0 },
  notificationSwitch: { transform: [{ scale: 0.86 }], alignSelf: 'center', marginRight: -4 },
  roundedActionRow: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  notificationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  notificationInnerRow: { backgroundColor: Colors.surface },
  notificationDescription: {
    color: Colors.muted,
    fontSize: Type.caption,
    lineHeight: 17,
    marginTop: 3,
    textAlign: 'left',
  },
  row: {
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(228,221,212,0.70)',
    backgroundColor: Colors.surfaceWarm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: { marginRight: 10 },
  rowTitle: { flex: 1, fontSize: Type.body, fontWeight: '700', color: palette.text },
  note: { color: palette.sub, lineHeight: 19, fontSize: Type.footnote, marginVertical: 14 },
});
