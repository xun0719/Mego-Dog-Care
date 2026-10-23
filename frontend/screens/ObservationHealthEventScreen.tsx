import { useFormPet } from '../hooks/useFormPet';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：以單一共用流程新增及編輯食慾、精神與喝水異常快速紀錄。 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';
import { Spacing } from '../constants/Layout';
import { AppButton } from '../components/AppButton';
import SupplementalNotesField from '../components/SupplementalNotesField';

import {
  HealthSafetyNotice,
  MultiSelectOptionGroup,
  QuickOptionGroup,
} from '../components/QuickHealthFields';
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
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { SEVERITY_LABELS } from '../constants/HealthEvents';
import {
  buildObservationSummary,
  emptyObservationValues,
  OBSERVATION_CONFIG,
  OBSERVATION_SAFETY_MESSAGE,
  normalizeObservationDetails,
  shouldShowObservationSafety,
} from '../constants/ObservationHealthEvents';
import { useAuth } from '../contexts/AuthContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { Attachment, ObservationHealthEventType, Severity } from '../types';
import {
  HealthEventErrorState,
  HealthEventLoadingState,
} from '../features/health-events/components/HealthEventScreenState';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { Type } from '../constants/Typography';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
type Props = NativeStackScreenProps<HomeStackParamList, 'ObservationHealthEvent'>;

type ObservationField = 'primary' | 'occurredAt';
const FIELD_ORDER: readonly ObservationField[] = ['primary', 'occurredAt'];

