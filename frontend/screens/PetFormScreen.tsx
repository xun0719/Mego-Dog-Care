import { ScreenPageHeader } from '../components/ScreenPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 毛孩新增與編輯共用表單，集中處理欄位驗證與健康資料輸入。 */
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Colors } from '../constants/Colors';
import {
  FORM_BUTTON_HEIGHT,
  FORM_FIELD_GAP,
  FORM_BUTTON_RADIUS,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_PAGE_HORIZONTAL_PADDING,
} from '../constants/FormTokens';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { SelectionChip } from '../components/SelectionChip';
import { emptyPetData, PetData } from '../types';
import { useAuth } from '../contexts/AuthContext';
import PetAvatarPicker from '../features/pets/components/PetAvatarPicker';
import PetFormTextField from '../features/pets/components/PetFormTextField';
import {
  PET_FORM_FIELDS,
  PET_NAME_MAX_LENGTH,
  petNameLength,
  PetFormTextField as PetFormTextFieldData,
} from '../features/pets/petFormContent';
import { useFormUnsavedChangesGuard } from '../hooks/useFormUnsavedChangesGuard';
import { FieldError } from '../components/FieldError';
import { useFormFieldErrors } from '../hooks/useFormFieldErrors';
import { Type } from '../constants/Typography';

interface PetFormScreenProps {
  title: string;
  submitLabel: string;
  initialData?: PetData;
  onSubmit: (data: PetData) => Promise<void | boolean> | void | boolean;
  onSaved?: () => void;
  onCancel?: () => void;
  bottomContentPadding?: number;
  /** 表單最下方的額外區塊，例如編輯毛孩時的回憶入口。 */
  footer?: React.ReactNode;
  pageHeader?: boolean;
}

type PetField = 'name' | 'breed' | 'gender' | 'birthday' | 'arrivalDate';
const FIELD_ORDER: readonly PetField[] = ['name', 'breed', 'gender', 'birthday', 'arrivalDate'];

