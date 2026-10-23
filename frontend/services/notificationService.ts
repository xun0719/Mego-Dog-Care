/** 用途：集中管理 MEGO 本機通知權限、排程、取消、重排與帳號層級 reconciliation。 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Pet, Reminder } from '../types';
import { getReminders } from './reminderService';
import { localNotificationsEnabled } from './settingsService';

const CHANNEL_ID = 'mego-reminders';
const OWNER_KEY = 'mego-local-reminder';

const queues = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
const blocked = new Set<string>();
const pendingCancellations = new Set<string>();
let activeAccountId: string | null | undefined;
const generationOf = (userId: string) => generations.get(userId) ?? 0;
function invalidateAccountNotifications(userId: string) {
  generations.set(userId, generationOf(userId) + 1);
}
export function invalidateAllNotificationSchedules() {
  for (const userId of new Set([...generations.keys(), ...queues.keys()]))
    invalidateAccountNotifications(userId);
}
export function activateAccountNotifications(userId: string | null) {
  if (activeAccountId && activeAccountId !== userId) {
    invalidateAccountNotifications(activeAccountId);
    blocked.add(activeAccountId);
    pendingCancellations.add(activeAccountId);
  }
  activeAccountId = userId;
  if (userId) blocked.delete(userId);
}
function serialize<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const next = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(operation);
  queues.set(userId, next);
  void next
    .finally(() => {
      if (queues.get(userId) === next) queues.delete(userId);
    })
    .catch(() => undefined);
  return next;
}
export async function retryNotificationCancellations() {
  // The OS inventory survives app restarts, unlike the in-memory retry set.
  if (activeAccountId !== undefined) {
    for (const request of await getMegoScheduledNotifications()) {
      const userId = dataOf(request).userId;
      if (typeof userId === 'string' && userId !== activeAccountId)
        pendingCancellations.add(userId);
    }
  }
  await Promise.all(
    [...pendingCancellations].map((userId) =>
      serialize(userId, async () => {
        await cancelAccountInternal(userId);
        pendingCancellations.delete(userId);
      }),
    ),
  );
}

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';
export type ScheduleResult =
  | { status: 'scheduled'; identifier: string }
  | { status: 'denied' | 'expired' | 'disabled' };
export type NotificationTarget = { userId: string; reminderId: string; petId: string };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const isGranted = (settings: Notifications.NotificationPermissionsStatus) =>
  settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: '照護提醒',
    description: 'MEGO 毛孩照護與回診提醒',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  const settings = await Notifications.getPermissionsAsync();
  if (isGranted(settings)) return 'granted';
  return settings.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (isGranted(current)) return 'granted';
  if (current.status !== 'undetermined') return 'denied';
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return isGranted(requested) ? 'granted' : 'denied';
}

const dataOf = (request: Notifications.NotificationRequest) => request.content.data ?? {};
const isMegoReminder = (request: Notifications.NotificationRequest) =>
  dataOf(request).owner === OWNER_KEY;
const isForUser = (request: Notifications.NotificationRequest, userId: string) =>
  isMegoReminder(request) && dataOf(request).userId === userId;
const isForReminder = (request: Notifications.NotificationRequest, reminderId: string) =>
  isMegoReminder(request) && dataOf(request).reminderId === reminderId;

export async function getMegoScheduledNotifications(userId?: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((item) => (userId ? isForUser(item, userId) : isMegoReminder(item)));
}

async function scheduleInternal(
  userId: string,
  reminder: Reminder,
  petName: string,
  requestPermission = true,
  generation = generationOf(userId),
): Promise<ScheduleResult> {
  if (
    (activeAccountId !== undefined && activeAccountId !== userId) ||
    blocked.has(userId) ||
    generation !== generationOf(userId) ||
    !(await localNotificationsEnabled())
  )
    return { status: 'disabled' };
  const date = new Date(reminder.scheduledAt);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now())
    return { status: 'expired' };
  const permission = requestPermission
    ? await requestNotificationPermission()
    : await getNotificationPermissionState();
  if (permission !== 'granted') return { status: 'denied' };
  await ensureAndroidChannel();
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'MEGO 提醒 🐾',
      body:
        reminder.type === 'follow_up'
          ? `${petName} 今天需要回診`
          : `${petName} 的${reminder.title}時間到了`,
      sound: 'default',
      data: {
        owner: OWNER_KEY,
        userId,
        reminderId: reminder.id,
        petId: reminder.petId,
        scheduledAt: reminder.scheduledAt,
        reminderTitle: reminder.title,
        petName,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date,
      channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
    },
  });
  let valid = false;
  try {
    valid =
      (activeAccountId === undefined || activeAccountId === userId) &&
      !blocked.has(userId) &&
      generation === generationOf(userId) &&
      (await localNotificationsEnabled());
  } finally {
    if (!valid) {
      pendingCancellations.add(userId);
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  }
  return valid ? { status: 'scheduled', identifier } : { status: 'disabled' };
}

export async function cancelReminderNotifications(reminderId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) => isForReminder(item, reminderId))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

async function replaceInternal(userId: string, reminder: Reminder, petName: string) {
  await cancelReminderNotifications(reminder.id);
  return scheduleInternal(userId, reminder, petName);
}

async function cancelAccountInternal(userId: string) {
  const scheduled = await getMegoScheduledNotifications(userId);
  await Promise.all(
    scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  );
}

export function scheduleReminderNotification(
  userId: string,
  reminder: Reminder,
  petName: string,
  requestPermission = true,
) {
  const generation = generationOf(userId);
  return serialize(userId, () =>
    scheduleInternal(userId, reminder, petName, requestPermission, generation),
  );
}
export function replaceReminderNotification(userId: string, reminder: Reminder, petName: string) {
  return serialize(userId, () => replaceInternal(userId, reminder, petName));
}
export function cancelAccountNotifications(userId: string) {
  if (activeAccountId === userId) activeAccountId = null;
  blocked.add(userId);
  invalidateAccountNotifications(userId);
  pendingCancellations.add(userId);
  return serialize(userId, async () => {
    await cancelAccountInternal(userId);
    pendingCancellations.delete(userId);
  });
}
export function reconcileAccountNotifications(userId: string, pets: Pet[]) {
  const generation = generationOf(userId);
  return serialize(userId, () => reconcileInternal(userId, pets, generation));
}
async function reconcileInternal(userId: string, pets: Pet[], generation: number) {
  if (
    (activeAccountId !== undefined && activeAccountId !== userId) ||
    blocked.has(userId) ||
    generation !== generationOf(userId) ||
    !(await localNotificationsEnabled())
  ) {
    const scheduled = await getMegoScheduledNotifications(userId);
    await Promise.all(
      scheduled.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    return { scheduled: 0, cancelled: scheduled.length, permission: 'undetermined' as const };
  }

  const remindersByPet = await Promise.all(
    // 回憶中的毛孩不再排定通知；後端也會把它的未完成提醒改為略過。
    pets
      .filter((pet) => !pet.memorial)
      .map(async (pet) => ({ pet, reminders: await getReminders(userId, pet.id) })),
  );
  const desired = remindersByPet.flatMap(({ pet, reminders }) =>
    reminders
      .filter(
        (item) =>
          ['pending', 'snoozed'].includes(item.status) &&
          new Date(item.scheduledAt).getTime() > Date.now(),
      )
      .map((reminder) => ({ reminder, petName: pet.name })),
  );
  const desiredIds = new Set(desired.map(({ reminder }) => reminder.id));
  const scheduled = await getMegoScheduledNotifications(userId);
  let cancelled = 0;
  let created = 0;

  for (const request of scheduled) {
    const data = dataOf(request);
    const reminderId = typeof data.reminderId === 'string' ? data.reminderId : '';
    if (!desiredIds.has(reminderId)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
      cancelled += 1;
    }
  }

  const permission = desired.length
    ? await requestNotificationPermission()
    : await getNotificationPermissionState();
  if (permission !== 'granted') return { scheduled: 0, cancelled, permission };

  for (const { reminder, petName } of desired) {
    const current = (await getMegoScheduledNotifications(userId)).filter((item) =>
      isForReminder(item, reminder.id),
    );
    const exact = current.filter((item) => {
      const data = dataOf(item);
      return (
        data.scheduledAt === reminder.scheduledAt &&
        data.reminderTitle === reminder.title &&
        data.petName === petName
      );
    });
    const stale = exact.length
      ? current.filter((item) => item.identifier !== exact[0].identifier)
      : current;
    await Promise.all(
      stale.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    cancelled += stale.length;
    if (!exact.length) {
      const result = await scheduleInternal(userId, reminder, petName, false, generation);
      if (result.status === 'scheduled') created += 1;
    }
  }
  return { scheduled: created, cancelled, permission };
}

export function subscribeToNotificationResponses(handler: (target: NotificationTarget) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    if (!data || data.owner !== OWNER_KEY) return;
    if (
      typeof data.userId === 'string' &&
      typeof data.reminderId === 'string' &&
      typeof data.petId === 'string'
    ) {
      handler({ userId: data.userId, reminderId: data.reminderId, petId: data.petId });
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    }
  };
  Notifications.getLastNotificationResponseAsync()
    .then(handle)
    .catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
