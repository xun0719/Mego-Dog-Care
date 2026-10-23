/** 用途：統一紀錄與毛孩資料常用的編輯、刪除輕量操作按鈕。 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';
import { usePressFeedback } from '../hooks/usePressFeedback';
import { Type } from '../constants/Typography';

export type RecordActionKind = 'edit' | 'delete';

type Props = {
  kind: RecordActionKind;
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

const ACTIONS = {
  edit: { icon: 'create-outline' as const, color: Colors.primary },
  delete: { icon: 'trash-outline' as const, color: Colors.danger },
};

export function RecordActionButton({
  kind,
  label,
  onPress,
  accessibilityLabel,
  disabled = false,
  busy = false,
  iconOnly = false,
  style,
}: Props) {
  const feedback = usePressFeedback();
  const action = ACTIONS[kind];
  const unavailable = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: unavailable, busy }}
      disabled={unavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'edit' ? styles.edit : styles.delete,
        iconOnly && styles.iconOnly,
        feedback(pressed, unavailable),
        unavailable && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={action.icon} size={18} color={action.color} />
      {!iconOnly ? <Text style={[styles.label, { color: action.color }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  edit: { backgroundColor: Colors.primarySoft, borderColor: Colors.border },
  delete: { backgroundColor: Colors.dangerSoft, borderColor: Colors.border },
  iconOnly: { width: 44, paddingHorizontal: 0 },
  label: { fontSize: Type.subhead, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
