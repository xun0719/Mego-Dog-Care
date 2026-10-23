/** 用途：組合功能 Stack 與四個底部分頁；照護相簿收在紀錄分頁，就醫地圖從首頁與就醫紀錄進入。 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { CommonActions, type EventArg } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import AbnormalRecordTypeScreen from '../screens/AbnormalRecordTypeScreen';
import CreateHealthEventScreen from '../screens/CreateHealthEventScreen';
import CreateReminderScreen from '../screens/CreateReminderScreen';
import DailyLogScreen from '../screens/DailyLogScreen';
import HomeScreen from '../screens/HomeScreen';
import HomeThemeScreen from '../screens/HomeThemeScreen';
import AIAssistantHubScreen from '../screens/AIAssistantHubScreen';
import { AddPetScreen, EditPetScreen } from '../screens/ManagePetScreen';
import PetMemorialScreen from '../features/pets/screens/PetMemorialScreen';
import SettingsHomeScreen from '../screens/SettingsHomeScreen';
import {
  AccountInfoScreen,
  AIDataUseInfoScreen,
  AIUsageScreen,
  AboutScreen,
  NotificationSettingsScreen,
  PetManagementScreen,
  PrivacyPolicyScreen,
  TermsOfUseScreen,
} from '../features/settings/screens';
import ExportCenterScreen from '../screens/ExportCenterScreen';
import { LostPetSettingsScreen, LostPetQrScreen } from '../features/pet-identity/screens';
import ReminderListScreen from '../screens/ReminderListScreen';
import TimelineScreen from '../screens/TimelineScreen';
import { HomeStackParamList, MainTabParamList, ProfileStackParamList } from './types';
import { Colors } from '../constants/Colors';
import { BottomNavigationDock } from '../components/navigation/BottomNavigationDock';
import { renderSharedHealthScreens } from './SharedHealthScreens';
import CarePhotosScreen from '../features/care-photos/CarePhotosScreen';
import {
  DOCK_HORIZONTAL_PADDING,
  TAB_ITEM_MARGIN,
} from '../components/navigation/bottomNavigationLayout';
import { guardTabNavigation } from '../hooks/useUnsavedChangesGuard';
import { Type } from '../constants/Typography';
import { SETTINGS_PAGES } from '../features/settings/settingsPages';

const Tabs = createBottomTabNavigator<MainTabParamList>();

const styles = StyleSheet.create({
  tabLabel: { alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  tabLabelText: { fontSize: Type.caption2, lineHeight: 16, fontWeight: '600' },
  tabLabelActive: { fontWeight: '700' },
  tabIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: TAB_ITEM_MARGIN,
    marginVertical: 5,
    borderRadius: 21,
    minHeight: 44,
  },
});
const Stack = createNativeStackNavigator<HomeStackParamList>();
const HealthStackNav = createNativeStackNavigator<HomeStackParamList>();
const TimelineStackNav = createNativeStackNavigator<HomeStackParamList>();
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

function resetTabStackToRoot(
  navigation: BottomTabNavigationProp<MainTabParamList>,
  tabRouteKey: string,
  rootRouteName: string,
) {
  const tabRoute = navigation.getState().routes.find((route) => route.key === tabRouteKey);
  const nestedState = tabRoute?.state;
  const nestedStackKey = nestedState?.key;
  if (!nestedStackKey) return;

  // Tapping an already-open tab root should be a no-op. Resetting even when the
  // root is active replaces its route key and remounts the screen (visible as a flash).
  const activeRoute = nestedState.routes[nestedState.index ?? 0];
  if (nestedState.routes.length === 1 && activeRoute?.name === rootRouteName) return;

  navigation.dispatch({
    ...CommonActions.reset({ index: 0, routes: [{ name: rootRouteName }] }),
    target: nestedStackKey,
  });
}

// react-native-screens 支援全螢幕返回，但目前 native-stack 型別尚未暴露此欄位。
const getIosSwipeStackOptions = () =>
  ({
    animation: 'none',
    gestureEnabled: Platform.OS === 'ios',
    fullScreenSwipeEnabled: Platform.OS === 'ios',
    gestureResponseDistance: { start: 200 },
    headerBackVisible: true,
    headerBackButtonDisplayMode: 'minimal',
    headerStyle: { backgroundColor: Colors.background },
    headerTintColor: Colors.text,
    headerTitleStyle: { color: Colors.text },
    headerShadowVisible: false,
  }) as NativeStackNavigationOptions & { fullScreenSwipeEnabled?: boolean };

function HomeStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <Stack.Navigator id="HomeStack" screenOptions={screenOptions}>
      <Stack.Screen
        name="HomeOverview"
        component={HomeScreen}
        options={{
          headerShown: false,
          // Home artwork itself must extend all the way behind the floating dock.
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="DailyLog" component={DailyLogScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddPet" component={AddPetScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditPet" component={EditPetScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PetMemorial"
        component={PetMemorialScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ReminderList"
        component={ReminderListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AbnormalType"
        component={AbnormalRecordTypeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateHealthEvent"
        component={CreateHealthEventScreen}
        options={{ headerShown: false }}
      />
      {renderSharedHealthScreens(Stack)}
    </Stack.Navigator>
  );
}

function HealthStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <HealthStackNav.Navigator id="HealthStack" screenOptions={screenOptions}>
      <HealthStackNav.Screen
        name="HealthOverview"
        component={AIAssistantHubScreen}
        options={{ headerShown: false }}
      />
      {renderSharedHealthScreens(HealthStackNav)}
    </HealthStackNav.Navigator>
  );
}

function TimelineStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <TimelineStackNav.Navigator id="TimelineStack" screenOptions={screenOptions}>
      <TimelineStackNav.Screen
        name="TimelineOverview"
        component={TimelineScreen}
        options={{ headerShown: false }}
      />
      <TimelineStackNav.Screen
        name="PhotosOverview"
        component={CarePhotosScreen}
        options={{ headerShown: false }}
      />
      <TimelineStackNav.Screen
        name="ReminderList"
        component={ReminderListScreen}
        options={{ headerShown: false }}
      />
      <TimelineStackNav.Screen
        name="DailyLog"
        component={DailyLogScreen}
        options={{ headerShown: false }}
      />
      <TimelineStackNav.Screen
        name="CreateReminder"
        component={CreateReminderScreen}
        options={{ headerShown: false }}
      />
      {renderSharedHealthScreens(TimelineStackNav)}
    </TimelineStackNav.Navigator>
  );
}

function ProfileStack() {
  const screenOptions = getIosSwipeStackOptions();
  return (
    <ProfileStackNav.Navigator
      id="ProfileStack"
      screenOptions={{ ...screenOptions, headerShown: false }}
    >
      <ProfileStackNav.Screen
        name="ProfileOverview"
        component={SettingsHomeScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="HomeTheme"
        component={HomeThemeScreen}
        options={{ title: SETTINGS_PAGES.HomeTheme.title }}
      />
      <ProfileStackNav.Screen
        name="AIUsage"
        component={AIUsageScreen}
        options={{ title: SETTINGS_PAGES.AIUsage.title }}
      />
      <ProfileStackNav.Screen
        name="AIDataUseInfo"
        component={AIDataUseInfoScreen}
        options={{ title: SETTINGS_PAGES.AIDataUseInfo.title }}
      />
      <ProfileStackNav.Screen
        name="EditPet"
        component={EditPetScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="PetMemorial"
        component={PetMemorialScreen}
        options={{ title: SETTINGS_PAGES.PetMemorial.title }}
      />
      <ProfileStackNav.Screen
        name="AccountInfo"
        component={AccountInfoScreen}
        options={{ title: SETTINGS_PAGES.AccountInfo.title }}
      />
      <ProfileStackNav.Screen
        name="PetManagement"
        component={PetManagementScreen}
        options={{ title: SETTINGS_PAGES.PetManagement.title }}
      />
      <ProfileStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="ExportCenter"
        component={ExportCenterScreen}
        options={{ title: SETTINGS_PAGES.ExportCenter.title }}
      />
      <ProfileStackNav.Screen
        name="LostPetSettings"
        component={LostPetSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="LostPetQr"
        component={LostPetQrScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="About"
        component={AboutScreen}
        options={{ title: SETTINGS_PAGES.About.title }}
      />
      <ProfileStackNav.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <ProfileStackNav.Screen
        name="TermsOfUse"
        component={TermsOfUseScreen}
        options={{ headerShown: false }}
      />
    </ProfileStackNav.Navigator>
  );
}

const icon =
  (name: keyof typeof Ionicons.glyphMap) =>
  ({ color, size }: { color: string; size: number; focused: boolean }) => (
    <View style={styles.tabIcon}>
      <Ionicons name={name} color={color} size={Math.min(size, 23)} />
    </View>
  );

const tabLabel =
  (text: string) =>
  ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={styles.tabLabel}>
      <Text
        numberOfLines={1}
        style={[styles.tabLabelText, focused && styles.tabLabelActive, { color }]}
      >
        {text}
      </Text>
    </View>
  );

function TabBubbleButton(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable {...props} style={[props.style, styles.tabButton]}>
      {props.children}
    </PlatformPressable>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const tabBarStyle = {
    height: 54 + Math.max(insets.bottom, 12),
    // Match the selected bubble's top inset to its bottom inset inside the dock.
    paddingTop: 1,
    // Keep each equal-width active bubble optically inset from both capsule ends.
    paddingHorizontal: DOCK_HORIZONTAL_PADDING,
    // 導覽項目與膠囊底部採用相同 inset，避免圖示與標籤視覺偏上。
    paddingBottom: Math.max(insets.bottom - 14, 4),
    // 所有分頁的背景都延伸至膠囊後方；堆疊內容已預留導覽列高度。
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderTopColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    zIndex: 10,
  };
  return (
    <Tabs.Navigator
      id="MainTabs"
      screenOptions={() => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.subtext,
        tabBarLabelPosition: 'below-icon',
        tabBarStyle,
        tabBarBackground: () => <BottomNavigationDock />,
      })}
    >
      <Tabs.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarStyle,
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('home-outline'),
          tabBarLabel: tabLabel('首頁'),
          tabBarAccessibilityLabel: '首頁',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (
              guardTabNavigation(() => {
                resetTabStackToRoot(navigation, route.key, 'HomeOverview');
                navigation.navigate(route.name);
              })
            )
              (event as EventArg<'tabPress', true, undefined>).preventDefault();
            else resetTabStackToRoot(navigation, route.key, 'HomeOverview');
          },
        })}
      />
      <Tabs.Screen
        name="Timeline"
        component={TimelineStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('journal-outline'),
          tabBarLabel: tabLabel('紀錄'),
          tabBarAccessibilityLabel: '紀錄',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (
              guardTabNavigation(() => {
                resetTabStackToRoot(navigation, route.key, 'TimelineOverview');
                navigation.navigate(route.name);
              })
            )
              (event as EventArg<'tabPress', true, undefined>).preventDefault();
            else resetTabStackToRoot(navigation, route.key, 'TimelineOverview');
          },
        })}
      />
      <Tabs.Screen
        name="Health"
        component={HealthStack}
        options={{
          tabBarStyle,
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('chatbubble-ellipses-outline'),
          tabBarLabel: tabLabel('MEGO AI'),
          tabBarAccessibilityLabel: 'MEGO AI',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (
              guardTabNavigation(() => {
                resetTabStackToRoot(navigation, route.key, 'HealthOverview');
                navigation.navigate(route.name);
              })
            )
              (event as EventArg<'tabPress', true, undefined>).preventDefault();
            else resetTabStackToRoot(navigation, route.key, 'HealthOverview');
          },
        })}
      />
      <Tabs.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarButton: TabBubbleButton,
          tabBarIcon: icon('settings-outline'),
          tabBarLabel: tabLabel('設定'),
          tabBarAccessibilityLabel: '設定',
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (event) => {
            if (
              guardTabNavigation(() => {
                resetTabStackToRoot(navigation, route.key, 'ProfileOverview');
                navigation.navigate(route.name);
              })
            )
              (event as EventArg<'tabPress', true, undefined>).preventDefault();
            else resetTabStackToRoot(navigation, route.key, 'ProfileOverview');
          },
        })}
      />
    </Tabs.Navigator>
  );
}
