import { useFormPet } from '../hooks/useFormPet';
import { ScreenPageHeader } from '../components/ScreenPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：新增或編輯體重，驗證公斤數與有效測量日期並防止重複提交。 */
import React, { useRef, useState } from 'react';
import AttachmentPicker from '../components/AttachmentPicker';
import { ATTACHMENT_LIMITS } from '../constants/Attachments';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightForm'>;

export default function WeightFormScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const record = route.params?.record;
  const quickEntry = route.params?.quickEntry === true;
  const { session } = useAuth();
  const { refreshPets } = usePet();
  const selectedPet = useFormPet(record?.petId);
  const initialDate = record ? new Date(record.measuredAt) : new Date();
  const [weight, setWeight] = useState(record ? String(record.weightKg) : '');
  const [date, setDate] = useState(Number.isNaN(initialDate.getTime()) ? new Date() : initialDate);
  const [notes, setNotes] = useState(record?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const attachmentActivity = useRef(false);
  const submissionLock = useRef(false);
  const { errors, scrollRef, position, showErrors, clearError } = useFormFieldErrors<
    'weight' | 'date'
  >();
  const [attachments, setAttachments] = useState(record?.attachments ?? []);

  const formValues = { weight, date, notes, attachments };
  const { markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setWeight(value.weight);
      setDate(value.date);
      setNotes(value.notes);
      setAttachments(value.attachments);
    },
    true,
    submitting,
  );

  const submit = async () => {
    if (submitting || attachmentsBusy || attachmentActivity.current || submissionLock.current)
      return;
    const normalizedWeight = weight.trim();
    const value = Number(normalizedWeight);
    const problems: Partial<Record<'weight' | 'date', string>> = {};
    if (
      !/^\d+(\.\d{1,2})?$/.test(normalizedWeight) ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 300
    )
      problems.weight = '體重需大於 0、不超過 300 kg，且最多兩位小數。';
    if (Number.isNaN(date.getTime()) || date.getTime() > Date.now())
      problems.date = '測量日期必須有效，且不可晚於今天。';
    if (!showErrors(problems, ['weight', 'date'])) return;
    if (!session?.userId || (!record && !selectedPet)) {
      Alert.alert('儲存失敗', '找不到目前登入使用者或毛孩資料');
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    try {
      const data = {
        weightKg: value,
        measuredAt: date.toISOString(),
        notes: notes.trim(),
        attachmentIds: attachments.map((item) => item.id),
      };
      if (record) {
        await service.updateWeight(session.userId, record.id, data);
      } else if (selectedPet) {
        await service.createWeight(session.userId, selectedPet.id, data);
      }
      markSaved(formValues);
      await refreshPets();
      if (quickEntry) {
        showQuickRecordFeedback({
          message: '體重紀錄已儲存，完整趨勢可到「紀錄」查看。',
          onDone: () => navigation.popToTop(),
          onAddAnother: () => navigation.replace('WeightForm', { quickEntry: true }),
        });
      } else {
        markSaved(formValues, () => navigation.goBack());
      }
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      submissionLock.current = false;
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
          title={record ? '編輯體重' : '新增體重'}
          description="相近條件量測更容易比較"
          icon="scale-outline"
        />
        <View onLayout={position('weight')}>
          <Text style={styles.label}>體重（kg）（必填）</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={(next) => {
              clearError('weight');
              setWeight(next);
            }}
            keyboardType="decimal-pad"
            placeholder="例如 8.2"
            editable={!submitting}
          />
          <FieldError message={errors.weight} />
        </View>

        <View onLayout={position('date')}>
          <DatePickerField
            label="測量日期（必填）"
            value={date}
            maximumDate={new Date()}
            disabled={submitting || attachmentsBusy}
            onChange={(next) => {
              clearError('date');
              setDate(next);
            }}
          />
          <FieldError message={errors.date} />
        </View>

        <SupplementalNotesField value={notes} onChange={setNotes} />

        {session?.userId && (selectedPet || record) && (
          <AttachmentPicker
            onBusyChange={(busy) => {
              attachmentActivity.current = busy;
              setAttachmentsBusy(busy);
            }}
            userId={session.userId}
            petId={record?.petId || selectedPet!.id}
            sourceType="weight"
            limit={ATTACHMENT_LIMITS.weight}
            value={attachments}
            onChange={setAttachments}
            disabled={submitting || attachmentsBusy}
          />
        )}

        <AppButton
          title={submitting ? '儲存中…' : '儲存體重'}
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
  submit: {
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: FORM_BUTTON_RADIUS,
    alignItems: 'center',
    marginTop: FORM_ACTION_GAP,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  disabled: { opacity: 0.55 },
  submitText: { color: Colors.onPrimary, fontWeight: '800' },
});
