import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import { MEAL_TIMING_LABELS } from '../../../constants/MedicalVisits';
import { Medication } from '../../../types';
import { Type } from '../../../constants/Typography';
import { AppButton } from '../../../components/AppButton';
import { FORM_FIELD_GAP } from '../../../constants/FormTokens';

export function MedicalVisitDetailRows({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.detailGroup}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function MedicalVisitMedicationCards({
  medications,
  onCreateCourse,
  onViewCourse,
}: {
  medications: Medication[];
  onCreateCourse?: (medication: Medication) => void;
  onViewCourse?: (id: string) => void;
}) {
  if (!medications.length) return <Text style={styles.empty}>目前沒有藥物</Text>;

  return (
    <>
      {medications.map((medication, index) => (
        <View key={`${medication.name}-${index}`} style={styles.card}>
          <Text style={styles.med}>{medication.name}</Text>
          {!!medication.instructions && (
            <Text style={styles.value}>服用方式：{medication.instructions}</Text>
          )}
          <Text style={styles.value}>
            每日 {medication.timesPerDay} 次｜{MEAL_TIMING_LABELS[medication.mealTiming]}
          </Text>
          {(medication.startDate || medication.endDate) && (
            <Text style={styles.value}>
              期間：{medication.startDate || '未填'} ～ {medication.endDate || '未填'}
            </Text>
          )}
          {!!medication.notes && <Text style={styles.value}>補充備註：{medication.notes}</Text>}
          {medication.linkedMedicationId && onViewCourse ? (
            <AppButton
              title="查看用藥療程"
              variant="secondary"
              style={styles.courseAction}
              onPress={() => onViewCourse(medication.linkedMedicationId!)}
            />
          ) : onCreateCourse && medication.sourceMedicationKey ? (
            <>
              <AppButton
                title="建立用藥療程"
                variant="secondary"
                style={styles.courseAction}
                disabled={medication.timesPerDay > 6}
                onPress={() => onCreateCourse(medication)}
              />
              {medication.timesPerDay > 6 && (
                <Text style={styles.value}>
                  此紀錄每日超過 6 次，目前療程提醒尚不支援，請保留原藥袋資訊。
                </Text>
              )}
            </>
          ) : null}
        </View>
      ))}
    </>
  );
}

export function MedicalVisitDetailState({
  text,
  loading,
  onRetry,
}: {
  text: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      {loading && <ActivityIndicator color={Colors.primary} />}
      <Text style={styles.empty}>{text}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retry} onPress={onRetry}>
          <Text style={styles.retryText}>重新載入</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  detailGroup: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    overflow: 'hidden',
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  label: { color: Colors.subtext, fontSize: Type.footnote, fontWeight: '700' },
  value: { color: Colors.text, marginTop: 5, lineHeight: 21 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 15,
    marginBottom: FORM_FIELD_GAP,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  med: { color: Colors.text, fontWeight: '800' },
  courseAction: { marginTop: FORM_FIELD_GAP },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 14 },
  retry: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
});
