/**
 * 用途：儲存後留在原頁時的回饋。有畫面轉場的表單不需要這個元件——
 * 轉場本身就是回饋；這裡是給沒有轉場、刪掉提示就等於毫無反應的畫面。
 *
 * 成功訊息會在數秒後自動收走；警告需要使用者知道並處理，因此留著不消失。
 * 刻意不做淡入淡出：這是輔助提示，動畫的價值不足以讓每個畫面的測試
 * 都得替 Animated 準備替身。
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../constants/Colors';
import { Radius, Spacing } from '../constants/Layout';
import { Type } from '../constants/Typography';

const AUTO_HIDE_MS = 4000;

export type SaveStatus = { tone: 'success' | 'warning'; message: string } | null;

export function SaveStatusNotice({
  status,
  onDismiss,
}: {
  status: SaveStatus;
  /** 成功訊息自動收走後呼叫，讓呼叫端把狀態清掉。 */
  onDismiss?: () => void;
}) {
  const [rendered, setRendered] = useState<SaveStatus>(null);

  useEffect(() => {
    if (!status) {
      setRendered(null);
      return;
    }
    setRendered(status);
    // 警告需要使用者看到並處理，不自動收走。
    if (status.tone === 'warning') return;
    const timer = setTimeout(() => {
      setRendered(null);
      onDismiss?.();
    }, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [status, onDismiss]);

  if (!rendered) return null;
  const warning = rendered.tone === 'warning';
  return (
    <View
      style={[styles.notice, warning ? styles.warning : styles.success]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Ionicons
        name={warning ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={18}
        color={warning ? Colors.warningTitle : Colors.successStrong}
      />
      <Text style={[styles.text, warning && styles.warningText]}>{rendered.message}</Text>
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
  },
  success: { backgroundColor: Colors.successSoft },
  warning: {
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
  },
  text: { flex: 1, color: Colors.successText, fontSize: Type.footnote, lineHeight: 19 },
  warningText: { color: Colors.warningText },
});

export default SaveStatusNotice;
