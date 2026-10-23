import { useFormPet } from '../hooks/useFormPet';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：編輯健康異常紀錄既有的通用欄位，保留詳細資料與本機圖片 URI。 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppButton } from '../components/AppButton';
import { SelectionChip, SelectionGroup } from '../components/SelectionChip';
import SupplementalNotesField from '../components/SupplementalNotesField';

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
} from '../constants/FormTokens';
import DatePickerField from '../components/DatePickerField';
import { FieldError } from '../components/FieldError';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { HEALTH_EVENT_LABELS, SEVERITY_LABELS } from '../constants/HealthEvents';
import { useAuth } from '../contexts/AuthContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { Attachment, HealthEvent, HealthEventType, Severity } from '../types';
import {
  HealthEventErrorState,
  HealthEventLoadingState,
} from '../features/health-events/components/HealthEventScreenState';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { Type } from '../constants/Typography';

const severities = Object.keys(SEVERITY_LABELS) as Severity[];

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthEventEdit'>;

type EditField = 'summary' | 'occurredAt';
const FIELD_ORDER: readonly EditField[] = ['summary', 'occurredAt'];

export default function HealthEventEditScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const [item, setItem] = useState<HealthEvent | null>(null);
  const [type, setType] = useState<HealthEventType>('other');
  const [summary, setSummary] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const attachmentActivity = useRef(false);
  const submissionLock = useRef(false);
  const requestId = useRef(0);
  const formValues = { type, summary, occurredAt, severity, notes, attachments };
  const { dirtyRef, markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setType(value.type);
      setSummary(value.summary);
      setOccurredAt(value.occurredAt);
      setSeverity(value.severity);
      setNotes(value.notes);
      setAttachments(value.attachments);
    },
    !loading && !error,
    submitting,
  );

  const load = useCallback(async () => {
    if (dirtyRef.current) return;
    const currentRequest = ++requestId.current;
    setItem(null);
    if (!session?.userId || !selectedPet) {
      setError('找不到目前選取的毛孩');
      setLoading(false);
      return;
    }
    try {
      setError('');
      const result = await service.getHealthEvent(session.userId, route.params.eventId);
      if (currentRequest !== requestId.current) return;
      if (result.petId !== selectedPet.id) {
        setError('此紀錄不屬於目前選取的毛孩');
        return;
      }
      setItem(result);
      setType(result.type);
      setSummary(result.summary);
      setOccurredAt(new Date(result.occurredAt));
      setSeverity(result.severity);
      setNotes(result.notes ?? '');
      setAttachments(result.attachments ?? []);
      markSaved({
        type: result.type,
        summary: result.summary,
        occurredAt: new Date(result.occurredAt),
        severity: result.severity,
        notes: result.notes ?? '',
        attachments: result.attachments ?? [],
      });
    } catch (requestError) {
      if (currentRequest !== requestId.current) return;
      setError((requestError as Error).message || '無法載入健康紀錄');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [route.params.eventId, selectedPet, session?.userId, dirtyRef, markSaved]);

  useFocusEffect(
    useCallback(() => {
      if (dirtyRef.current) return;
      setLoading(true);
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load, dirtyRef]),
  );

  const { errors, scrollRef, position, showErrors, clearError } = useFormFieldErrors<EditField>();

  const submit = async () => {
    if (
      !item ||
      !session?.userId ||
      submitting ||
      attachmentsBusy ||
      attachmentActivity.current ||
      submissionLock.current
    )
      return;
    const problems: Partial<Record<EditField, string>> = {};
    if (!summary.trim()) problems.summary = '摘要不可留白。';
    if (Number.isNaN(occurredAt.getTime())) problems.occurredAt = '請選擇有效日期。';
    else if (occurredAt.getTime() > Date.now()) problems.occurredAt = '發生時間不可晚於現在。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      await service.updateHealthEvent(session.userId, item.id, {
        type: item.type,
        summary: summary.trim(),
        occurredAt: occurredAt.toISOString(),
        severity,
        notes: notes.trim(),
        details: item.details ?? {},
        attachmentIds: attachments.map((value) => value.id),
      });
      markSaved(formValues, () => navigation.goBack());
    } catch (requestError) {
      Alert.alert('更新失敗', (requestError as Error).message);
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <ScreenPageState title="編輯健康紀錄">
        <HealthEventLoadingState />
      </ScreenPageState>
    );
  if (error || !item)
    return (
      <ScreenPageState title="編輯健康紀錄">
        <HealthEventErrorState
          text={error || '找不到健康紀錄'}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      </ScreenPageState>
    );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.formIntro}
          title="編輯健康紀錄"
          description="保留當時看到的狀況"
          icon="heart-outline"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        <Text style={styles.sectionHeading}>這次觀察</Text>
        <Text style={styles.label}>異常類型（必填）</Text>
        <Text style={styles.label}>{HEALTH_EVENT_LABELS[item.type]}</Text>
        <Text style={styles.label}>編輯保留原類型；不同狀況請另建紀錄，以填寫對應欄位。</Text>
        <AppButton title="新增其他健康異常" onPress={() => navigation.navigate('AbnormalType')} />
        <View onLayout={position('summary')}>
          <Text style={styles.label}>摘要（必填）</Text>
          <TextInput
            value={summary}
            onChangeText={(next) => {
              clearError('summary');
              setSummary(next);
            }}
            maxLength={200}
            style={styles.input}
            placeholder="簡短描述這次狀況"
            placeholderTextColor={Colors.subtext}
          />
          <FieldError message={errors.summary} />
        </View>
        <Text style={styles.label}>嚴重程度（必填）</Text>
        <SelectionGroup label="嚴重程度">
          {severities.map((value) => (
            <SelectionChip
              key={value}
              size="form"
              label={SEVERITY_LABELS[value]}
              selected={severity === value}
              onPress={() => setSeverity(value)}
            />
          ))}
        </SelectionGroup>
        <View onLayout={position('occurredAt')}>
          <DatePickerField
            label="發生日期（必填）"
            value={occurredAt}
            mode="date"
            maximumDate={new Date()}
            disabled={submitting || attachmentsBusy}
            onChange={(next) => {
              clearError('occurredAt');
              setOccurredAt(next);
            }}
          />
          <FieldError message={errors.occurredAt} />
        </View>
        <Text style={styles.sectionHeading}>補充資訊</Text>
        <SupplementalNotesField
          value={notes}
          onChange={setNotes}
          maxLength={2000}
          placeholder="補充重要資訊"
        />
        <AttachmentPicker
          onBusyChange={(busy) => {
            attachmentActivity.current = busy;
            setAttachmentsBusy(busy);
          }}
          userId={session.userId}
          petId={item.petId}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={attachments}
          onChange={setAttachments}
          disabled={submitting || attachmentsBusy}
        />
        <AppButton
          title={submitting ? '更新中…' : '儲存修改'}
          variant="primary"
          disabled={submitting || attachmentsBusy}
          busy={submitting || attachmentsBusy}
          style={[styles.submit, submitting && styles.disabled]}
          textStyle={styles.submitText}
          onPress={submit}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 42 },
  formIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  formIntroIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formIntroCopy: { flex: 1 },
  formEyebrow: {
    color: Colors.primary,
    fontSize: Type.footnote,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: { color: Colors.text, fontSize: Type.title1, fontWeight: '800' },
  formHint: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 19, marginTop: 3 },
  sectionHeading: {
    color: Colors.text,
    fontSize: Type.headline,
    fontWeight: '800',
    marginTop: 22,
    marginBottom: 2,
  },
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
  inputText: { color: Colors.text },
  hint: { color: Colors.subtext, fontSize: Type.caption, marginTop: 12 },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 16,
    alignItems: 'center',
    marginTop: FORM_ACTION_GAP,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  submitText: { color: Colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
