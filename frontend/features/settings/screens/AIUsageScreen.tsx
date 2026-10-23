import { SettingsPageHeader, SettingsPageState } from '../components/SettingsPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：設定中的 AI 使用狀況；由 ProfileStack 的 AIUsage route 開啟。 */
import React, { useCallback, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../../../constants/Colors';
import ScreenState from '../../../components/ScreenState';
import { useAuth } from '../../../contexts/AuthContext';
import {
  AIUsage,
  AIUsageHistory,
  getAIUsage,
  getAIUsageHistory,
} from '../../../services/aiService';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { formatTaipeiDate, taipeiDateKey } from '../../../utils/taipeiDate';
import { Type } from '../../../constants/Typography';

export function AIUsageScreen() {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [history, setHistory] = useState<AIUsageHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);
  const userId = session?.userId;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++requestRef.current;
      const isCurrent = () => requestId === requestRef.current;
      setLoading(true);
      setError('');
      setUsage(null);
      setHistory(null);
      if (!userId) {
        setError('請先登入以查看 AI 使用紀錄');
        setLoading(false);
        return;
      }
      try {
        const [today, recent] = await Promise.allSettled([
          getAIUsage(userId, signal),
          getAIUsageHistory(userId, 7, signal),
        ]);
        if (isCurrent()) {
          if (today.status === 'fulfilled') setUsage(today.value);
          if (recent.status === 'fulfilled') setHistory(recent.value);
          setError(
            [
              today.status === 'rejected' ? '今日用量載入失敗' : '',
              recent.status === 'rejected' ? '近 7 天用量載入失敗' : '',
            ]
              .filter(Boolean)
              .join('；'),
          );
        }
      } catch (caught) {
        if (isCurrent()) setError((caught as Error).message || '暫時無法取得 AI 使用紀錄');
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [userId],
  );
  useFocusEffect(
    React.useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => {
        controller.abort();
        requestRef.current++;
      };
    }, [load]),
  );
  if (loading)
    return (
      <SettingsPageState page="AIUsage">
        <ScreenState loading text="正在載入 AI 使用紀錄…" />
      </SettingsPageState>
    );
  if (!usage && !history)
    return (
      <SettingsPageState page="AIUsage">
        <ScreenState error text={error || '暫時無法取得 AI 使用紀錄'} action={() => void load()} />
      </SettingsPageState>
    );
  const used = usage?.used ?? 0;
  const maximum = Math.max(1, ...(history?.dailyUsage ?? []).map((entry) => entry.used));
  const todayKey = taipeiDateKey();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safe}>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}>
        <SettingsPageHeader page="AIUsage" style={{ marginBottom: 0 }} />
        {!!error && <ScreenState error text={error} action={() => void load()} />}
        {usage && (
          <View style={s.usageCard}>
            <View style={s.cardHeading}>
              <View style={s.todayIcon}>
                <Ionicons name="today-outline" size={18} color={Colors.primaryDecoration} />
              </View>
              <Text style={s.cardTitle}>今天</Text>
            </View>
            <View style={s.metricRow}>
              <Text style={s.usageValue}>{used}</Text>
              <Text style={s.usageUnit}>次使用</Text>
            </View>
            <Text style={s.usageHint}>
              {usage.unlimited
                ? '目前沒有每日使用次數上限。'
                : `今天還可使用 ${usage.remaining ?? 0} 次，額度於台灣時間午夜更新。`}
            </Text>
          </View>
        )}
        {history && (
          <View style={s.historyCard}>
            <View style={s.historyHeading}>
              <View>
                <Text style={s.cardTitle}>近 7 天</Text>
                <Text style={s.historySub}>每日使用次數</Text>
              </View>
              <View style={s.totalPill}>
                <Text style={s.totalLabel}>合計</Text>
                <Text style={s.totalValue}>{history.totalUsed} 次</Text>
              </View>
            </View>
            {history.dailyUsage.map((entry, index) => {
              const isToday = entry.date === todayKey;
              const dateLabel = formatTaipeiDate(`${entry.date}T12:00:00+08:00`, {
                month: 'numeric',
                day: 'numeric',
                weekday: 'short',
              });
              const barWidth = entry.used
                ? (`${Math.max(5, (entry.used / maximum) * 100)}%` as `${number}%`)
                : 0;
              return (
                <View key={entry.date} style={[s.historyRow, index === 0 && s.firstHistoryRow]}>
                  <View style={s.dateLabelWrap}>
                    <Text style={[s.dateLabel, isToday && s.todayLabel]}>{dateLabel}</Text>
                    {isToday ? <Text style={s.todayBadge}>今天</Text> : null}
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: barWidth }]} />
                  </View>
                  <Text style={s.countLabel}>{entry.used} 次</Text>
                </View>
              );
            })}
            <View style={s.usageNotice}>
              <Ionicons name="heart-outline" size={18} color={Colors.successDecoration} />
              <Text style={s.usageNoticeText}>
                AI 回覆供照護整理與一般資訊參考，不取代獸醫判斷。
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 45, gap: 12 },
  usageCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  todayIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: Colors.text, fontSize: Type.headline, fontWeight: '900' },
  metricRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8 },
  usageValue: { color: Colors.primary, fontSize: Type.hero, lineHeight: 43, fontWeight: '900' },
  usageUnit: { marginLeft: 7, color: Colors.subtext, fontSize: Type.subhead, fontWeight: '700' },
  usageHint: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 19, marginTop: 3 },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historySub: { color: Colors.subtext, fontSize: Type.caption, marginTop: 3 },
  totalPill: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: Colors.successSoft,
    alignItems: 'flex-end',
  },
  totalLabel: { color: Colors.subtext, fontSize: Type.caption2, fontWeight: '700' },
  totalValue: { color: Colors.success, fontSize: Type.footnote, fontWeight: '900', marginTop: 1 },
  historyRow: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingVertical: 6,
  },
  firstHistoryRow: { borderTopWidth: 0 },
  dateLabelWrap: { width: 100, flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateLabel: { color: Colors.subtext, fontSize: Type.caption, fontWeight: '700' },
  todayLabel: { color: Colors.primary },
  todayBadge: {
    fontSize: Type.caption2,
    color: Colors.primary,
    fontWeight: '800',
    backgroundColor: Colors.primarySoft,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 7,
  },
  barTrack: {
    height: 8,
    flex: 1,
    borderRadius: 5,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: Colors.primary },
  countLabel: {
    width: 43,
    marginLeft: 9,
    textAlign: 'right',
    color: Colors.text,
    fontSize: Type.caption,
    fontWeight: '800',
  },
  usageNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: Colors.successSoft,
    borderRadius: 16,
    padding: 11,
    marginTop: 12,
  },
  usageNoticeText: { flex: 1, color: Colors.successText, fontSize: Type.caption, lineHeight: 18 },
});
