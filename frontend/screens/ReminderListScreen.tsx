import Animated from 'react-native-reanimated';
import {
  RecordListItem,
  RecordListScope,
  useRecordListMotion,
} from '../components/RecordListMotion';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：顯示毛孩提醒，提供編輯、完成、略過、延後、刪除與通知同步。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { AppButton } from '../components/AppButton';
import { RecordActionButton } from '../components/RecordActionButton';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import DatePickerField from '../components/DatePickerField';
import { tonightAt } from '../constants/Reminders';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import { HomeStackParamList } from '../navigation/types';
import {
  cancelReminderNotifications,
  reconcileAccountNotifications,
  replaceReminderNotification,
} from '../services/notificationService';
import * as service from '../services/reminderService';
import { Reminder } from '../types';
import {
  getVisibleReminders,
  groupReminderEntries,
  REMINDER_ARTWORKS,
} from '../features/reminders/reminderListContent';
import ReminderListCard from '../features/reminders/components/ReminderListCard';
import ReminderListHeader from '../features/reminders/components/ReminderListHeader';
import {
  ReminderListLoadingState,
  default as ReminderListState,
} from '../features/reminders/components/ReminderListState';
import { Type } from '../constants/Typography';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';

type Props = NativeStackScreenProps<HomeStackParamList, 'ReminderList'>;

