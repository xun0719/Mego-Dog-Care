import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIUsage, ChatKnowledgeSource, ChatSource } from './aiService';

const key = (userId: string, petId: string) => `mego:ai-session:${userId}:${petId}`;
const historyKey = (userId: string, petId: string) => `mego:ai-sessions:${userId}:${petId}`;
let sessionIdSequence = 0;
const createSessionId = () => {
  sessionIdSequence = (sessionIdSequence + 1) % Number.MAX_SAFE_INTEGER;
  return `session-${Date.now()}-${sessionIdSequence}`;
};
export type StoredMessage = {
  role: 'user' | 'assistant';
  text: string;
  sources?: ChatSource[];
  knowledgeSources?: ChatKnowledgeSource[];
  contextTokens?: number;
  generationMode?: string;
};
export type AISession = { sessionId?: string; messages?: StoredMessage[]; usage?: AIUsage };

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const validMessages = (value: unknown) =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      isObject(item) &&
      (item.role === 'user' || item.role === 'assistant') &&
      typeof item.text === 'string' &&
      (item.sources === undefined ||
        (Array.isArray(item.sources) &&
          item.sources.every(
            (source) =>
              isObject(source) &&
              typeof source.type === 'string' &&
              typeof source.label === 'string',
          ))) &&
      (item.knowledgeSources === undefined ||
        (Array.isArray(item.knowledgeSources) &&
          item.knowledgeSources.every(
            (source) =>
              isObject(source) &&
              ['title', 'documentTitle', 'section', 'url'].every(
                (field) => typeof source[field] === 'string',
              ),
          ))) &&
      (item.contextTokens === undefined ||
        (typeof item.contextTokens === 'number' && Number.isFinite(item.contextTokens))) &&
      (item.generationMode === undefined || typeof item.generationMode === 'string'),
  );
const validCounter = (value: unknown) =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const validUsage = (value: unknown) =>
  isObject(value) &&
  validCounter(value.used) &&
  validCounter(value.tokensUsed) &&
  (value.dailyLimit === null || validCounter(value.dailyLimit)) &&
  (value.remaining === null || validCounter(value.remaining)) &&
  typeof value.date === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
  (value.unlimited === undefined || typeof value.unlimited === 'boolean');
const invalidStorage = () => new Error('本機對話資料無法讀取，請重新載入；原資料尚未變更。');
const queues = new Map<string, Promise<unknown>>();
const deletedSessions = new Set<string>();
const accountGenerations = new Map<string, number>();
export const captureAISessionGeneration = (userId: string) => accountGenerations.get(userId) ?? 0;
const sessionIdentity = (userId: string, petId: string, sessionId: string) =>
  `${key(userId, petId)}:${sessionId}`;
function mutate<T>(userId: string, petId: string, action: () => Promise<T>): Promise<T> {
  const owner = `account:${userId}`;
  const next = (queues.get(owner) ?? Promise.resolve()).catch(() => undefined).then(action);
  queues.set(owner, next);
  void next
    .finally(() => {
      if (queues.get(owner) === next) queues.delete(owner);
    })
    .catch(() => undefined);
  return next;
}
export async function loadAISession(userId: string, petId: string): Promise<AISession> {
  const stored = await AsyncStorage.getItem(key(userId, petId));
  if (stored === null) return {};
  const value: unknown = JSON.parse(stored);
  if (
    !isObject(value) ||
    Object.keys(value).some((field) => !['sessionId', 'messages', 'usage'].includes(field)) ||
    (value.sessionId !== undefined && (typeof value.sessionId !== 'string' || !value.sessionId)) ||
    (value.messages !== undefined && !validMessages(value.messages)) ||
    (value.usage !== undefined && !validUsage(value.usage))
  )
    throw invalidStorage();
  return value as AISession;
}
async function writeSession(userId: string, petId: string, value: AISession) {
  await AsyncStorage.setItem(key(userId, petId), JSON.stringify(value));
}
export type AISessionRecord = {
  id: string;
  title: string;
  messages: StoredMessage[];
  createdAt: string;
  updatedAt: string;
};
export async function loadAISessions(userId: string, petId: string): Promise<AISessionRecord[]> {
  const stored = await AsyncStorage.getItem(historyKey(userId, petId));
  if (stored === null) return [];
  const value: unknown = JSON.parse(stored);
  if (
    !Array.isArray(value) ||
    !value.every(
      (item) =>
        isObject(item) &&
        typeof item.id === 'string' &&
        Boolean(item.id) &&
        typeof item.title === 'string' &&
        typeof item.createdAt === 'string' &&
        Number.isFinite(Date.parse(item.createdAt)) &&
        typeof item.updatedAt === 'string' &&
        Number.isFinite(Date.parse(item.updatedAt)) &&
        validMessages(item.messages),
    )
  )
    throw invalidStorage();
  return value as AISessionRecord[];
}

