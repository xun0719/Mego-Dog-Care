import { useFormPet } from '../hooks/useFormPet';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：提供 10～20 秒可完成的嘔吐專屬新增與編輯快速表單。 */
import React, { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';
import { Spacing } from '../constants/Layout';
import { AppButton } from '../components/AppButton';
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
  buildVomitingSummary,
  DRINKING_OPTIONS,
  normalizeVomitingDetails,
  ENERGY_OPTIONS,
  shouldShowVomitingSafety,
  VOMIT_COLOR_OPTIONS,
  VOMIT_COUNT_OPTIONS,
  VOMITING_SAFETY_MESSAGE,
} from '../constants/Vomiting';
import { useAuth } from '../contexts/AuthContext';
import type { HomeStackParamList } from '../navigation/types';
import * as service from '../services/healthEventService';
import { EnergyCondition, Attachment, Severity, VomitCount, VomitingDetails } from '../types';
import {
  HealthEventOptionGroup as OptionGroup,
  HealthEventOptionsWrap as OptionsWrap,
  HealthEventToggle as Toggle,
} from '../features/health-events/components/HealthEventOptions';
import {
  HealthEventErrorState,
  HealthEventLoadingState,
} from '../features/health-events/components/HealthEventScreenState';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { Type } from '../constants/Typography';

const severities = Object.entries(SEVERITY_LABELS) as Array<[Severity, string]>;
const emptyDetails = (): VomitingDetails => ({
  vomitCount: undefined as unknown as VomitCount,
  energyCondition: undefined as unknown as EnergyCondition,
  hasFoam: false,
  hasFood: false,
  suspectedBlood: false,
  suspectedForeignObject: false,
});

type Props = NativeStackScreenProps<HomeStackParamList, 'VomitingHealthEvent'>;

type VomitingField = 'vomitCount' | 'energyCondition' | 'occurredAt';
const FIELD_ORDER: readonly VomitingField[] = ['vomitCount', 'energyCondition', 'occurredAt'];

