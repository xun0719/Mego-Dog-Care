import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  captureExportGeneration,
  clearExportTracking,
  readExportTracking,
  writeExportTracking,
} from '../exportTrackingService';
const values = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
beforeEach(() => {
  values.clear();
  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (key) => values.get(key) ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    values.set(key, value);
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key) => {
    values.delete(key);
  });
});
const tracking = {
  job: { id: 'original-job', status: 'queued' },
  label: 'A · 最近 30 天',
  scope: 'current_pet',
  period: '30_days',
  petId: 'p1',
} as never;
test('pending export restores its original ID and snapshotted scope, isolated from another account', async () => {
  await writeExportTracking('A', tracking);
  expect(await readExportTracking('A')).toEqual(tracking);
  expect(await readExportTracking('B')).toBeNull();
});
test('logout invalidates delayed persistence; terminal jobs clear only owned tracking', async () => {
  const generation = captureExportGeneration('A');
  await writeExportTracking('B', tracking);
  await clearExportTracking('A');
  await writeExportTracking('A', tracking, generation);
  expect(await readExportTracking('A')).toBeNull();
  expect(await readExportTracking('B')).toEqual(tracking);
  await writeExportTracking('B', {
    ...(tracking as object),
    job: { id: 'original-job', status: 'completed' },
  } as never);
  expect(await readExportTracking('B')).toBeNull();
});
