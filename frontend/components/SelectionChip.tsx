import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Radius, Spacing } from '../constants/Layout';
import { Type } from '../constants/Typography';
import { FORM_FIELD_RADIUS } from '../constants/FormTokens';

/** 同組選項可換列；單選與複選保留不同的無障礙語意。 */
export function SelectionGroup({
  children,
  label,
  multiple = false,
  style,
}: {
  children: React.ReactNode;
  label?: string;
  multiple?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole={multiple ? undefined : 'radiogroup'}
      accessibilityLabel={label}
      style={[styles.group, style]}
    >
      {children}
    </View>
  );
}

/** 篩選及單／多選共用選取語言；不取代紀錄分類色或底部導覽。 */
export function SelectionChip({
  label,
  selected,
  onPress,
  multiple = false,
  disabled = false,
  size = 'compact',
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  multiple?: boolean;
  disabled?: boolean;
  size?: 'compact' | 'form';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityLabel={label}
      accessibilityState={{ selected, checked: selected, disabled }}
      disabled={disabled}
      activeOpacity={0.72}
      onPress={onPress}
      style={[
        styles.chip,
        size === 'form' && styles.formChip,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
    >
      {multiple && <View style={styles.indicator} accessible={false} />}
      <Text
        style={[styles.text, size === 'form' && styles.formText, selected && styles.selectedText]}
      >
        {label}
      </Text>
      {multiple && (
        <View
          style={styles.indicator}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {selected && <Ionicons name="checkmark" size={16} color={Colors.primaryDecoration} />}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  formChip: {
    minHeight: 48,
    maxWidth: '100%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: FORM_FIELD_RADIUS,
  },
  formText: { fontSize: Type.callout, lineHeight: 24 },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  selected: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  indicator: { width: 16, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  text: {
    flexShrink: 1,
    color: Colors.text,
    fontSize: Type.footnote,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  selectedText: { color: Colors.primary, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
