import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { AppButton } from '../../../components/AppButton';
import { Type } from '../../../constants/Typography';

export function TimelineEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>
        <Ionicons name="paw-outline" size={28} color={Colors.primaryDecoration} />
      </View>
      <Text style={styles.empty}>這一天還沒有紀錄</Text>
      <Text style={styles.emptyHint}>有記下的日常、提醒或健康照護，都會顯示在這裡。</Text>
      {onCreate ? (
        <AppButton title="新增這一天的日常紀錄" style={{ marginTop: 16 }} onPress={onCreate} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: { alignItems: 'center', paddingVertical: 38 },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyHint: { color: Colors.subtext, fontSize: Type.footnote, marginTop: 8, textAlign: 'center' },
  empty: { color: Colors.text, fontWeight: '700', textAlign: 'center' },
});
