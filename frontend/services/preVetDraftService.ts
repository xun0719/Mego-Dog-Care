import AsyncStorage from '@react-native-async-storage/async-storage';
const prefix = 'mego:pre-vet-draft:';
const queues = new Map<string, Promise<unknown>>();
export async function readPreVetDraft(userId: string, petId: string) {
  const key = `${prefix}${userId}:${petId}`;
  await queues.get(key)?.catch(() => undefined);
  return (await AsyncStorage.getItem(key)) ?? '';
}
export function savePreVetDraft(userId: string, petId: string, value: string) {
  const key = `${prefix}${userId}:${petId}`;
  const pending = (queues.get(key) ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key, value));
  queues.set(key, pending);
  return pending;
}
export async function clearPreVetDrafts(userId: string) {
  await Promise.allSettled(
    [...queues].filter(([key]) => key.startsWith(`${prefix}${userId}:`)).map(([, value]) => value),
  );
  const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
    key.startsWith(`${prefix}${userId}:`),
  );
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
