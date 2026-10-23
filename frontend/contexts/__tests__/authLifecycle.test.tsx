Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React, { useRef } from 'react';
import { act, create } from 'react-test-renderer';
import { AuthProvider, useAuth } from '../AuthContext';
import * as auth from '../../services/authService';
import { readAuthTokens, saveAuthTokens, clearAuthTokens } from '../../services/authTokenStorage';
import { cancelAccountNotifications } from '../../services/notificationService';
jest.mock('../../services/authService', () => ({
  refresh: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn().mockResolvedValue(undefined),
  deleteAccount: jest.fn(),
}));
jest.mock('../../services/petService', () => ({ normalizePets: (value: unknown) => value ?? [] }));
jest.mock('../../services/api', () => ({ setAuthExpiredHandler: jest.fn() }));
jest.mock('../../services/authTokenStorage', () => ({
  readAuthTokens: jest.fn().mockResolvedValue(null),
  saveAuthTokens: jest.fn().mockResolvedValue(undefined),
  clearAuthTokens: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/notificationService', () => ({
  activateAccountNotifications: jest.fn(),
  cancelAccountNotifications: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/aiSessionService', () => ({
  clearAccountAISessions: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../features/home/useFirstUseGuide', () => ({
  clearFirstUseGuide: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/exportTrackingService', () => ({
  clearExportTracking: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../services/preVetDraftService', () => ({
  clearPreVetDrafts: jest.fn().mockResolvedValue(undefined),
}));
let value!: ReturnType<typeof useAuth>;
let marker!: symbol;
function Probe() {
  value = useAuth();
  marker = useRef(Symbol('mounted-input')).current;
  return null;
}
let screen!: ReturnType<typeof create>;
beforeEach(async () => {
  jest.clearAllMocks();
  (readAuthTokens as jest.Mock).mockResolvedValue(null);
  await act(async () => {
    screen = create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => screen.unmount());
});
test.each(['login', 'register'])(
  'failed %s does not re-enter restoration or remount existing inputs',
  async (operation) => {
    let reject!: (reason: Error) => void;
    (auth[operation as 'login' | 'register'] as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    const initial = marker;
    let pending!: Promise<void>;
    await act(async () => {
      pending = value[operation as 'login' | 'register']('user@example.com', 'typed-password');
      void pending.catch(() => undefined);
    });
    expect(value.isRestoring).toBe(false);
    expect(value.isSubmitting).toBe(true);
    expect(marker).toBe(initial);
    await act(async () => {
      reject(new Error('wrong password or offline'));
      await pending.catch(() => undefined);
    });
    expect(value.error).toBe('wrong password or offline');
    expect(value.isRestoring).toBe(false);
    expect(marker).toBe(initial);
  },
);
test('logout cancels the former account and serializes credential clearing before a new login save', async () => {
  (auth.login as jest.Mock).mockResolvedValueOnce({
    userId: 'A',
    email: 'a@example.com',
    pets: [],
    accessToken: 'A-access',
    refreshToken: 'A-refresh',
    expiresIn: 100,
  });
  await act(async () => value.login('a@example.com', 'password'));
  let read!: (value: object) => void;
  (readAuthTokens as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        read = resolve;
      }),
  );
  await act(async () => {
    value.logout();
  });
  expect(cancelAccountNotifications).toHaveBeenCalledWith('A');
  (auth.login as jest.Mock).mockResolvedValueOnce({
    userId: 'B',
    email: 'b@example.com',
    pets: [],
    accessToken: 'B-access',
    refreshToken: 'B-refresh',
    expiresIn: 100,
  });
  let pending!: Promise<void>;
  await act(async () => {
    pending = value.login('b@example.com', 'password');
  });
  await act(async () => {
    read({ refreshToken: 'A-refresh' });
    await pending;
  });
  expect(value.session?.userId).toBe('B');
  expect((clearAuthTokens as jest.Mock).mock.invocationCallOrder.at(-1)).toBeLessThan(
    (saveAuthTokens as jest.Mock).mock.invocationCallOrder.at(-1)!,
  );
});
test('rejected account deletion keeps the same authenticated page and reports the error', async () => {
  (auth.login as jest.Mock).mockResolvedValueOnce({
    userId: 'A',
    pets: [],
    accessToken: 'A',
    refreshToken: 'A-refresh',
    expiresIn: 100,
  });
  await act(async () => value.login('a@example.com', 'password'));
  const initial = marker;
  (auth.deleteAccount as jest.Mock).mockRejectedValueOnce(new Error('deletion rejected'));
  await act(async () => {
    await value.deleteAccount('typed-password').catch(() => undefined);
  });
  expect(value.session?.userId).toBe('A');
  expect(value.error).toBe('deletion rejected');
  expect(value.isRestoring).toBe(false);
  expect(marker).toBe(initial);
});
