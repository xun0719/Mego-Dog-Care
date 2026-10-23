import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { Type } from '../../../constants/Typography';

type Props = {
  upcomingDays?: number;
  scheduledDate?: string;
  count: number;
  showMissingSource: boolean;
  /** 回憶中的毛孩不提供新增；未傳入時不顯示按鈕。 */
  onCreate?: () => void;
};

export default function ReminderListHeader({
  upcomingDays,
  scheduledDate,
  count,
  showMissingSource,
  onCreate,
}: Props) {
  const todayOnly = upcomingDays === 0;
  const selectedDateLabel = scheduledDate
    ? new Date(`${scheduledDate}T12:00:00`).toLocaleDateString('zh-TW', {
        month: 'long',
        day: 'numeric',
      })
    : null;
  return (
    <>
      {onCreate ? (
        <AppButton
          variant="primary"
          style={styles.primary}
          onPress={onCreate}
          accessibilityLabel="新增提醒"
        >
          <Ionicons name="add" size={20} color={Colors.onPrimary} />
          <Text style={styles.primaryText}>新增提醒</Text>
        </AppButton>
      ) : null}
      <View style={styles.listContext}>
        <View style={styles.contextIcon}>
          <Ionicons name="notifications-outline" size={18} color={Colors.primaryDecoration} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.contextTitle}>
            {selectedDateLabel
              ? `${selectedDateLabel} 的提醒`
              : todayOnly
                ? '今天待做事項'
                : '已排程的照護事項'}
          </Text>
          <Text style={styles.contextHint}>
            {selectedDateLabel
              ? '顯示這一天已安排的提醒'
              : todayOnly
                ? '只顯示今天尚未完成的提醒'
                : '依日期安排，最遠顯示未來一年'}
          </Text>
        </View>
        <Text style={styles.count}>{count} 項</Text>
      </View>
      {showMissingSource ? (
        <Text style={styles.sourceMissing}>來源提醒可能已刪除或不屬於目前毛孩。</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  primaryText: { color: Colors.onPrimary, fontWeight: '800' },
  listContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
    paddingHorizontal: 2,
  },
  contextIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  flex: { flex: 1, minWidth: 0 },
  contextTitle: { color: Colors.text, fontSize: Type.callout, fontWeight: '800' },
  contextHint: { color: Colors.subtext, fontSize: Type.caption, marginTop: 2 },
  count: { color: Colors.primary, fontSize: Type.caption, fontWeight: '800' },
  sourceMissing: { color: Colors.dangerText, textAlign: 'center', marginBottom: 12 },
});