export async function deleteAISession(userId: string, petId: string, sessionId: string) {
  deletedSessions.add(sessionIdentity(userId, petId, sessionId));
  return mutate(userId, petId, async () => {
    const active = await loadAISession(userId, petId);
    const sessions = await loadAISessions(userId, petId);
    if (active.sessionId === sessionId)
      await writeSession(userId, petId, { messages: [], usage: active.usage });
    await AsyncStorage.setItem(
      historyKey(userId, petId),
      JSON.stringify(sessions.filter((item) => item.id !== sessionId)),
    );
  });
}

export async function clearAccountAISessions(userId: string) {
  accountGenerations.set(userId, captureAISessionGeneration(userId) + 1);
  return mutate(userId, '', async () => {
    const prefixes = [`mego:ai-session:${userId}:`, `mego:ai-sessions:${userId}:`];
    const keys = await AsyncStorage.getAllKeys();
    const ownedKeys = keys.filter((storedKey) =>
      prefixes.some((prefix) => storedKey.startsWith(prefix)),
    );
    for (const storedKey of ownedKeys) {
      const raw = await AsyncStorage.getItem(storedKey);
      if (!raw) continue;
      try {
        const stored = JSON.parse(raw);
        const petId = storedKey.slice(
          storedKey.startsWith(prefixes[0]) ? prefixes[0].length : prefixes[1].length,
        );
        for (const id of Array.isArray(stored) ? stored.map((item) => item.id) : [stored.sessionId])
          if (typeof id === 'string') deletedSessions.add(sessionIdentity(userId, petId, id));
      } catch {
        /* Clearing corrupted data remains safe; generation already invalidates pending requests. */
      }
    }
    if (ownedKeys.length) await AsyncStorage.multiRemove(ownedKeys);
  });
}

export async function activateAISession(userId: string, petId: string, session: AISessionRecord) {
  return mutate(userId, petId, async () => {
    const current = await loadAISession(userId, petId);
    await loadAISessions(userId, petId);
    await writeSession(userId, petId, {
      sessionId: session.id,
      messages: session.messages,
      usage: current.usage,
    });
  });
}
export async function activateEmptyAISession(userId: string, petId: string) {
  return mutate(userId, petId, async () => {
    const current = await loadAISession(userId, petId);
    await loadAISessions(userId, petId);
    const sessionId = createSessionId();
    await writeSession(userId, petId, { sessionId, messages: [], usage: current.usage });
    return sessionId;
  });
}
export async function saveActiveAISession(
  userId: string,
  petId: string,
  sessionId: string,
  messages: StoredMessage[],
  usage?: AIUsage,
  generation = captureAISessionGeneration(userId),
) {
  if (!sessionId || !validMessages(messages)) throw invalidStorage();
  return mutate(userId, petId, async () => {
    if (
      generation !== captureAISessionGeneration(userId) ||
      deletedSessions.has(sessionIdentity(userId, petId, sessionId))
    )
      return;
    // Read before either write: corrupt storage must never be replaced by an empty history.
    const current = await loadAISession(userId, petId);
    const sessions = await loadAISessions(userId, petId);
    const now = new Date().toISOString();
    const previous = sessions.find((item) => item.id === sessionId);
    const record: AISessionRecord = {
      id: sessionId,
      title: messages.find((message) => message.role === 'user')?.text.slice(0, 24) || '新的對話',
      messages,
      createdAt: previous?.createdAt || now,
      updatedAt: now,
    };
    const updated = [record, ...sessions.filter((item) => item.id !== sessionId)]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
    await AsyncStorage.setItem(historyKey(userId, petId), JSON.stringify(updated));
    // A delayed reply belongs to the request's ID; it must not activate A over a newer B.
    if (current.sessionId === sessionId)
      await writeSession(userId, petId, { sessionId, messages, usage });
  });
}
