import React from 'react';
import { StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';
import { FieldError } from '../../../components/FieldError';
import DatePickerField from '../../../components/DatePickerField';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import {
  FORM_FIELD_GAP,
  FORM_FIELD_HEIGHT,
  FORM_FIELD_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_FIELD_PADDING_HORIZONTAL,
  FORM_FIELD_RADIUS,
} from '../../../constants/FormTokens';
import type { PetFormTextField as PetFormTextFieldData } from '../petFormContent';
import { Type } from '../../../constants/Typography';
import { PET_NAME_MAX_LENGTH, petNameLength, limitPetName } from '../petFormContent';
import { taipeiDateKey, taipeiDateFromKey } from '../../../utils/taipeiDate';

type Props = {
  field: PetFormTextFieldData;
  value: string;
  onChange: (value: string) => void;
  /** 驗證失敗時顯示在欄位下方，取代打斷流程的 Alert。 */
  error?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export default function PetFormTextField({ field, value, onChange, error, onLayout }: Props) {
  const isDate = field.key === 'birthday' || field.key === 'arrivalDate';

  return (
    <View style={styles.fieldGroup} onLayout={onLayout}>
      {isDate ? (
        <>
          <Text style={styles.label}>{field.label}</Text>
          <DatePickerField
            label=""
            value={value ? taipeiDateFromKey(value) : undefined}
            placeholder={field.placeholder}
            onChange={(date) => onChange(taipeiDateKey(date))}
            maximumDate={new Date()}
          />
        </>
      ) : field.multiline ? (
        <SupplementalNotesField
          label={field.label}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
        />
      ) : (
        <>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={field.key === 'name' ? (text) => onChange(limitPetName(text)) : onChange}
            accessibilityLabel={field.label}
            // Native maxLength counts UTF-16 units; the change handler enforces 20 code points.
            maxLength={field.key === 'name' ? PET_NAME_MAX_LENGTH * 2 : undefined}
            placeholder={field.placeholder}
            placeholderTextColor={Colors.subtext}
          />
          {field.key === 'name' && (
            <Text
              style={[styles.counter, petNameLength(value) > PET_NAME_MAX_LENGTH && styles.error]}
              accessibilityLiveRegion="polite"
            >
              {petNameLength(value)}/{PET_NAME_MAX_LENGTH}
            </Text>
          )}
        </>
      )}
      <FieldError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  counter: { color: Colors.subtext, fontSize: Type.caption, textAlign: 'right', marginTop: 4 },
  error: { color: Colors.dangerText },
  fieldGroup: { marginBottom: FORM_FIELD_GAP },
  label: {
    color: Colors.text,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
  },
  input: {
    fontSize: FORM_FIELD_FONT_SIZE,
    minHeight: FORM_FIELD_HEIGHT,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: FORM_FIELD_RADIUS,
    paddingHorizontal: FORM_FIELD_PADDING_HORIZONTAL,
    color: Colors.text,
  },
});