export default function PetFormScreen({
  title,
  submitLabel,
  initialData,
  onSubmit,
  onSaved,
  onCancel,
  bottomContentPadding,
  footer,
  pageHeader = false,
}: PetFormScreenProps) {
  const { session } = useAuth();
  const [form, setForm] = useState<PetData>({ ...emptyPetData, ...initialData });
  const mutationLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const { markSaved } = useFormUnsavedChangesGuard(form, setForm, true, saving);
  const { errors, scrollRef, position, showErrors, clearError } = useFormFieldErrors<
    PetField,
    ScrollView
  >();
  const update = <K extends keyof PetData>(key: K, value: PetData[K]) => {
    clearError(key as PetField);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    if (mutationLock.current) return;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const problems: Partial<Record<PetField, string>> = {};
    if (!form.name.trim()) problems.name = '請填寫毛孩姓名。';
    else if (petNameLength(form.name.trim()) > PET_NAME_MAX_LENGTH)
      problems.name = `毛孩姓名最多 ${PET_NAME_MAX_LENGTH} 個字元，請縮短後再儲存。`;
    if (!form.breed.trim()) problems.breed = '請填寫品種。';
    if (!form.gender) problems.gender = '請選擇性別。';
    if (form.birthday && !datePattern.test(form.birthday))
      problems.birthday = '出生日期請使用 YYYY-MM-DD 格式。';
    if (!form.arrivalDate.trim()) problems.arrivalDate = '請選擇到家日期。';
    else if (!datePattern.test(form.arrivalDate))
      problems.arrivalDate = '到家日期請使用 YYYY-MM-DD 格式。';
    if (!showErrors(problems, FIELD_ORDER)) return;
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    try {
      const result = await onSubmit({
        ...form,
        name: form.name.trim(),
        gender: form.gender,
        breed: form.breed.trim(),
      });
      if (result !== false) markSaved(form, onSaved);
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  };

  const renderFields = (items: PetFormTextFieldData[]) =>
    items.map((field) => (
      <PetFormTextField
        key={field.key}
        field={field}
        value={form[field.key]}
        error={errors[field.key as PetField]}
        onLayout={position(field.key as PetField)}
        onChange={(value) => update(field.key, value)}
      />
    ));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.content,
            bottomContentPadding !== undefined && { paddingBottom: bottomContentPadding },
          ]}
        >
          {pageHeader ? (
            <ScreenPageHeader
              style={styles.formIntro}
              title={title}
              description="先完成毛孩的基本資料"
              icon="paw"
              iconColor={Colors.primaryDecoration}
              iconBackground={Colors.primarySoft}
            />
          ) : (
            <View style={styles.formIntro}>
              <View style={styles.formIntroIcon}>
                <Ionicons name="paw" size={23} color={Colors.primaryDecoration} />
              </View>
              <View style={styles.formIntroCopy}>
                <Text style={styles.formEyebrow}>毛孩資料</Text>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.formHint}>先完成基本資料，日後照護紀錄會更貼近牠。</Text>
              </View>
            </View>
          )}

          <PetAvatarPicker
            avatarUri={form.avatarUri}
            avatarAttachmentId={form.avatarAttachmentId}
            userId={session?.userId}
            onChange={(uri) => update('avatarUri', uri)}
            onAttachmentChange={(attachmentId) => update('avatarAttachmentId', attachmentId)}
          />

          <Text style={styles.sectionHeading}>基本資料</Text>
          {renderFields(PET_FORM_FIELDS.slice(0, 2))}
          <View onLayout={position('gender')}>
            <Text style={styles.label}>性別（必填）</Text>
            <View style={styles.optionRow} accessibilityRole="radiogroup" accessibilityLabel="性別">
              {(
                [
                  ['male', '公'],
                  ['female', '母'],
                ] as const
              ).map(([value, label]) => (
                <SelectionChip
                  key={value}
                  size="form"
                  label={label}
                  selected={form.gender === value}
                  style={styles.option}
                  onPress={() => update('gender', value)}
                />
              ))}
            </View>
            <FieldError message={errors.gender} />
          </View>
          <Text style={styles.label}>品種類型（必填）</Text>
          <View
            style={styles.optionRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="品種類型"
          >
            {(
              [
                ['purebred', '純種'],
                ['mixed', '混種'],
                ['unknown', '不確定'],
              ] as const
            ).map(([value, label]) => (
              <SelectionChip
                key={value}
                size="form"
                label={label}
                selected={form.breedType === value}
                style={styles.option}
                onPress={() => update('breedType', value)}
              />
            ))}
          </View>

          <Text style={styles.sectionHeading}>生活資訊</Text>
          {renderFields(PET_FORM_FIELDS.slice(2, 4))}

          <Text style={styles.sectionHeading}>健康備註</Text>
          <Text style={styles.sectionHint}>有過敏或慢性病時，AI 整理與就醫前摘要會一併參考。</Text>
          {renderFields(PET_FORM_FIELDS.slice(4, 6))}

          <Text style={styles.sectionHeading}>身分資訊</Text>
          <Text style={styles.sectionHint}>選填。可用於毛孩身分卡與 QR 身分頁。</Text>
          {renderFields(PET_FORM_FIELDS.slice(6))}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>結紮狀態</Text>
              <Text style={styles.hint}>{form.neutered ? '已結紮' : '未結紮'}</Text>
            </View>
            <Switch
              value={form.neutered}
              onValueChange={(value) => update('neutered', value)}
              trackColor={{ true: Colors.primary }}
            />
          </View>

          <AppButton
            title={saving ? (form.avatarUri ? '正在上傳照片並儲存…' : '正在儲存…') : submitLabel}
            variant="primary"
            busy={saving}
            style={styles.submitButton}
            textStyle={styles.submitText}
            onPress={submit}
          />
          {onCancel && (
            <AppButton
              title="取消"
              variant="secondary"
              disabled={saving}
              style={styles.cancelButton}
              textStyle={styles.cancelText}
              onPress={onCancel}
            />
          )}
          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 48 },
  formIntro: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
  formHint: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 19, marginTop: 3 },
  title: {
    color: Colors.text,
    fontSize: Type.title1,
    fontWeight: '800',
  },
  sectionHeading: {
    color: Colors.text,
    fontSize: Type.headline,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 3,
  },
  sectionHint: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 18, marginBottom: 2 },
  label: {
    color: Colors.text,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
  },
  optionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: FORM_BUTTON_HEIGHT,
  },
  hint: { color: Colors.subtext, fontSize: Type.caption },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    minHeight: FORM_BUTTON_HEIGHT,
    borderRadius: FORM_BUTTON_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: { color: Colors.onPrimary, fontSize: Type.headline, fontWeight: '700' },
  cancelButton: { alignItems: 'center', padding: 18, marginTop: FORM_FIELD_GAP },
  cancelText: { color: Colors.subtext, fontWeight: '600' },
});
