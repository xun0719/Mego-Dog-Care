import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ScreenPageHeader, ScreenPageState } from '../../../components/ScreenPageHeader';
import { Colors } from '../../../constants/Colors';
import { SETTINGS_PAGES, type SettingsPageKey } from '../settingsPages';

/** 與日常頁共用頁首；每頁只保留一個主要標題，並隨內容捲動。 */
export function SettingsPageHeader({
  page,
  style,
}: {
  page: SettingsPageKey;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScreenPageHeader
      {...SETTINGS_PAGES[page]}
      iconColor={Colors.primaryDecoration}
      iconBackground={Colors.primarySoft}
      style={[styles.header, style]}
    />
  );
}

export function SettingsPageState({
  page,
  children,
}: {
  page: SettingsPageKey;
  children: React.ReactNode;
}) {
  return (
    <ScreenPageState
      {...SETTINGS_PAGES[page]}
      iconColor={Colors.primaryDecoration}
      iconBackground={Colors.primarySoft}
    >
      {children}
    </ScreenPageState>
  );
}

const styles = StyleSheet.create({ header: { marginBottom: 12 } });