export default function VomitingHealthEventScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const eventId = route.params?.eventId as string | undefined;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const [details, setDetails] = useState<VomitingDetails>(emptyDetails);
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [severity, setSeverity] = useState<Severity>('mild');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<Attachment[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const attachmentActivity = useRef(false);
  const submissionLock = useRef(false);
  const requestId = useRef(0);
  const formValues = { details, occurredAt, severity, notes, images };
  const { dirtyRef, markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setDetails(value.details);
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
        if (result.petId !== selectedPet.id || result.type !== 'vomiting') {
          setError('找不到目前毛孩的嘔吐紀錄');
          return;
        }
        const normalized = normalizeVomitingDetails(result.details ?? {});
        setDetails(normalized);
        setOccurredAt(new Date(result.occurredAt));
        setSeverity(result.severity);
        setNotes(result.notes ?? '');
        setImages(result.attachments ?? []);
        markSaved({
          details: normalized,
          occurredAt: new Date(result.occurredAt),
          severity: result.severity,
          notes: result.notes ?? '',
          images: result.attachments ?? [],
        });
        setShowAdvanced(
          Boolean(
            normalized.color ||
              normalized.drinkingCondition ||
              normalized.hasFoam ||
              normalized.hasFood ||
              normalized.suspectedBlood ||
              normalized.suspectedForeignObject ||
              result.notes,
          ),
        );
      } catch (requestError) {
        if (currentRequest !== requestId.current) return;
        setError((requestError as Error).message || '無法載入嘔吐紀錄');
      } finally {
        if (currentRequest === requestId.current) setLoading(false);
      }
    },
    [eventId, selectedPet, session?.userId, dirtyRef, markSaved],
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
    useFormFieldErrors<VomitingField>();

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
    const problems: Partial<Record<VomitingField, string>> = {};
    if (!details.vomitCount) problems.vomitCount = '請選擇發生次數。';
    if (!details.energyCondition) problems.energyCondition = '請選擇精神狀況。';
    if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > Date.now())
      problems.occurredAt = '請選擇有效且不晚於現在的發生時間。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    submissionLock.current = true;
    setSubmitting(true);
    try {
      const input = {
        type: 'vomiting' as const,
        occurredAt: occurredAt.toISOString(),
        severity,
        summary: buildVomitingSummary(details),
        details,
        notes: notes.trim(),
        attachmentIds: images.map((item) => item.id),
      };
      if (eventId) await service.updateVomitingHealthEvent(session.userId, eventId, input);
      else await service.createVomitingHealthEvent(session.userId, selectedPet.id, input);
      markSaved(formValues);
      const safety = shouldShowVomitingSafety(details, severity);
      const successMessage = safety
        ? `嘔吐紀錄已儲存。\n\n安全提醒：${VOMITING_SAFETY_MESSAGE}`
        : '嘔吐紀錄已加入近期動態。';
      if (quickEntry && !eventId) {
        showQuickRecordFeedback({
          message: `${successMessage}\n\n完整內容可到「紀錄」查看。`,
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('VomitingHealthEvent', { quickEntry: true }),
        });
      } else {
        // 儲存成功不另外提示，畫面會退回清單或首頁，轉場本身就是回饋；
        // 但安全提醒必須讓使用者看到，這種情況才保留對話框。
        const leave = () => (eventId ? navigation.goBack() : navigation.popToTop());
        if (safety)
          Alert.alert('安全提醒', VOMITING_SAFETY_MESSAGE, [{ text: '我知道了', onPress: leave }]);
        else leave();
      }
    } catch (requestError) {
      Alert.alert('儲存失敗', (requestError as Error).message || '請稍後再試');
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  const pageTitle = eventId ? '編輯嘔吐紀錄' : '記錄嘔吐';
  if (loading)
    return (
      <ScreenPageState title={pageTitle}>
        <HealthEventLoadingState text="正在載入嘔吐紀錄…" />
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

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          style={styles.intro}
          title={pageTitle}
          description="只記錄看到的狀況，不提供疾病診斷。"
          icon="alert-circle-outline"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />

        <View onLayout={position('vomitCount')}>
          <Text style={styles.label}>發生次數（必填）</Text>
          <OptionGroup
            label="發生次數"
            options={VOMIT_COUNT_OPTIONS}
            value={details.vomitCount}
            onChange={(vomitCount) => {
              clearError('vomitCount');
              setDetails((current) => ({ ...current, vomitCount }));
            }}
          />
          <FieldError message={errors.vomitCount} />
        </View>

        <View onLayout={position('energyCondition')}>
          <Text style={styles.label}>精神狀況（必填）</Text>
          <OptionGroup
            label="精神狀態"
            options={ENERGY_OPTIONS}
            value={details.energyCondition}
            onChange={(energyCondition) => {
              clearError('energyCondition');
              setDetails((current) => ({ ...current, energyCondition }));
            }}
          />
          <FieldError message={errors.energyCondition} />
        </View>

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

        <Text style={styles.label}>嚴重程度（必填）</Text>
        <OptionGroup<Severity>
          label="嚴重程度"
          options={severities}
          value={severity}
          onChange={setSeverity}
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
        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => setShowAdvanced((current) => !current)}
        >
          <Text style={styles.advancedText}>{showAdvanced ? '收合補充資訊' : '補充更多資訊'}</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advanced}>
            <Text style={styles.label}>顏色</Text>
            <OptionGroup
              label="顏色"
              options={VOMIT_COLOR_OPTIONS}
              value={details.color}
              onChange={(color) => setDetails((current) => ({ ...current, color }))}
            />

            <Text style={styles.label}>內容特徵（可複選）</Text>
            <OptionsWrap>
              <Toggle
                text="有泡沫"
                active={details.hasFoam}
                onPress={() => setDetails((current) => ({ ...current, hasFoam: !current.hasFoam }))}
              />
              <Toggle
                text="有未消化食物"
                active={details.hasFood}
                onPress={() => setDetails((current) => ({ ...current, hasFood: !current.hasFood }))}
              />
              <Toggle
                text="疑似有血"
                active={details.suspectedBlood}
                onPress={() =>
                  setDetails((current) => ({ ...current, suspectedBlood: !current.suspectedBlood }))
                }
              />
              <Toggle
                text="疑似有異物"
                active={details.suspectedForeignObject}
                onPress={() =>
                  setDetails((current) => ({
                    ...current,
                    suspectedForeignObject: !current.suspectedForeignObject,
                  }))
                }
              />
            </OptionsWrap>

            <Text style={styles.label}>飲水狀況</Text>
            <OptionGroup
              label="喝水狀況"
              options={DRINKING_OPTIONS}
              value={details.drinkingCondition}
              onChange={(drinkingCondition) =>
                setDetails((current) => ({ ...current, drinkingCondition }))
              }
            />

            <SupplementalNotesField
              value={notes}
              onChange={setNotes}
              maxLength={500}
              placeholder="簡短補充觀察到的狀況"
            />
          </View>
        )}

        {shouldShowVomitingSafety(details, severity) && (
          <View style={styles.safety}>
            <Text style={styles.safetyTitle}>安全提醒</Text>
            <Text style={styles.safetyText}>{VOMITING_SAFETY_MESSAGE}</Text>
          </View>
        )}

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
  quickActions: { marginTop: 20, gap: 5 },
  outline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  outlineText: { color: Colors.text, fontWeight: '700' },
  advancedButton: { paddingVertical: 14, alignItems: 'center' },
  advancedText: { color: Colors.primary, fontWeight: '700' },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  image: { width: 76, height: 76, borderRadius: 12 },
  removeImage: {
    color: Colors.dangerText,
    fontSize: Type.caption,
    textAlign: 'center',
    marginTop: 3,
  },
  advanced: { borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 2 },
  safety: {
    backgroundColor: Colors.warningSoft,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: 18,
    padding: 15,
    marginTop: 20,
  },
  safetyTitle: { color: Colors.warningTitle, fontWeight: '800' },
  safetyText: { color: Colors.warningText, lineHeight: 21, marginTop: 5 },
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
