import {
  captureExportGeneration,
  readExportTracking,
  writeExportTracking,
} from '../services/exportTrackingService';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：設定資料範圍、追蹤匯出進度，並分享或儲存完成檔案。 */
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { AppButton } from '../components/AppButton';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import * as exportService from '../services/exportService';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { ExportJob, ExportPeriod, ExportScope } from '../types';
import { Type } from '../constants/Typography';
import { SettingsPageHeader } from '../features/settings/components/SettingsPageHeader';
const periods: [ExportPeriod, string][] = [
  ['30_days', '最近 30 天'],
  ['90_days', '最近 90 天'],
  ['all', '全部'],
];
const Choice = ({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity onPress={onPress} style={[styles.choice, active && styles.choiceActive]}>
    <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text>
  </TouchableOpacity>
);
export default function ExportCenterScreen() {
  const isFocused = useIsFocused();
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [scope, setScope] = useState<ExportScope>('current_pet');
  const [period, setPeriod] = useState<ExportPeriod>('30_days');
  const [job, setJob] = useState<ExportJob | null>(null);
  const [sharing, setSharing] = useState(false);
  const createLock = useRef(false);
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const cancelLock = useRef(false);
  const shareLock = useRef(false);
  const [pollError, setPollError] = useState('');
  const [retryPoll, setRetryPoll] = useState(0);
  const [jobLabel, setJobLabel] = useState('');
  const requestRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const [trackingError, setTrackingError] = useState('');
  const [restoreRetry, setRestoreRetry] = useState(0);
  const [restoring, setRestoring] = useState(true);
  const trackingRef = useRef<{
    label: string;
    scope: ExportScope;
    period: ExportPeriod;
    petId?: string;
  } | null>(null);
  const currentOwner = useRef(session?.userId);
  currentOwner.current = session?.userId;
  useEffect(() => {
    let active = true;
    setJob(null);
    setJobLabel('');
    setPollError('');
    setRestoring(true);
    setTrackingError('');
    if (!session?.userId) {
      setRestoring(false);
      return;
    }
    void readExportTracking(session.userId)
      .then((saved) => {
        if (!active || !saved) return;
        trackingRef.current = saved;
        setJobLabel(saved.label);
        setScope(saved.scope);
        setPeriod(saved.period);
        setJob(saved.job);
      })
      .catch((e) => {
        if (active) setTrackingError((e as Error).message);
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [session?.userId, restoreRetry]);
  const persist = async (userId: string, nextJob: ExportJob, generation: number) => {
    if (!trackingRef.current) return;
    try {
      await writeExportTracking(userId, { ...trackingRef.current, job: nextJob }, generation);
    } catch {
      if (currentOwner.current === userId)
        setPollError('工作已建立，但本機追蹤尚未保存。請留在本頁並重試原工作。');
    }
  };
  const run = async () => {
    if (
      restoring ||
      trackingError ||
      createLock.current ||
      (job && ['queued', 'processing'].includes(job.status))
    )
      return;
    if (!session?.userId || (scope === 'current_pet' && !selectedPet)) {
      Alert.alert('無法匯出', '請先選擇毛孩');
      return;
    }
    createLock.current = true;
    setCreating(true);
    setPollError('');
    const userId = session.userId;
    const generation = captureExportGeneration(userId);
    const label = `${scope === 'current_pet' ? selectedPet?.name : '所有毛孩'} · ${periods.find(([value]) => value === period)?.[1]}`;
    trackingRef.current = {
      label,
      scope,
      period,
      petId: scope === 'current_pet' ? selectedPet?.id : undefined,
    };
    setJobLabel(label);
    try {
      setJob(null);
      const result = await exportService.createExport(session.userId, {
        format: 'pdf',
        scope,
        petId: scope === 'current_pet' ? selectedPet?.id : undefined,
        period,
        includeAiSummary: true,
      });
      if (currentOwner.current === userId) setJob(result);
      await persist(userId, result, generation);
    } catch (e) {
      Alert.alert('匯出失敗', (e as Error).message);
    } finally {
      createLock.current = false;
      setCreating(false);
    }
  };
  requestRef.current = run;
  useEffect(() => {
    if (
      !isFocused ||
      !session?.userId ||
      !job ||
      pollError ||
      !['queued', 'processing'].includes(job.status)
    )
      return;
    const controller = new AbortController();
    const timer = setTimeout(
      () =>
        exportService
          .getExport(session.userId, job.id, controller.signal)
          .then((updatedJob) => {
            if (!controller.signal.aborted) {
              setJob(updatedJob);
              void persist(session.userId, updatedJob, captureExportGeneration(session.userId));
            }
          })
          .catch((e) => {
            if (!controller.signal.aborted)
              setPollError((e as Error).message || '目前無法讀取進度');
          }),
      900,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [isFocused, job, session?.userId, pollError, retryPoll]);
  const share = async () => {
    if (!session?.userId || !job || shareLock.current) return;
    shareLock.current = true;
    try {
      setSharing(true);
      await exportService.downloadAndShareExport(session.userId, job);
      Alert.alert('報告已準備好', '照護報告已準備好，帶著 MEGO 一起照顧毛孩吧！');
    } catch (e) {
      Alert.alert('檔案處理失敗', (e as Error).message);
    } finally {
      shareLock.current = false;
      setSharing(false);
    }
  };
  const cancel = async () => {
    if (!session?.userId || !job || cancelLock.current) return;
    cancelLock.current = true;
    setCancelling(true);
    try {
      const cancelled = await exportService.cancelExport(session.userId, job.id);
      setJob(cancelled);
      await persist(session.userId, cancelled, captureExportGeneration(session.userId));
      setPollError('');
    } catch (error) {
      Alert.alert('取消尚未完成', (error as Error).message);
    } finally {
      cancelLock.current = false;
      setCancelling(false);
    }
  };
  const busy =
    Boolean(trackingError) ||
    restoring ||
    creating ||
    Boolean(job && ['queued', 'processing'].includes(job.status));
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <SettingsPageHeader page="ExportCenter" />
        {!!trackingError && (
          <View style={styles.status}>
            <Text accessibilityRole="alert" style={styles.error}>
              無法恢復原匯出工作：{trackingError}。請先重試，避免重複建立。
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="重新讀取本機匯出追蹤"
              onPress={() => setRestoreRetry((value) => value + 1)}
              style={{ minHeight: 48, justifyContent: 'center' }}
            >
              <Text style={styles.link}>重新讀取</Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.infoCard}>
          <View style={styles.infoHeading}>
            <View style={styles.infoIcon}>
              <Ionicons name="document-text-outline" size={20} color={Colors.primaryDecoration} />
            </View>
            <Text style={styles.infoTitle}>PDF 健康照護報告</Text>
          </View>
          <Text style={styles.muted}>第一頁先看毛孩病史與近期重點，後續保留完整紀錄明細。</Text>
        </View>
        <Text style={styles.label}>毛孩範圍</Text>
        <View style={styles.wrap}>
          <Choice
            active={scope === 'current_pet'}
            label={`目前毛孩${selectedPet ? `：${selectedPet.name}` : ''}`}
            onPress={() => setScope('current_pet')}
          />
          <Choice
            active={scope === 'all_pets'}
            label="所有毛孩"
            onPress={() => setScope('all_pets')}
          />
        </View>
        <Text style={styles.label}>日期範圍</Text>
        <View style={styles.wrap}>
          {periods.map(([v, l]) => (
            <Choice key={v} active={period === v} label={l} onPress={() => setPeriod(v)} />
          ))}
        </View>
        <AppButton
          variant="primary"
          disabled={!!busy}
          busy={!!busy}
          onPress={run}
          style={[styles.primary, busy && styles.disabled]}
          accessibilityLabel={busy ? '正在建立 PDF 報告' : '建立 PDF 報告'}
        >
          <Ionicons
            name={busy ? 'hourglass-outline' : 'arrow-down-circle-outline'}
            size={19}
            color={Colors.onPrimary}
          />
          <Text style={styles.primaryText}>{busy ? '匯出中…' : '建立 PDF 報告'}</Text>
        </AppButton>
        {job && (
          <View style={styles.status}>
            <Text style={styles.muted}>{jobLabel}</Text>
            {!!pollError && (
              <>
                <Text style={styles.error}>
                  進度讀取失敗：{pollError}。工作仍保留，可重新查詢。
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="重新查詢原匯出工作"
                  onPress={() => {
                    setPollError('');
                    setRetryPoll((value) => value + 1);
                  }}
                >
                  <Text style={styles.link}>重試查詢</Text>
                </TouchableOpacity>
              </>
            )}
            <View style={styles.statusHeading}>
              <View style={styles.statusIcon}>
                <Ionicons
                  name={
                    job.status === 'completed'
                      ? 'checkmark'
                      : job.status === 'failed'
                        ? 'alert-outline'
                        : job.status === 'cancelled'
                          ? 'close'
                          : 'hourglass-outline'
                  }
                  size={18}
                  color={
                    job.status === 'failed' ? Colors.dangerDecoration : Colors.primaryDecoration
                  }
                />
              </View>
              <Text style={styles.statusTitle}>
                {job.status === 'completed'
                  ? '報告已完成'
                  : job.status === 'failed'
                    ? '匯出失敗'
                    : job.status === 'cancelled'
                      ? '已取消匯出'
                      : '正在整理資料'}
              </Text>
            </View>
            {busy && (
              <>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${job.progress}%` }]} />
                </View>
                <Text style={styles.muted}>{job.progress}%</Text>
                <TouchableOpacity disabled={cancelling} onPress={cancel}>
                  <Text style={styles.danger}>{cancelling ? '取消中…' : '取消'}</Text>
                </TouchableOpacity>
              </>
            )}
            {job.status === 'failed' && (
              <>
                <Text style={styles.error}>{job.error || '請稍後重試'}</Text>
                <TouchableOpacity onPress={() => requestRef.current?.()}>
                  <Text style={styles.link}>重試</Text>
                </TouchableOpacity>
              </>
            )}
            {job.status === 'completed' && (
              <View style={styles.actions}>
                <TouchableOpacity disabled={sharing} style={styles.secondary} onPress={share}>
                  <Text style={styles.link}>{sharing ? '準備檔案中…' : '分享／下載'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondary} onPress={run}>
                  <Text style={styles.link}>重新匯出</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        <View style={styles.notice}>
          <View style={styles.noticeHeading}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={Colors.successDecoration}
            />
            <Text style={styles.noticeTitle}>報告內容</Text>
          </View>
          <Text style={styles.noticeText}>
            第一頁為看診快速摘要，後續列出毛孩資料、健康紀錄、提醒與就醫資訊；不包含圖片。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 40 },
  label: {
    fontSize: Type.callout,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 22,
    marginBottom: 9,
  },
  labelInline: { fontSize: Type.callout, fontWeight: '800', color: Colors.text },
  infoCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  infoTitle: { flex: 1, fontSize: Type.headline, fontWeight: '800', color: Colors.text },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  choiceActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  choiceText: { color: Colors.text, fontWeight: '600' },
  choiceTextActive: { color: Colors.onPrimary },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    marginTop: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 22,
    padding: 14,
    backgroundColor: Colors.surface,
    borderRadius: 16,
  },
  muted: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 18 },
  primary: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginTop: 26,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  disabled: { opacity: 0.55 },
  primaryText: { color: Colors.onPrimary, fontWeight: '800' },
  status: {
    marginTop: 18,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  statusTitle: { fontSize: Type.headline, fontWeight: '800', color: Colors.text },
  track: { height: 8, backgroundColor: Colors.border, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: Colors.primary },
  danger: { color: Colors.danger, fontWeight: '700', marginTop: 12 },
  error: { color: Colors.danger },
  link: { color: Colors.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  secondary: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  notice: {
    marginTop: 22,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSoft,
    gap: 5,
  },
  noticeHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noticeTitle: { color: Colors.text, fontSize: Type.footnote, fontWeight: '800' },
  noticeText: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 18 },
});
