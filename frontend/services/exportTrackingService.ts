import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExportJob, ExportPeriod, ExportScope } from '../types';
const key = (userId: string) => `mego:export-tracking:${userId}`;
export type ExportTracking = {
  job: ExportJob;
  label: string;
  scope: ExportScope;
  period: ExportPeriod;
  petId?: string;
};
const queues = new Map<string, Promise<unknown>>();
const generations = new Map<string, number>();
export const captureExportGeneration = (userId: string) => generations.get(userId) ?? 0;
function mutate<T>(userId: string, operation: () => Promise<T>) {
  const next = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(operation);
  queues.set(userId, next);
  return next;
}
export async function readExportTracking(userId: string): Promise<ExportTracking | null> {
  await queues.get(userId)?.catch(() => undefined);
  const raw = await AsyncStorage.getItem(key(userId));
  if (raw === null) return null;
  const value = JSON.parse(raw) as ExportTracking;
  if (
    !value?.job?.id ||
    typeof value.label !== 'string' ||
    !['queued', 'processing', 'completed', 'failed', 'cancelled'].includes(value.job.status)
  )
    throw new Error('本機匯出追蹤無法讀取，請重試。');
  return value;
}
export function writeExportTracking(
  userId: string,
  value: ExportTracking,
  generation = captureExportGeneration(userId),
) {
  return mutate(userId, async () => {
    if (generation !== captureExportGeneration(userId)) return;
    if (['completed', 'failed', 'cancelled'].includes(value.job.status))
      await AsyncStorage.removeItem(key(userId));
    else await AsyncStorage.setItem(key(userId), JSON.stringify(value));
  });
}
export function clearExportTracking(userId: string) {
  generations.set(userId, captureExportGeneration(userId) + 1);
  return mutate(userId, () => AsyncStorage.removeItem(key(userId)));
}
