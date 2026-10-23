/** 用途：切換登入導航樹，並在登入、回前景及通知點擊時同步 Local Notification。 */
import React, { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  reconcileAccountNotifications,
  retryNotificationCancellations,
  subscribeToNotificationResponses,
} from '../services/notificationService';
import { guardTabNavigation } from '../hooks/useUnsavedChangesGuard';
import AuthStack from './AuthStack';
import MainTabs from './MainTabs';
import PetSetupStack from './PetSetupStack';
import AIChatScreen from '../screens/AIChatScreen';
import PreVetSummaryScreen from '../screens/PreVetSummaryScreen';
import { RootStackParamList } from './types';

const MINIMUM_SPLASH_DURATION_MS = 2000;
const splashStartedAt = Date.now();

// Keep the splash static until ready, then switch cleanly to the mounted route tree.
SplashScreen.setOptions({ duration: 0, fade: false });
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const AppStack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function RootNavigator() {
  const { session, isRestoring } = useAuth();
  const { pets, selectPet } = usePet();
  const { loading: isLoadingSettings } = useSettings();
  const initializing = useRef(true);
  if (!isRestoring && !isLoadingSettings) initializing.current = false;
  const isAppLoading = initializing.current;
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.primary,
      // Keep navigator surfaces transparent so each tab's own background continues
      // behind the floating dock instead of painting a separate bottom strip.
      card: 'transparent',
      background: Colors.background,
      text: Colors.text,
      border: Colors.border,
    },
  };

  const reconcile = useCallback(() => {
    void retryNotificationCancellations().catch(() => undefined);
    if (!session?.userId) return;
    reconcileAccountNotifications(session.userId, pets).catch(() => undefined);
  }, [session?.userId, pets]);
  const handleNavigationReady = useCallback(() => {
    // Keep the native splash visible until the authenticated route tree is mounted.
    // Also enforce a 2-second minimum so the MEGO mark is actually visible at launch.
    const remaining = Math.max(0, MINIMUM_SPLASH_DURATION_MS - (Date.now() - splashStartedAt));
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    }, remaining);
  }, []);

  useEffect(() => {
    reconcile();
  }, [reconcile]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') reconcile();
    });
    return () => subscription.remove();
  }, [reconcile]);
  useEffect(
    () =>
      subscribeToNotificationResponses((target) => {
        if (!session || target.userId !== session.userId || !navigationRef.isReady()) return;
        const proceed = () => {
          if (pets.some((pet) => pet.id === target.petId)) selectPet(target.petId);
          navigationRef.navigate('MainTabs', {
            screen: 'Home',
            params: {
              screen: 'ReminderList',
              params: { focusReminderId: target.reminderId },
            },
          });
        };
        if (!guardTabNavigation(proceed)) proceed();
      }),
    [session, pets, selectPet],
  );

  if (isAppLoading) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={handleNavigationReady}
    >
      {!session ? (
        <AuthStack />
      ) : pets.length ? (
        <AppStack.Navigator
          id="AuthenticatedAppStack"
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <AppStack.Screen name="MainTabs" component={MainTabs} />
          <AppStack.Screen name="AIChat" component={AIChatScreen} />
          <AppStack.Screen name="VetVisitBrief" component={PreVetSummaryScreen} />
        </AppStack.Navigator>
      ) : (
        <PetSetupStack />
      )}
    </NavigationContainer>
  );
}
