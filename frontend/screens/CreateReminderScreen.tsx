import { useFormPet } from '../hooks/useFormPet';
import { addDateKeyDays, taipeiDateKey, taipeiDateFromKey } from '../utils/taipeiDate';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：建立或編輯提醒；後端成功後同步裝置 Local Notification。 */
import React, { useRef, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { SelectionChip, SelectionGroup } from '../components/SelectionChip';
import { ScreenPageHeader } from '../components/ScreenPageHeader';
import SupplementalNotesField from '../components/SupplementalNotesField';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_ACTION_GAP,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import DatePickerField from '../components/DatePickerField';
import { FieldError } from '../components/FieldError';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { showQuickRecordFeedback } from '../utils/quickRecordFeedback';
import { RECURRENCE_RULES, REMINDER_TYPES } from '../constants/Reminders';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { HomeStackParamList } from '../navigation/types';
import {
  replaceReminderNotification,
  scheduleReminderNotification,
} from '../services/notificationService';
import { createReminder, updateReminder } from '../services/reminderService';
import { RecurrenceRule, ReminderType } from '../types';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { Type } from '../constants/Typography';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateReminder'>;

type ReminderField = 'title' | 'scheduledAt';
const FIELD_ORDER: readonly ReminderField[] = ['title', 'scheduledAt'];

export default function CreateReminderScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const existing = route.params?.reminder;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const selectedPet = useFormPet(existing?.petId);
  const { settings } = useSettings();
  const [type, setType] = useState<ReminderType>(existing?.type ?? 'other');
  const [title, setTitle] = useState(existing?.title ?? '提醒');
  const [scheduledAt, setScheduledAt] = useState(
    existing
      ? new Date(existing.scheduledAt)
      : (() => {
          const today = taipeiDateKey();
          const date = taipeiDateFromKey(today, settings.defaultReminderTime);
          return date.getTime() <= Date.now()
            ? taipeiDateFromKey(addDateKeyDays(today, 1), settings.defaultReminderTime)
            : date;
        })(),
  );
  const [rule, setRule] = useState<RecurrenceRule>(existing?.recurrenceRule ?? 'monthly');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const mutationLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientRequestId] = useState(
    () => `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const formValues = { type, title, scheduledAt, rule, notes };
  const { markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setType(value.type);
      setTitle(value.title);
      setScheduledAt(value.scheduledAt);
      setRule(value.rule);
      setNotes(value.notes);
    },
    true,
    submitting,
  );

  const chooseType = (item: (typeof REMINDER_TYPES)[number]) => {
    setType(item[0]);
    setTitle(item[1]);
    setRule(item[2]);
  };

  const { errors, scrollRef, position, showErrors, clearError } =
    useFormFieldErrors<ReminderField>();

  const submit = async () => {
    const problems: Partial<Record<ReminderField, string>> = {};
    if (!title.trim()) problems.title = '請填寫提醒名稱。';
    if (!Number.isFinite(scheduledAt.getTime())) problems.scheduledAt = '提醒日期無效。';
    else if (scheduledAt.getTime() <= Date.now())
      problems.scheduledAt = '請選擇晚於目前時間的日期與時間；同一天的未來時間可以使用。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    if (!selectedPet || !session?.userId || mutationLock.current) return;
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSubmitting(true);
    try {
      const input = {
        type,
        title: title.trim(),
        scheduledAt: scheduledAt.toISOString(),
        recurrenceRule: rule,
        notes: notes.trim(),
        clientRequestId: existing ? undefined : clientRequestId,
      };
      const saved = existing
        ? await updateReminder(session.userId, existing.id, { ...input, status: existing.status })
        : await createReminder(session.userId, selectedPet.id, input);
      markSaved(formValues);
      try {
        const result = existing
          ? await replaceReminderNotification(session.userId, saved, selectedPet.name)
          : await scheduleReminderNotification(session.userId, saved, selectedPet.name);
        const message =
          result.status === 'disabled'
            ? '提醒已儲存。MEGO 手機提醒已關閉，App 內提醒仍會保留。'
            : result.status === 'denied'
              ? '提醒已儲存。通知權限尚未開啟，你仍可以在 MEGO 內查看提醒。'
              : result.status === 'expired'
                ? '提醒已儲存；時間已過，不會排程手機通知。'
                : `提醒已儲存${existing ? '並重新排程' : '並排程手機通知'}。`;
        if (quickEntry) {
          showQuickRecordFeedback({
            message: `${message} 完整安排可到「紀錄」查看。`,
            onDone: () => navigation.popToTop(),
            onAddAnother: () => navigation.replace('CreateReminder', { quickEntry: true }),
          });
        } else {
          // 排程正常就直接返回；只有手機通知沒排成的三種情況需要告知，
          // 其中權限未開啟可以直接帶使用者去設定。
          const problem =
            result.status === 'disabled'
              ? 'MEGO 的手機提醒已關閉，App 內提醒仍會保留。'
              : result.status === 'denied'
                ? '通知權限尚未開啟，你仍可以在 MEGO 內查看提醒。'
                : result.status === 'expired'
                  ? '提醒時間已過，不會排程手機通知。'
                  : '';
          if (!problem) navigation.goBack();
          else if (result.status === 'denied')
            Alert.alert('提醒已儲存，手機通知未排定', problem, [
              { text: '稍後再說', style: 'cancel', onPress: navigation.goBack },
              {
                text: '前往設定',
                onPress: () => {
                  void Linking.openSettings().catch(() => undefined);
                  navigation.goBack();
                },
              },
            ]);
          else
            Alert.alert('提醒已儲存，手機通知未排定', problem, [
              { text: '我知道了', onPress: navigation.goBack },
            ]);
        }
      } catch {
        const notificationError = '提醒已儲存，但手機通知排程失敗，仍可在 App 內查看。';
        if (quickEntry) {
          showQuickRecordFeedback({
            message: notificationError,
            onDone: () => navigation.popToTop(),
            onAddAnother: () => navigation.replace('CreateReminder', { quickEntry: true }),
          });
        } else {
          Alert.alert('提醒已儲存，手機通知未排定', notificationError, [
            { text: '我知道了', onPress: navigation.goBack },
          ]);
        }
      }
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      mutationLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.intro}
          title={existing ? '編輯提醒' : '新增提醒'}
          description="安排照護與通知時間"
          icon="notifications"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        <Label text="提醒類型（必填）" />
        <SelectionGroup label="提醒類型">
          {REMINDER_TYPES.map((item) => (
            <SelectionChip
              key={item[0]}
              size="form"
              label={item[1]}
              selected={type === item[0]}
              onPress={() => chooseType(item)}
            />
          ))}
        </SelectionGroup>
        <View onLayout={position('title')}>
          <Label text="提醒名稱（必填）" />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={(next) => {
              clearError('title');
              setTitle(next);
            }}
            maxLength={100}
          />
          <FieldError message={errors.title} />
        </View>
        <View onLayout={position('scheduledAt')}>
          <DatePickerField
            label="提醒日期與時間（必填）"
            value={scheduledAt}
            mode="datetime"
            minimumDate={new Date()}
            disabled={submitting}
            onChange={(next) => {
              clearError('scheduledAt');
              setScheduledAt(next);
            }}
          />
          <FieldError message={errors.scheduledAt} />
        </View>
        <Label text="是否重複（建議值，可自行調整）" />
        <SelectionGroup label="重複頻率">
          {RECURRENCE_RULES.map(([value, label]) => (
            <SelectionChip
              key={value}
              size="form"
              label={label}
              selected={rule === value}
              onPress={() => setRule(value)}
            />
          ))}
        </SelectionGroup>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={17} color={Colors.successDecoration} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>頻率參考</Text>
            <Text style={styles.noticeText}>實際頻率請依獸醫建議與產品說明為準。</Text>
          </View>
        </View>
        <SupplementalNotesField value={notes} onChange={setNotes} maxLength={1000} />
        <AppButton
          title={submitting ? '儲存中…' : existing ? '儲存修改' : '建立提醒'}
          variant="primary"
          disabled={submitting}
          busy={submitting}
          style={[styles.submit, submitting && styles.disabled]}
          textStyle={styles.submitText}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  intro: { marginBottom: 12 },
  label: {
    color: Colors.text,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
  },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    padding: 11,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
  },
  noticeCopy: { flex: 1, gap: 2 },
  noticeTitle: { color: Colors.text, fontSize: Type.caption, fontWeight: '800' },
  noticeText: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 17 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 14,
    minHeight: FORM_BUTTON_HEIGHT,
    alignItems: 'center',
    marginTop: FORM_ACTION_GAP,
  },
  submitText: { color: Colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
