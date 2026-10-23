import { useFormPet } from '../../../hooks/useFormPet';
import { syncCareNotifications } from '../../../services/careNotificationSync';
import { ScreenPageHeader, ScreenPageFrame } from '../../../components/ScreenPageHeader';
import { useFormUnsavedChangesGuard } from '../../../hooks/useFormUnsavedChangesGuard';
import { FieldError } from '../../../components/FieldError';
import { useFormFieldErrors } from '../../../hooks/useFormFieldErrors';
/**
 * 用途：新增、編輯與複製用藥療程。
 * 表單型別：../types.ts
 * API：../../../services/medicationService.ts
 */
import React, { useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppButton } from '../../../components/AppButton';
import { SelectionChip } from '../../../components/SelectionChip';
import { MedicationFrequencyField } from '../components/MedicationFrequencyField';
import { RecordActionButton } from '../../../components/RecordActionButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import DatePickerField from '../../../components/DatePickerField';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../../../utils/quickRecordFeedback';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { createMedication, updateMedication } from '../../../services/medicationService';
import type { MedicationCourse, MedicationMealTiming } from '../../../types';
import { medicationStyles as styles } from '../medicationStyles';
import { createMedicationDraft, mealTimingLabels, timeValue, type MedicationDraft } from '../types';
import { taipeiDateKey, taipeiDateFromKey, formatTaipeiTime } from '../../../utils/taipeiDate';

const fields = [
  ['name', '藥品名稱（必填）'],
  ['startDate', '開始日期（必填）'],
  ['endDate', '結束日期（選填）'],
  ['instructions', '使用說明／每次用量（選填）'],
  ['timesPerDay', '每日次數（必填）'],
  ['notes', '補充備註'],
] as const;

type MedicationField = 'name' | 'endDate' | 'timesPerDay' | 'reminderTimes';
const FIELD_ORDER: readonly MedicationField[] = ['name', 'endDate', 'timesPerDay', 'reminderTimes'];