export default function ObservationHealthEventScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const type = route.params.type as ObservationHealthEventType;
  const eventId = route.params.eventId as string | undefined;
  const quickEntry = route.params.quickEntry === true;
  const config = OBSERVATION_CONFIG[type];
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const [values, setValues] = useState(() => emptyObservationValues(type));
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const attachmentActivity = useRef(false);
  const submissionLock = useRef(false);
  const requestId = useRef(0);
  const formValues = { values, occurredAt, severity, notes, images };
  const { dirtyRef, markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setValues(value.values);
      setOccurredAt(value.occurredAt);
      setSeverity(value.severity);
      setNotes(value.notes);
      setImages(value.images);
    },
    !loading && !error,
    submitting,
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!eventId || dirtyRef.current) return;
      const currentRequest = ++requestId.current;
      if (!session?.userId || !selectedPet) {
        setError('找不到目前選取的毛孩');
        setLoading(false);
        return;
      }
      try {
        setError('');
        const result = await service.getHealthEvent(session.userId, eventId, signal);
        if (currentRequest !== requestId.current) return;
        if (result.petId !== selectedPet.id || result.type !== type) {
          setError(`找不到目前毛孩的${config.title}紀錄`);
          return;
        }
        setValues(normalizeObservationDetails(type, result.details ?? {}));
        setOccurredAt(new Date(result.occurredAt));
        setSeverity(result.severity);
        setNotes(result.notes ?? '');
        setImages(result.attachments ?? []);
        markSaved({
          values: normalizeObservationDetails(type, result.details ?? {}),
          occurredAt: new Date(result.occurredAt),
          severity: result.severity,
          notes: result.notes ?? '',
          images: result.attachments ?? [],
        });
      } catch (requestError) {
        if (currentRequest === requestId.current)
          setError((requestError as Error).message || `無法載入${config.title}紀錄`);
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [config.title, eventId, selectedPet, session?.userId, type, dirtyRef, markSaved],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      if (eventId && !dirtyRef.current) {
        setLoading(true);
        void load(controller.signal);
      }
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [eventId, load, dirtyRef]),
  );

  const { errors, scrollRef, position, showErrors, clearError } =
    useFormFieldErrors<ObservationField>();

  const submit = async () => {
    if (
      !selectedPet ||
      !session?.userId ||
      submitting ||
      attachmentsBusy ||
      attachmentActivity.current ||
      submissionLock.current
    )
      return;
    const problems: Partial<Record<ObservationField, string>> = {};
    if (!values[config.primaryKey]) problems.primary = `請選擇${config.primaryLabel}。`;
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now())
      problems.occurredAt = '請選擇有效且不晚於現在的發生時間。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const input = {
        type,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: buildObservationSummary(type, values),
        details: values,
        notes: notes.trim(),
        attachmentIds: images.map((item) => item.id),
      };
      if (eventId) await service.updateObservationHealthEvent(session.userId, eventId, input);
      else await service.createObservationHealthEvent(session.userId, selectedPet.id, input);
      markSaved(formValues);
      const safety = shouldShowObservationSafety(type, values, severity);
      const successMessage = safety
        ? `${config.title}紀錄已儲存。\n\n安全提醒：${OBSERVATION_SAFETY_MESSAGE}`
        : `${config.title}紀錄已加入近期動態。`;
      if (quickEntry && !eventId) {
        showQuickRecordFeedback({
          message: `${successMessage}\n\n完整內容可到「紀錄」查看。`,
          onDone: () => navigation.popToTop(),
          onAddAnother: () =>
            navigation.replace('ObservationHealthEvent', { type, quickEntry: true }),
        });
      } else {
        // 儲存成功不另外提示，畫面會退回清單或首頁，轉場本身就是回饋；
        // 但安全提醒必須讓使用者看到，這種情況才保留對話框。
        const leave = () => (eventId ? navigation.goBack() : navigation.popToTop());
        if (safety)
          Alert.alert('安全提醒', OBSERVATION_SAFETY_MESSAGE, [
            { text: '我知道了', onPress: leave },
          ]);
        else leave();
      }
    } catch (requestError) {
      Alert.alert('儲存失敗', (requestError as Error).message || '請稍後再試');
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  const pageTitle = eventId ? `編輯${config.title}紀錄` : `記錄${config.title}`;
  if (loading)
    return (
      <ScreenPageState title={pageTitle}>
        <HealthEventLoadingState text={`正在載入${config.title}紀錄…`} />
      </ScreenPageState>
    );
  if (error)
    return (
      <ScreenPageState title={pageTitle}>
        <HealthEventErrorState
          text={error}
          onRetry={() => {
            setLoading(true);
            load();
          }}
        />
      </ScreenPageState>
    );
  const safety = shouldShowObservationSafety(type, values, severity);
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.intro}
          title={pageTitle}
          description="只保存觀察到的狀況，不提供疾病診斷或治療建議。"
          icon="eye-outline"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        <View onLayout={position('primary')}>
          <Text style={styles.label}>{config.primaryLabel}（必填）</Text>
          <QuickOptionGroup
            label={config.primaryLabel}
            options={config.primaryOptions}
            value={values[config.primaryKey] as string | undefined}
            onChange={(value) => {
              clearError('primary');
              setValues((current) => ({ ...current, [config.primaryKey]: value }));
            }}
          />
          <FieldError message={errors.primary} />
        </View>
        {config.optionalGroups.map((group) => (
          <View key={group.key}>
            <Text style={styles.label}>{group.label}</Text>
            <QuickOptionGroup
              label={group.label}
              options={group.options}
              value={values[group.key] as string | undefined}
              onChange={(value) =>
                setValues((current) => ({
                  ...current,
                  [group.key]: current[group.key] === value ? '' : value,
                }))
              }
            />
          </View>
        ))}
        {config.multiGroup && (
          <>
            <Text style={styles.label}>{config.multiGroup.label}</Text>
            <MultiSelectOptionGroup
              label={config.multiGroup.label}
              options={config.multiGroup.options}
              values={(values[config.multiGroup.key] as string[]) ?? []}
              onChange={(selected) =>
                setValues((current) => ({ ...current, [config.multiGroup!.key]: selected }))
              }
            />
          </>
        )}
        <View onLayout={position('occurredAt')}>
          <DatePickerField
            label="發生時間（必填）"
            value={occurredAt}
            mode="datetime"
            maximumDate={new Date()}
            disabled={submitting || attachmentsBusy}
            onChange={(next) => {
              clearError('occurredAt');
              setOccurredAt(next);
            }}
          />
          <FieldError message={errors.occurredAt} />
        </View>
        <Text style={styles.label}>嚴重程度（必填）</Text>
        <QuickOptionGroup
          label="嚴重程度"
          options={severities}
          value={severity}
          onChange={(value) => setSeverity(value as Severity)}
        />
        <AttachmentPicker
          onBusyChange={(busy) => {
            attachmentActivity.current = busy;
            setAttachmentsBusy(busy);
          }}
          userId={session!.userId}
          petId={selectedPet!.id}
          sourceType="health_event"
          limit={ATTACHMENT_LIMITS.health_event}
          value={images}
          onChange={setImages}
          disabled={submitting || attachmentsBusy}
        />
        <SupplementalNotesField
          value={notes}
          onChange={setNotes}
          maxLength={500}
          placeholder="簡短補充觀察到的狀況"
        />
        {safety && <HealthSafetyNotice message={OBSERVATION_SAFETY_MESSAGE} />}
        <AppButton
          title={submitting ? '儲存中…' : '儲存紀錄'}
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
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  intro: { marginBottom: Spacing.md },
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
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  image: { width: 76, height: 76, borderRadius: 12 },
  removeImage: {
    color: Colors.dangerText,
    fontSize: Type.caption,
    textAlign: 'center',
    marginTop: 3,
  },
  submit: {
    backgroundColor: Colors.primary,
    borderRadius: FORM_BUTTON_RADIUS,
    padding: 16,
    alignItems: 'center',
    marginTop: FORM_ACTION_GAP,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  submitText: { color: Colors.onPrimary, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
