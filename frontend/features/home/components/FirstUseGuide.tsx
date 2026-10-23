import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { Type } from '../../../constants/Typography';
import { useFirstUseGuide } from '../useFirstUseGuide';

const steps = [
  {
    title: '首頁快速記',
    text: '有需要時記下日常、體重或照護事項，不必每天填滿。',
    icon: 'create-outline',
  },
  {
    title: '紀錄回顧',
    text: '點選月曆日期，查看當天紀錄；照片收在右上角相簿。',
    icon: 'calendar-outline',
  },
  {
    title: 'MEGO AI 整理',
    text: '查詢照護紀錄；看診前可整理重點，提供獸醫參考。',
    icon: 'chatbubble-outline',
  },
] as const;

export function FirstUseGuide({ userId, enabled = true }: { userId?: string; enabled?: boolean }) {
  const guide = useFirstUseGuide(userId, enabled);
  if (!guide.visible) return null;
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        從一筆照護紀錄開始
      </Text>
      {steps.map((step) => (
        <View key={step.title} style={styles.row}>
          <Ionicons name={step.icon} size={19} color={Colors.primaryDecoration} />
          <View style={styles.copy}>
            <Text style={styles.step}>{step.title}</Text>
            <Text style={styles.body}>{step.text}</Text>
          </View>
        </View>
      ))}
      {!!guide.error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {guide.error}
        </Text>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="關閉首次使用提示"
        accessibilityState={{ disabled: guide.saving }}
        disabled={guide.saving}
        style={styles.dismiss}
        onPress={() => void guide.dismiss()}
      >
        <Text style={styles.dismissText}>{guide.saving ? '正在保存…' : '知道了，開始記錄'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 18,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  title: { fontSize: Type.callout, fontWeight: '800', color: Colors.text },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  step: { fontSize: Type.footnote, color: Colors.text, fontWeight: '700' },
  body: { fontSize: Type.footnote, color: Colors.subtext, lineHeight: 21 },
  dismiss: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 12,
  },
  dismissText: { color: Colors.primary, fontSize: Type.footnote, fontWeight: '700' },
  error: { color: Colors.dangerText, fontSize: Type.caption, lineHeight: 18 },
});