export function MedicationFormScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { pets } = usePet();
  const route = useRoute<RouteProp<HomeStackParamList, 'MedicationForm'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const existing = route.params?.record as MedicationCourse | undefined;
  const sourceVisit = route.params?.sourceVisit;
  const ownerPet = useFormPet(existing?.petId ?? sourceVisit?.petId);
  const duplicate = route.params?.duplicate === true;
  const quickEntry = route.params?.quickEntry === true;
  const [draft, setDraft] = useState<MedicationDraft>(() =>
    createMedicationDraft(existing, duplicate, sourceVisit),
  );
  const { errors, scrollRef, position, showErrors, clearError } =
    useFormFieldErrors<MedicationField>();
  const saveLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const { markSaved } = useFormUnsavedChangesGuard(draft, setDraft, true, saving);
  const [editingReminderTime, setEditingReminderTime] = useState<string | null>(null);
  const setField = <Key extends keyof MedicationDraft>(key: Key, value: MedicationDraft[Key]) => {
    clearError(key as MedicationField);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!session?.userId || !ownerPet || ownerPet.memorial || saveLock.current) return;
    const problems: Partial<Record<MedicationField, string>> = {};
    if (!draft.name.trim()) problems.name = '請填寫藥品名稱。';
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate)
      problems.endDate = '結束日期不能早於開始日期。';
    if (!Number.isInteger(draft.timesPerDay) || draft.timesPerDay < 1 || draft.timesPerDay > 6)
      problems.timesPerDay = '每日次數須為 1–6 次。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    const reminderTimes = [...new Set(draft.reminderTimes)];
    if (reminderTimes.length > 6) {
      showErrors({ reminderTimes: '提醒時間最多 6 筆，請刪除多出的時間後再儲存。' }, FIELD_ORDER);
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        instructions: draft.instructions.trim(),
        timesPerDay: draft.timesPerDay,
        startDate: draft.startDate,
        endDate: draft.endDate || null,
        mealTiming: draft.mealTiming,
        notes: draft.notes.trim(),
        status: draft.status,
        reminderTimes,
        reminderEnabled: reminderTimes.length > 0,
        medicalVisitId: draft.medicalVisitId,
        medicalVisitMedicationKey: draft.medicalVisitMedicationKey,
      };
      const response =
        existing && !duplicate
          ? await updateMedication(session.userId, existing.id, payload)
          : await createMedication(session.userId, ownerPet.id, payload);
      const notificationWarning = await syncCareNotifications(session.userId, pets);
      markSaved(draft);
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '用藥紀錄已儲存，完整內容可到「紀錄」查看。' + (notificationWarning ?? ''),
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('MedicationForm', { quickEntry: true }),
        });
      } else {
        // 儲存成功不另外提示：畫面會換到詳情頁，轉場本身就是回饋。
        // 只有通知沒排成功時才需要讓使用者知道。
        if (notificationWarning) Alert.alert('紀錄已儲存，通知尚未同步', notificationWarning);
        markSaved(draft, () =>
          navigation.replace('MedicationDetail', { recordId: response.record.id }),
        );
      }
    } catch (caught) {
      Alert.alert('儲存失敗', (caught as Error).message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  return (
    <ScreenPageFrame>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.formIntro}
          title={existing && !duplicate ? '編輯用藥' : '新增用藥療程'}
          description="依獸醫指示記下療程"
          icon="medical-outline"
        />

        <Text style={styles.label}>
          毛孩：{ownerPet?.name || '原紀錄毛孩無法取得，請返回重新載入'}
        </Text>
        {!!sourceVisit && (
          <Text style={styles.reminderHint}>
            已帶入當次開藥資訊，請依藥袋確認頻次、日期及提醒時間後儲存。
            這不會修改原就醫紀錄，也不會自動開啟服藥提醒。
          </Text>
        )}
        {fields
          .filter(([key]) => key !== 'notes')
          .map(([key, label]) => {
            const isDate = key === 'startDate' || key === 'endDate';
            if (isDate) {
              const value = draft[key];
              return (
                <View key={key} onLayout={key === 'endDate' ? position(key) : undefined}>
                  <DatePickerField
                    label={label}
                    value={value ? taipeiDateFromKey(value) : undefined}
                    onClear={key === 'endDate' ? () => setField('endDate', '') : undefined}
                    onChange={(date) => setField(key, taipeiDateKey(date))}
                    minimumDate={
                      key === 'endDate' && draft.startDate
                        ? taipeiDateFromKey(draft.startDate)
                        : undefined
                    }
                    maximumDate={key === 'startDate' ? new Date() : undefined}
                  />
                  {key === 'endDate' ? <FieldError message={errors.endDate} /> : null}
                </View>
              );
            }
            if (key === 'timesPerDay')
              return (
                <View key={key} onLayout={position('timesPerDay')}>
                  <Text style={styles.label}>{label}</Text>
                  <MedicationFrequencyField
                    value={draft.timesPerDay}
                    onChange={(count) => setField('timesPerDay', count)}
                    invalid={!!errors.timesPerDay}
                  />
                  <Text style={styles.reminderHint}>
                    請依獸醫指示填寫；提醒時間可另外設定，不會依次數自動建立。
                  </Text>
                  <FieldError message={errors.timesPerDay} />
                </View>
              );
            return (
              <View key={key} onLayout={key === 'name' ? position(key) : undefined}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`請輸入${label.replace('（必填）', '')}`}
                  placeholderTextColor={Colors.subtext}
                  value={String(draft[key] ?? '')}
                  accessibilityLabel={label}
                  onChangeText={(value) => setField(key, value)}
                />
                {key === 'name' ? <FieldError message={errors.name} /> : null}
              </View>
            );
          })}
        <SupplementalNotesField
          value={String(draft.notes ?? '')}
          onChange={(value) => setField('notes', value)}
        />

        <Text style={styles.section}>服用方式</Text>
        <View style={styles.options}>
          {(Object.keys(mealTimingLabels) as MedicationMealTiming[]).map((key) => (
            <SelectionChip
              key={key}
              size="form"
              label={mealTimingLabels[key]}
              selected={draft.mealTiming === key}
              onPress={() => setField('mealTiming', key)}
              style={styles.mealOption}
            />
          ))}
        </View>

        <View onLayout={position('reminderTimes')}>
          <DatePickerField
            label="每天提醒時間（選填，最多 6 筆）"
            disabled={!editingReminderTime && draft.reminderTimes.length >= 6}
            mode="time"
            value={timeValue(draft.reminderTimeDraft || draft.reminderTimes[0])}
            onChange={(date) => {
              if (!editingReminderTime && draft.reminderTimes.length >= 6) return;
              const next = formatTaipeiTime(date);
              setDraft((current) => ({
                ...current,
                reminderTimes: [
                  ...new Set(
                    editingReminderTime
                      ? current.reminderTimes.map((item) =>
                          item === editingReminderTime ? next : item,
                        )
                      : [...current.reminderTimes, next],
                  ),
                ],
                reminderTimeDraft: '',
              }));
              setEditingReminderTime(null);
            }}
          />
          {draft.reminderTimes.length >= 6 && (
            <Text style={styles.reminderHint}>已達 6 筆上限；仍可編輯或刪除既有時間。</Text>
          )}
          <FieldError message={errors.reminderTimes} />
        </View>
        {draft.reminderTimes.length > 0 && (
          <View style={styles.reminderList}>
            {draft.reminderTimes.map((time) => (
              <View key={time} style={styles.reminderRow}>
                <Text style={styles.reminderHint}>每天 {time}</Text>
                <RecordActionButton
                  kind="edit"
                  label="編輯"
                  style={styles.reminderAction}
                  onPress={() => {
                    setEditingReminderTime(time);
                    setField('reminderTimeDraft', time);
                  }}
                />
                <RecordActionButton
                  kind="delete"
                  label="刪除"
                  style={styles.reminderAction}
                  onPress={() => {
                    setDraft((current) => ({
                      ...current,
                      reminderTimes: current.reminderTimes.filter((item) => item !== time),
                      reminderTimeDraft: '',
                    }));
                    setEditingReminderTime(null);
                  }}
                />
              </View>
            ))}
          </View>
        )}

        <AppButton
          title={saving ? '儲存中…' : '儲存'}
          variant="primary"
          disabled={saving || !ownerPet || Boolean(ownerPet.memorial)}
          busy={saving}
          style={styles.primary}
          textStyle={styles.primaryText}
          onPress={save}
        />
        <Text style={styles.notice}>MEGO 僅協助記錄用藥資訊與提醒，請依獸醫指示使用。</Text>
      </KeyboardAwareScrollView>
    </ScreenPageFrame>
  );
}
