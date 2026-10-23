/**
 * 用途：紀錄列表的空狀態外框，集中插圖、標題與提示的版面。
 * 使用頁：疫苗、用藥、驅蟲、就醫、健康異常等列表。
 */
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Type } from '../constants/Typography';
import { HOME_THEME_HEALTH_EMPTY_ARTWORK } from '../constants/HomeThemes';
import { useSettings } from '../contexts/SettingsContext';
import { SoftEntrance } from './SoftMotion';

type RecordEmptyStateProps = {
  title: string;
  hint: string;
  /** 標題上方的插圖；省略時只顯示文字。 */
  artwork?: React.ReactNode;
};

export function RecordEmptyState({ title, hint, artwork }: RecordEmptyStateProps) {
  return (
    <View style={styles.box}>
      {artwork}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

/** 插圖隨首頁主題切換的版本，照護類列表共用。 */
export function ThemedRecordEmptyState({ title, hint }: Omit<RecordEmptyStateProps, 'artwork'>) {
  const { settings } = useSettings();
  return (
    <RecordEmptyState
      title={title}
      hint={hint}
      artwork={
        <SoftEntrance>
          <Image
            accessible={false}
            resizeMode="contain"
            source={HOME_THEME_HEALTH_EMPTY_ARTWORK[settings.homeTheme]}
            style={styles.artwork}
          />
        </SoftEntrance>
      }
    />
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', paddingVertical: 28 },
  artwork: { width: 82, height: 76, marginBottom: 10 },
  title: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
  hint: { color: Colors.muted, fontSize: Type.footnote, marginTop: 6, textAlign: 'center' },
});
