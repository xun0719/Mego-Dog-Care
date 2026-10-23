import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activateEmptyAISession,
  captureAISessionGeneration,
  clearAccountAISessions,
  deleteAISession,
  loadAISession,
  loadAISessions,
  saveActiveAISession,
} from '../aiSessionService';

const storedValues = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  jest.clearAllMocks();
  storedValues.clear();
  storage.getAllKeys.mockImplementation(async () => [...storedValues.keys()]);
  storage.multiRemove.mockImplementation(async (keys) => {
    keys.forEach((key) => storedValues.delete(key));
  });
  storage.getItem.mockImplementation(async (storageKey) => storedValues.get(storageKey) ?? null);
  storage.setItem.mockImplementation(async (storageKey, value) => {
    storedValues.set(storageKey, value);
  });
});

test('active session writes messages to history immediately', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', (await loadAISession('u1', 'p1')).sessionId!, [
    { role: 'user', text: '最近體重如何？' },
    { role: 'assistant', text: '最近一次體重為 8 公斤。' },
  ]);
  expect(storage.setItem).toHaveBeenCalledWith(
    'mego:ai-sessions:u1:p1',
    expect.stringContaining('最近體重如何？'),
  );
});

test('invalid stored session fails without overwriting history', async () => {
  storage.getItem.mockResolvedValue('{bad-json');
  await expect(loadAISession('u1', 'p1')).rejects.toThrow();
  await expect(loadAISessions('u1', 'p1')).rejects.toThrow();
});

test('session records remain isolated by user and pet', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', (await loadAISession('u1', 'p1')).sessionId!, [
    { role: 'user', text: 'Kuro question' },
  ]);
  await activateEmptyAISession('u1', 'p2');
  await saveActiveAISession('u1', 'p2', (await loadAISession('u1', 'p2')).sessionId!, [
    { role: 'user', text: 'Mimi question' },
  ]);
  await activateEmptyAISession('u2', 'p1');
  await saveActiveAISession('u2', 'p1', (await loadAISession('u2', 'p1')).sessionId!, [
    { role: 'user', text: 'Other account question' },
  ]);

  await expect(loadAISessions('u1', 'p1')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Kuro question' })]),
  );
  await expect(loadAISessions('u1', 'p2')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Mimi question' })]),
  );
  await expect(loadAISessions('u2', 'p1')).resolves.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Other account question' })]),
  );
  await expect(loadAISessions('u1', 'p1')).resolves.not.toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Mimi question' })]),
  );
});

test('deleting a session removes only the selected conversation', async () => {
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', (await loadAISession('u1', 'p1')).sessionId!, [
    { role: 'user', text: 'first' },
  ]);
  await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', (await loadAISession('u1', 'p1')).sessionId!, [
    { role: 'user', text: 'second' },
  ]);
  const sessions = await loadAISessions('u1', 'p1');

  await deleteAISession('u1', 'p1', sessions[0].id);

  await expect(loadAISessions('u1', 'p1')).resolves.toEqual([
    expect.objectContaining({ title: 'first' }),
  ]);
});

test('saved replies retain generation mode and both kinds of sources after reopening', async () => {
  await activateEmptyAISession('u1', 'p1');
  const messages = [
    {
      role: 'assistant' as const,
      text: '依紀錄整理',
      generationMode: 'deterministic',
      sources: [{ type: 'weight', label: '體重紀錄' }],
      knowledgeSources: [
        {
          title: '公開照護資料',
          documentTitle: '犬隻照護',
          section: '飲食',
          url: 'https://example.org/care',
        },
      ],
    },
  ];
  await saveActiveAISession('u1', 'p1', (await loadAISession('u1', 'p1')).sessionId!, messages);
  expect((await loadAISession('u1', 'p1')).messages).toEqual(messages);
  expect((await loadAISessions('u1', 'p1'))[0].messages).toEqual(messages);
});

test('a late A reply stays in A and leaves the active B untouched', async () => {
  const a = await activateEmptyAISession('u1', 'p1');
  const b = await activateEmptyAISession('u1', 'p1');
  await saveActiveAISession('u1', 'p1', a, [{ role: 'assistant', text: 'late A' }]);
  expect(await loadAISession('u1', 'p1')).toMatchObject({ sessionId: b, messages: [] });
  expect((await loadAISessions('u1', 'p1'))[0]).toMatchObject({ id: a });
});
test.each([
  'null',
  '[]',
  '{"messages":[{"role":"wrong","text":"x"}]}',
  '{"unknown":true}',
  '{"usage":{"used":0}}',
])('invalid active shape %s blocks all writes', async (stored) => {
  storedValues.set('mego:ai-session:u1:p1', stored);
  await expect(saveActiveAISession('u1', 'p1', 'a', [])).rejects.toThrow();
  expect(storage.setItem).not.toHaveBeenCalled();
});
test('storage read failures do not erase a conversation', async () => {
  storage.getItem.mockRejectedValue(new Error('offline storage'));
  await expect(activateEmptyAISession('u1', 'p1')).rejects.toThrow('offline storage');
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('corrupt history blocks new conversation activation before any write', async () => {
  storedValues.set('mego:ai-sessions:u1:p1', '{"not":"a history array"}');
  await expect(activateEmptyAISession('u1', 'p1')).rejects.toThrow();
  expect(storage.setItem).not.toHaveBeenCalled();
});

test('deleting the active session removes its messages and rejects a delayed save', async () => {
  const id = await activateEmptyAISession('delete-owner', 'p1');
  await saveActiveAISession('delete-owner', 'p1', id, [{ role: 'user', text: 'old' }]);
  await deleteAISession('delete-owner', 'p1', id);
  await saveActiveAISession('delete-owner', 'p1', id, [{ role: 'assistant', text: 'late' }]);
  expect((await loadAISession('delete-owner', 'p1')).messages).toEqual([]);
  expect(await loadAISessions('delete-owner', 'p1')).toEqual([]);
});
test('an account clear invalidates requests captured before removal and permits new sessions', async () => {
  const userId = 'cleared-owner';
  const id = await activateEmptyAISession(userId, 'p1');
  const generation = captureAISessionGeneration(userId);
  await clearAccountAISessions(userId);
  await saveActiveAISession(
    userId,
    'p1',
    id,
    [{ role: 'assistant', text: 'late' }],
    undefined,
    generation,
  );
  expect(await loadAISessions(userId, 'p1')).toEqual([]);
  expect(await loadAISession(userId, 'p1')).toEqual({});
  const fresh = await activateEmptyAISession(userId, 'p1');
  await saveActiveAISession(userId, 'p1', fresh, [{ role: 'user', text: 'new' }]);
  expect((await loadAISessions(userId, 'p1'))[0].id).toBe(fresh);
});
