/** 用途：毛孩在回憶中時，取代「新增紀錄」按鈕，說明只能查看。 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import { Radius, Spacing } from '../constants/Layout';
import { Type } from '../constants/Typography';

export function MemorialReadOnlyNotice({ petName }: { petName?: string }) {
  return (
    <View style={styles.notice} accessibilityRole="text">
      <Ionicons name="flower-outline" size={18} color={Colors.memorial} />
      <Text style={styles.text}>{petName || '毛孩'}在回憶中，這裡的紀錄只供回顧，不能再新增。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.memorialSoft,
  },
  text: { flex: 1, color: Colors.text, fontSize: Type.footnote, lineHeight: 19 },
});
