import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RecordActionButton } from '../../../components/RecordActionButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import DatePickerField from '../../../components/DatePickerField';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_GAP,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
} from '../../../constants/FormTokens';
import { Medication } from '../../../types';
import { taipeiDateKey, taipeiDateFromKey } from '../../../utils/taipeiDate';
import MedicalVisitTextField from './MedicalVisitTextField';
import { AppButton } from '../../../components/AppButton';
import { SelectionChip } from '../../../components/SelectionChip';
import { MedicationFrequencyField } from '../../medications/components/MedicationFrequencyField';
import { Spacing } from '../../../constants/Layout';

type Props = {
  errors?: Partial<Record<'name' | 'timesPerDay' | 'endDate', string>>;
  medication: Medication;
  index: number;
  onUpdate: (key: keyof Medication, value: string | number) => void;
  onRemove: () => void;
};

export default function MedicalVisitMedicationEditor({
  medication,
  errors,
  index,
  onUpdate,
  onRemove,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const showDetails = expanded || Boolean(errors?.timesPerDay || errors?.endDate);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>藥物 {index + 1}</Text>
        <RecordActionButton
          kind="delete"
          label="刪除"
          style={styles.removeButton}
          onPress={onRemove}
        />
      </View>
      <MedicalVisitTextField
        error={errors?.name}
        label="藥袋／藥品名稱（新增用藥時必填）"
        value={medication.name}
        onChangeText={(value) => onUpdate('name', value)}
        maxLength={100}
      />
      <MedicalVisitTextField
        label="藥袋／使用說明（選填）"
        value={medication.instructions}
        onChangeText={(value) => onUpdate('instructions', value)}
        maxLength={500}
      />
      <AppButton
        title={showDetails ? '收合服用資訊' : '補充服用資訊'}
        variant="secondary"
        style={styles.disclosure}
        onPress={() => setExpanded(!showDetails)}
      />
      {showDetails && (
        <>
          <Text style={styles.label}>每日次數（新增藥物時必填）</Text>
          <MedicationFrequencyField
            accessibilityLabel={`藥物 ${index + 1} 每日次數`}
            maximum={10}
            invalid={!!errors?.timesPerDay}
            value={medication.timesPerDay}
            onChange={(value) => onUpdate('timesPerDay', value)}
          />
          {errors?.timesPerDay ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errors.timesPerDay}
            </Text>
          ) : null}
          <DatePickerField
            label="開始日期"
            value={medication.startDate ? taipeiDateFromKey(medication.startDate) : undefined}
            onChange={(date) => onUpdate('startDate', taipeiDateKey(date))}
          />
          <DatePickerField
            label="結束日期"
            value={medication.endDate ? taipeiDateFromKey(medication.endDate) : undefined}
            minimumDate={medication.startDate ? taipeiDateFromKey(medication.startDate) : undefined}
            onChange={(date) => onUpdate('endDate', taipeiDateKey(date))}
          />
          {errors?.endDate ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {errors.endDate}
            </Text>
          ) : null}
          <Text style={styles.label}>飯前／飯後（選填）</Text>
          <View style={styles.mealRow}>
            {(
              [
                ['before', '飯前'],
                ['after', '飯後'],
                ['any', '不限'],
              ] as const
            ).map(([value, label]) => (
              <SelectionChip
                key={value}
                size="form"
                label={label}
                selected={medication.mealTiming === value}
                onPress={() => onUpdate('mealTiming', value)}
                style={styles.mealOption}
              />
            ))}
          </View>
          <SupplementalNotesField
            value={medication.notes}
            onChange={(value) => onUpdate('notes', value)}
            maxLength={500}
            placeholder="補充藥物使用時需要記下的內容"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  error: { color: Colors.dangerText, marginTop: 6 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    minHeight: FORM_FIELD_HEIGHT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: FORM_FIELD_GAP,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { color: Colors.text, fontWeight: '800' },
  removeButton: {
    alignSelf: 'flex-start',
  },
  disclosure: { marginTop: FORM_FIELD_GAP },
  label: {
    color: Colors.text,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
  },
  mealRow: { flexDirection: 'row', gap: Spacing.sm },
  mealOption: { flex: 1, minWidth: 0 },
});
