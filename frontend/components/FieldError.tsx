/** 用途：表單欄位下方的錯誤訊息；取代打斷流程的 Alert，讓使用者直接看到是哪一欄。 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../constants/Colors';
import { CardSurface } from '../constants/Layout';
import { Type } from '../constants/Typography';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.text}>
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...CardSurface.hint,
    color: Colors.dangerText,
    fontSize: Type.footnote,
    marginTop: 6,
  },
});

export default FieldError;
