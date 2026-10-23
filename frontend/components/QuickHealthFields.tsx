/** 用途：提供健康快速表單共用的大型單選、複選與安全提示元件。 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { Option } from '../constants/ObservationHealthEvents';
import { SelectionChip, SelectionGroup } from './SelectionChip';

export function QuickOptionGroup({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <SelectionGroup label={label}>
      {options.map(([key, label]) => (
        <SelectionChip
          key={key}
          size="form"
          label={label}
          selected={value === key}
          onPress={() => onChange(key)}
        />
      ))}
    </SelectionGroup>
  );
}
export function MultiSelectOptionGroup({
  label,
  options,
  values,
  onChange,
}: {
  label?: string;
  options: Option[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <SelectionGroup multiple label={label}>
      {options.map(([key, label]) => {
        const active = values.includes(key);
        return (
          <SelectionChip
            key={key}
            size="form"
            multiple
            label={label}
            selected={active}
            onPress={() =>
              onChange(active ? values.filter((value) => value !== key) : [...values, key])
            }
          />
        );
      })}
    </SelectionGroup>
  );
}
export function HealthSafetyNotice({ message }: { message: string }) {
  return (
    <View style={styles.safety}>
      <Text style={styles.safetyTitle}>安全提醒</Text>
      <Text style={styles.safetyText}>{message}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  safety: {
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 16,
    padding: 15,
    marginTop: 20,
  },
  safetyTitle: { color: Colors.warningTitle, fontWeight: '800' },
  safetyText: { color: Colors.warningText, lineHeight: 21, marginTop: 5 },
});
