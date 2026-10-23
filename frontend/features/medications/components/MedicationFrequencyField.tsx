import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
} from '../../../constants/FormTokens';
import { Radius, Spacing } from '../../../constants/Layout';
import { Type } from '../../../constants/Typography';

/** 僅記錄醫囑頻次；療程 1–6 次、就醫快照 1–10 次，不推算提醒時間。 */
export function MedicationFrequencyField({
  value,
  onChange,
  maximum = 6,
  accessibilityLabel = '每日次數',
  invalid = false,
}: {
  value: number;
  onChange: (value: number) => void;
  maximum?: 6 | 10;
  accessibilityLabel?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: `每天 ${value} 次` }}
        accessibilityState={{ expanded: open }}
        accessibilityHint="開啟每日次數選單"
        activeOpacity={0.72}
        style={[styles.field, invalid && styles.invalid]}
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
      >
        <View style={styles.indicator} accessible={false} />
        <Text style={styles.value}>每天 {value} 次</Text>
        <View
          style={styles.indicator}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons name="chevron-down" size={20} color={Colors.primaryDecoration} />
        </View>
      </TouchableOpacity>
      {open && (
        <Modal transparent animationType="fade" onRequestClose={close}>
          <View style={styles.backdrop}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="關閉每日次數選單"
              style={StyleSheet.absoluteFill}
              onPress={close}
            />
            <View style={styles.panel} accessibilityViewIsModal onAccessibilityEscape={close}>
              <Text accessibilityRole="header" style={styles.title}>
                選擇每日次數
              </Text>
              <Text style={styles.hint}>請依獸醫或藥袋指示選擇。</Text>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                bounces={false}
                keyboardShouldPersistTaps="handled"
              >
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={accessibilityLabel}
                  style={styles.options}
                >
                  {Array.from({ length: maximum }, (_, index) => index + 1).map((count) => (
                    <TouchableOpacity
                      key={count}
                      accessibilityRole="radio"
                      accessibilityLabel={`每天 ${count} 次`}
                      accessibilityState={{ selected: value === count, checked: value === count }}
                      activeOpacity={0.72}
                      style={[styles.option, value === count && styles.selected]}
                      onPress={() => {
                        close();
                        onChange(count);
                      }}
                    >
                      <View style={styles.indicator} accessible={false} />
                      <Text style={[styles.value, value === count && styles.selectedText]}>
                        每天 {count} 次
                      </Text>
                      <View
                        style={styles.indicator}
                        accessibilityElementsHidden
                        importantForAccessibility="no-hide-descendants"
                      >
                        {value === count && (
                          <Ionicons name="checkmark" size={20} color={Colors.primaryDecoration} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="取消選擇每日次數"
                style={styles.cancel}
                onPress={close}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: FORM_FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    paddingVertical: Spacing.md,
    borderRadius: FORM_FIELD_RADIUS,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  invalid: { borderColor: Colors.dangerText },
  // 左右同寬，右側箭頭／勾選不會把文字中心推偏。
  indicator: { width: 20, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  value: {
    flex: 1,
    minWidth: 0,
    fontSize: FORM_FIELD_FONT_SIZE,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.overlay,
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  title: { color: Colors.text, fontSize: Type.title3, fontWeight: '800', textAlign: 'center' },
  hint: {
    color: Colors.subtext,
    fontSize: Type.footnote,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  list: { flexShrink: 1 },
  listContent: { paddingBottom: Spacing.xxs },
  options: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: FORM_FIELD_HEIGHT,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selected: { backgroundColor: Colors.primarySoft, borderColor: Colors.primary },
  selectedText: { color: Colors.primary, fontWeight: '800' },
  cancel: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceSoft,
  },
  cancelText: {
    color: Colors.subtext,
    fontSize: Type.callout,
    fontWeight: '600',
    textAlign: 'center',
  },
});