export default function ReminderListScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { pets, selectedPet } = usePet();
  const { settings } = useSettings();
  const [storedItems, setItems] = useState<Reminder[]>([]);
  const ownerKey = `${session?.userId ?? ''}:${selectedPet?.id ?? ''}`;
  const listMotion = useRecordListMotion(ownerKey);
  const requestedOwner = useRef('');
  const [loadedOwner, setLoadedOwner] = useState('');
  const items = useMemo(
    () => (loadedOwner === ownerKey ? storedItems : []),
    [loadedOwner, ownerKey, storedItems],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [customSnoozeId, setCustomSnoozeId] = useState<string | null>(null);
  const [moreItem, setMoreItem] = useState<Reminder | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const requestId = useRef(0);
  const mutationLock = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++requestId.current;
      if (!selectedPet || !session?.userId) {
        setItems([]);
        setLoadedOwner(ownerKey);
        setLoading(false);
        return;
      }
      setError('');
      setLoading(true);
      if (requestedOwner.current !== ownerKey) {
        requestedOwner.current = ownerKey;
        setItems([]);
        setLoadedOwner(ownerKey);
        setLoading(true);
        setError('');
      }
      try {
        const reminders = await service.getReminders(session.userId, selectedPet.id, signal);
        if (current === requestId.current) {
          setItems(reminders);
          setLoadedOwner(ownerKey);
        }
      } catch (requestError) {
        if (current === requestId.current && !signal?.aborted)
          setError((requestError as Error).message);
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [selectedPet, session?.userId, ownerKey],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  const reconcile = async () => {
    if (!session?.userId) return;
    try {
      await reconcileAccountNotifications(session.userId, pets);
    } catch {
      Alert.alert('通知同步失敗', '提醒資料已更新，手機通知將在下次開啟 App 時再次同步。');
    }
  };

  const run = async (id: string, task: () => Promise<unknown>) => {
    if (mutationLock.current || loadedOwner !== ownerKey) return;
    mutationLock.current = true;
    setBusyId(id);
    try {
      await task();
      await reconcile();
      await load();
    } catch (requestError) {
      Alert.alert('操作失敗', (requestError as Error).message);
    } finally {
      mutationLock.current = false;
      setBusyId(null);
    }
  };

  const complete = (id: string) =>
    run(id, async () => {
      await service.completeReminder(session!.userId, id);
      await cancelReminderNotifications(id).catch(() => undefined);
    });

  const skip = (item: Reminder) =>
    Alert.alert('略過提醒', `略過「${item.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '略過',
        onPress: () =>
          run(item.id, async () => {
            await service.skipReminder(session!.userId, item.id);
            await cancelReminderNotifications(item.id).catch(() => undefined);
          }),
      },
    ]);

  const snooze = (item: Reminder) =>
    Alert.alert('延後提醒', item.title, [
      { text: '取消', style: 'cancel' },
      { text: '1 小時後', onPress: () => runSnooze(item, new Date(Date.now() + 3600000)) },
      { text: '今晚', onPress: () => runSnooze(item, tonightAt(new Date(), settings.tonightTime)) },
      { text: '明天', onPress: () => runSnooze(item, new Date(Date.now() + 86400000)) },
      { text: '自訂時間', onPress: () => setCustomSnoozeId(item.id) },
    ]);

  const runSnooze = (item: Reminder, date: Date) =>
    run(item.id, async () => {
      const updated = await service.snoozeReminder(session!.userId, item.id, date.toISOString());
      await replaceReminderNotification(session!.userId, updated, selectedPet!.name).catch(
        () => undefined,
      );
    });

  const remove = (item: Reminder) =>
    Alert.alert('刪除提醒', `確定刪除「${item.title}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () =>
          run(item.id, async () => {
            await cancelReminderNotifications(item.id).catch(() => undefined);
            await service.deleteReminder(session!.userId, item.id);
          }),
      },
    ]);

  const upcomingDays = route.params?.upcomingDays;
  const scheduledDate = route.params?.scheduledDate;
  const visibleItems = useMemo(
    () => getVisibleReminders(items, upcomingDays, scheduledDate),
    [items, upcomingDays, scheduledDate],
  );
  const listEntries = useMemo(() => groupReminderEntries(visibleItems), [visibleItems]);
  const customItem = items.find((item) => item.id === customSnoozeId);
  const runAfterMoreClose = (action: () => void) => {
    setMoreItem(null);
    requestAnimationFrame(() => requestAnimationFrame(action));
  };
  if (loading || loadedOwner !== ownerKey)
    return (
      <ScreenPageState title="提醒" description="管理待辦與通知時間" icon="notifications">
        <ReminderListLoadingState />
      </ScreenPageState>
    );
  if (error)
    return (
      <ScreenPageState title="提醒" description="管理待辦與通知時間" icon="notifications">
        <ReminderListState text={error} onAction={load} />
      </ScreenPageState>
    );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <RecordListScope motion={listMotion}>
        <Animated.FlatList
          itemLayoutAnimation={listMotion.layout}
          data={listEntries}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
                reconcile();
              }}
            />
          }
          ListHeaderComponent={
            <>
              <ScreenPageHeader
                title="提醒"
                description="管理待辦與通知時間"
                icon="notifications"
                iconColor={Colors.primaryDecoration}
                iconBackground={Colors.primarySoft}
                style={{ marginBottom: 12 }}
              />
              {customItem && (
                <DatePickerField
                  label="自訂延後時間"
                  mode="datetime"
                  minimumDate={new Date()}
                  onChange={(date) => {
                    const item = customItem;
                    setCustomSnoozeId(null);
                    runSnooze(item, date);
                  }}
                />
              )}
              <ReminderListHeader
                upcomingDays={upcomingDays}
                scheduledDate={scheduledDate}
                count={visibleItems.length}
                showMissingSource={Boolean(
                  route.params?.focusReminderId &&
                    !items.some((item) => item.id === route.params?.focusReminderId),
                )}
                onCreate={
                  selectedPet?.memorial ? undefined : () => navigation.navigate('CreateReminder')
                }
              />
            </>
          }
          ListEmptyComponent={
            <ReminderListState
              text={scheduledDate ? '這一天沒有安排提醒' : '尚未建立提醒'}
              artwork={REMINDER_ARTWORKS[settings.homeTheme]}
            />
          }
          renderItem={({ item: entry, index }) => {
            if (entry.kind === 'heading')
              return <Text style={styles.sectionHeading}>{entry.title}</Text>;
            const item = entry.item;
            return (
              <RecordListItem motion={listMotion} id={entry.id} index={index}>
                <ReminderListCard
                  item={item}
                  focused={route.params?.focusReminderId === item.id}
                  busyId={busyId}
                  onComplete={() => complete(item.id)}
                  onSnooze={() => snooze(item)}
                  onMore={() => setMoreItem(item)}
                />
              </RecordListItem>
            );
          }}
        />
      </RecordListScope>
      <Modal
        visible={Boolean(moreItem)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMoreItem(null)}
      >
        <View style={styles.moreOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="關閉提醒選單"
            style={StyleSheet.absoluteFill}
            onPress={() => setMoreItem(null)}
          />
          {moreItem ? (
            <View style={styles.morePanel}>
              <View style={styles.moreHandle} />
              <Text style={styles.moreTitle}>提醒選項</Text>
              <Text style={styles.moreSubtitle} numberOfLines={2}>
                {moreItem.title}
              </Text>
              {moreItem.status === 'pending' || moreItem.status === 'snoozed' ? (
                <>
                  {moreItem.sourceType !== 'medical_visit' ? (
                    <RecordActionButton
                      kind="edit"
                      label="編輯提醒"
                      style={styles.moreAction}
                      onPress={() =>
                        runAfterMoreClose(() =>
                          navigation.navigate('CreateReminder', { reminder: moreItem }),
                        )
                      }
                    />
                  ) : null}
                  <AppButton
                    title="略過提醒"
                    variant="secondary"
                    style={styles.moreAction}
                    onPress={() => runAfterMoreClose(() => skip(moreItem))}
                  />
                </>
              ) : null}
              <RecordActionButton
                kind="delete"
                label="刪除提醒"
                style={styles.moreAction}
                onPress={() => runAfterMoreClose(() => remove(moreItem))}
              />
              <AppButton
                title="取消"
                variant="tertiary"
                style={styles.moreCancel}
                onPress={() => setMoreItem(null)}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 34 },
  sectionHeading: {
    color: Colors.text,
    fontSize: Type.callout,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 8,
  },
  moreOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(46, 36, 29, 0.34)',
  },
  morePanel: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 10,
  },
  moreHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: Colors.border,
    marginBottom: 3,
  },
  moreTitle: { color: Colors.text, fontSize: Type.headline, fontWeight: '800' },
  moreSubtitle: { color: Colors.subtext, marginTop: -5, marginBottom: 2 },
  moreAction: { width: '100%' },
  moreCancel: { width: '100%', minHeight: 44 },
});
