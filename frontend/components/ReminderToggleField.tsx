import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Type } from '../constants/Typography';

type Props = {
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  onValueChange: (enabled: boolean) => void;
};

/** 照護表單共用提醒開關；說明可換行，不擠壓右側的原生 Switch。 */
export function ReminderToggleField({
  title,
  description,
  value,
  disabled = false,
  accessibilityLabel = title,
  onValueChange,
}: Props) {
  return (
    <View style={[styles.card, value && styles.enabled, disabled && styles.unavailable]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.control}>
        <Switch
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={description}
          accessibilityState={{ checked: value, disabled }}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
          trackColor={{ false: Colors.borderStrong, true: Colors.success }}
          ios_backgroundColor={Colors.borderStrong}
          thumbColor={Colors.onPrimary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    marginTop: 16,
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.surface,
  },
  enabled: { backgroundColor: Colors.successSoft, borderColor: Colors.success },
  unavailable: { backgroundColor: Colors.surfaceSoft, borderColor: Colors.border },
  copy: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: Type.body, fontWeight: '700', lineHeight: 22 },
  description: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 20, marginTop: 5 },
  control: {
    minWidth: 56,
    minHeight: 44,
    flexShrink: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
