import { clearExportTracking } from '../services/exportTrackingService';
import { clearPreVetDrafts } from '../services/preVetDraftService';
/** 用途：集中管理登入、註冊、SecureStore session 恢復與登出狀態。 */
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from 'react';

import * as authService from '../services/authService';
import { normalizePets } from '../services/petService';
import { ApiError, setAuthExpiredHandler } from '../services/api';
import { clearAuthTokens, readAuthTokens, saveAuthTokens } from '../services/authTokenStorage';
import {
  activateAccountNotifications,
  cancelAccountNotifications,
} from '../services/notificationService';
import { clearAccountAISessions } from '../services/aiSessionService';
import { clearFirstUseGuide } from '../features/home/useFirstUseGuide';
import { Pet } from '../types';

interface Session {
  userId: string;
  email: string;
  pets: Pet[];
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isRestoring: boolean;
  isSubmitting: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  deleteAccount: (password: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const operationLock = useRef(false);
  const credentialQueue = useRef<Promise<unknown>>(Promise.resolve());
  const credentials = useCallback(<T,>(operation: () => Promise<T>) => {
    const next = credentialQueue.current.catch(() => undefined).then(operation);
    credentialQueue.current = next;
    return next;
  }, []);
  const currentSession = useRef(session);
  currentSession.current = session;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      try {
        const tokens = await readAuthTokens();
        if (!tokens?.refreshToken) {
          activateAccountNotifications(null);
          return;
        }
        const result = await authService.refresh(tokens.refreshToken);
        await credentials(() =>
          saveAuthTokens({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          }),
        );
        if (mounted) {
          activateAccountNotifications(result.userId);
          setSession({
            userId: result.userId,
            email: result.email,
            pets: normalizePets(result.pets),
          });
        }
      } catch (restoreError) {
        activateAccountNotifications(null);
        if ((restoreError as ApiError).status === 401) await clearAuthTokens();
      } finally {
        if (mounted) setIsRestoring(false);
      }
    };
    void restoreSession();
    return () => {
      mounted = false;
    };
  }, [credentials]);

  useEffect(() => {
    setAuthExpiredHandler(() => {
      if (currentSession.current)
        void cancelAccountNotifications(currentSession.current.userId).catch(() => undefined);
      setSession(null);
      setError('登入狀態已失效，請重新登入');
    });
    return () => setAuthExpiredHandler(null);
  }, []);

  const authenticate = useCallback(
    async (request: typeof authService.login, email: string, password: string) => {
      if (operationLock.current) return;
      operationLock.current = true;
      setIsSubmitting(true);
      setError(null);
      try {
        const result = await request(email, password);
        await credentials(() =>
          saveAuthTokens({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          }),
        );
        activateAccountNotifications(result.userId);
        setSession({
          userId: result.userId,
          email: result.email || email.trim(),
          pets: normalizePets(result.pets),
        });
      } catch (requestError) {
        const message = (requestError as Error).message || '操作失敗';
        setError(message);
        throw requestError;
      } finally {
        operationLock.current = false;
        setIsSubmitting(false);
      }
    },
    [credentials],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading: isRestoring || isSubmitting,
      isRestoring,
      isSubmitting,
      error,
      login: (email, password) => authenticate(authService.login, email, password),
      register: (email, password) => authenticate(authService.register, email, password),
      logout: () => {
        if (session) {
          void cancelAccountNotifications(session.userId).catch(() => undefined);
          void clearExportTracking(session.userId).catch(() => undefined);
        }
        void credentials(async () => {
          let refreshToken: string | undefined;
          try {
            refreshToken = (await readAuthTokens())?.refreshToken;
          } catch {
            /* Still clear local credentials. */
          }
          await clearAuthTokens().catch(() => undefined);
          return refreshToken;
        })
          .then(async (refreshToken) => {
            if (refreshToken) await authService.logout(refreshToken).catch(() => undefined);
          })
          .catch(() => undefined);
        setSession(null);
        setError(null);
      },
      deleteAccount: async (password) => {
        if (!session?.userId) throw new Error('請重新登入後再試一次');
        if (operationLock.current) return;
        operationLock.current = true;
        setIsSubmitting(true);
        setError(null);
        try {
          await authService.deleteAccount(password);
          await Promise.allSettled([
            cancelAccountNotifications(session.userId),
            clearAccountAISessions(session.userId),
            clearFirstUseGuide(session.userId),
            clearExportTracking(session.userId),
            clearPreVetDrafts(session.userId),
          ]);
          await credentials(() => clearAuthTokens()).catch(() => undefined);
          setSession(null);
        } catch (deleteError) {
          setError((deleteError as Error).message || '帳號刪除失敗，請稍後重試');
          throw deleteError;
        } finally {
          operationLock.current = false;
          setIsSubmitting(false);
        }
      },
      clearError: () => setError(null),
    }),
    [session, isRestoring, isSubmitting, error, authenticate, credentials],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必須在 AuthProvider 內使用');
  return context;
}
