import { useFormPet } from '../hooks/useFormPet';
import { dailyLogStyles as s } from '../features/daily-logs/dailyLogStyles';
import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../navigation/types';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { SelectionChip, SelectionGroup } from '../components/SelectionChip';
import { RecordActionButton } from '../components/RecordActionButton';
import SupplementalNotesField from '../components/SupplementalNotesField';
import { Colors } from '../constants/Colors';
import ScreenState from '../components/ScreenState';
import { ScreenPageHeader, ScreenPageFrame, ScreenPageState } from '../components/ScreenPageHeader';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { SaveStatusNotice, type SaveStatus } from '../components/SaveStatusNotice';
import { SoftEntrance } from '../components/SoftMotion';
import { LottieArt } from '../components/LottieArt';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  createDailyLog,
  deleteDailyLog,
  getDailyLog,
  getTodayDailyLog,
  updateDailyLog,
} from '../services/dailyLogService';
import { classifyStoolPhoto, StoolClassification } from '../services/stoolClassifierService';
import { DailyLog, DailyEnergyLevel, DailyStoolLevel, DailyWaterLevel } from '../types';
import { taipeiDateKey } from '../utils/taipeiDate';

const CLASSIFY_PAWS = require('../assets/artwork/care/paws-loading-success-v1.json');
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import {
  dailyLogDateLabel,
  dailyLogSnapshot,
  emptyDailyLog,
  shouldAutoApplyStool,
} from '../features/daily-logs/dailyLogContent';
const DAILY_ARTWORKS = {
  'morning-home': require('../assets/artwork/themes/morning-home/page-decorations/daily-checkin-v1.webp'),
  'afternoon-living-room': require('../assets/artwork/themes/afternoon-living-room/page-decorations/daily-checkin-v1.webp'),
  'garden-walk': require('../assets/artwork/themes/garden-walk/page-decorations/daily-checkin-v1.webp'),
};
const water: [DailyWaterLevel, string][] = [
  ['low', '偏少'],
  ['normal', '正常'],
  ['high', '偏多'],
];
const energy: [DailyEnergyLevel, string][] = [
  ['normal', '正常'],
  ['slightly_low', '稍沒精神'],
];
const stool: [DailyStoolLevel, string][] = [
  ['hard', '偏硬'],
  ['normal', '正常'],
  ['soft', '偏軟'],
  ['watery', '水狀'],
];
const dateKey = taipeiDateKey;
type Props = NativeStackScreenProps<HomeStackParamList, 'DailyLog'>;
export default function DailyLogScreen({ route, navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const { settings } = useSettings();
  const quickEntry = route.params?.quickEntry === true;
  const [record, setRecord] = useState<DailyLog | null>(null);
  const requestedDate = route.params?.recordDate?.slice(0, 10) || dateKey();
  const [draft, setDraft] = useState<Partial<DailyLog>>(() => emptyDailyLog(requestedDate));
  const [baseline, setBaseline] = useState(() => emptyDailyLog(requestedDate));
  const dirty = dailyLogSnapshot(draft) !== dailyLogSnapshot(baseline);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const discard = useCallback(() => setDraft(baseline), [baseline]);

  const recordDate = draft.localDate || requestedDate;
  const dateLabel = dailyLogDateLabel(recordDate);
  const headerDescription =
    recordDate === dateKey() ? '記下今天的吃喝與精神' : '記下這一天的吃喝與精神';
  const [classifierExpanded, setClassifierExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useUnsavedChangesGuard(dirty, discard, saving || deleting);
  const mutationInFlight = useRef(false);
  const deleteConfirmationOpen = useRef(false);
  const [error, setError] = useState('');
  // 這個畫面儲存後留在原地，沒有轉場可以當回饋，因此在頁面上顯示狀態。
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const [classifying, setClassifying] = useState(false);
  const [stoolSuggestion, setStoolSuggestion] = useState<StoolClassification | null>(null);
  const classificationInFlight = useRef(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!session?.userId || !selectedPet) {
        setLoading(false);
        return;
      }
      if (dirtyRef.current) return;
      setLoading(true);
      setError('');
      try {
        const result = route.params?.recordId
          ? await getDailyLog(session.userId, route.params.recordId, signal)
          : await getTodayDailyLog(
              session.userId,
              selectedPet.id,
              route.params?.recordDate?.slice(0, 10) || dateKey(),
              signal,
            );
        if (signal?.aborted) return;
        const selectedRecord = result.record;
        if (selectedRecord && selectedRecord.petId !== selectedPet.id)
          throw new Error('紀錄不屬於此表單毛孩，請返回重新開啟。');
        setRecord(selectedRecord);
        if (!dirtyRef.current) {
          const next = selectedRecord || emptyDailyLog(requestedDate);
          setDraft(next);
          setBaseline(next);
        }
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message || '載入失敗');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [session?.userId, selectedPet, route.params?.recordId, route.params?.recordDate, requestedDate],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void load(controller.signal);
      return () => controller.abort();
    }, [load]),
  );
  const set = (k: keyof DailyLog, v: string | boolean | number | undefined) =>
    setDraft((x) => ({ ...x, [k]: v }));
  const runStoolClassification = async (source: 'camera' | 'library') => {
    if (!session?.userId || !selectedPet || classificationInFlight.current) return;
    classificationInFlight.current = true;
    setClassifying(true);
    setStoolSuggestion(null);
    try {
      const result = await classifyStoolPhoto({
        source,
        userId: session.userId,
        petId: selectedPet.id,
      });
      if (!result) return;
      setStoolSuggestion(result);
      if (
        result.status === 'ok' &&
        result.suggestedStoolLevel &&
        shouldAutoApplyStool(draftRef.current.stoolLevel)
      ) {
        set('stoolLevel', result.suggestedStoolLevel);
      }
    } catch (classificationError) {
      Alert.alert(
        '暫時無法辨識照片',
        `${(classificationError as Error).message || '請稍後再試'}。你仍可手動選擇大便狀況並儲存紀錄。`,
      );
    } finally {
      classificationInFlight.current = false;
      setClassifying(false);
    }
  };
  const save = async () => {
    if (!session?.userId || !selectedPet || saving || deleting || mutationInFlight.current) return;
    mutationInFlight.current = true;
    setSaving(true);
    try {
      const data = {
        ...draft,
        localDate: recordDate,
        loggedAt: draft.loggedAt || emptyDailyLog(recordDate).loggedAt!,
      };
      const saved = record
        ? await updateDailyLog(session.userId, record.id, data)
        : await createDailyLog(session.userId, selectedPet.id, data);
      setRecord(saved.record);
      setBaseline(data);
      dirtyRef.current = dailyLogSnapshot(draftRef.current) !== dailyLogSnapshot(data);
      setError('');
      if (quickEntry) {
        Alert.alert('已記錄', `${dateLabel}的日常觀察已更新。完整紀錄可到「紀錄」查看。`, [
          { text: '完成', onPress: () => navigation.popToTop() },
        ]);
      } else {
        setSaveStatus({ tone: 'success', message: `${dateLabel}紀錄已更新。` });
        await load();
      }
    } catch (e) {
      setError((e as Error).message || '儲存失敗');
    } finally {
      mutationInFlight.current = false;
      setSaving(false);
    }
  };
  const remove = () => {
    if (
      !record ||
      !session?.userId ||
      saving ||
      deleting ||
      mutationInFlight.current ||
      deleteConfirmationOpen.current
    )
      return;
    deleteConfirmationOpen.current = true;
    Alert.alert(
      '刪除紀錄',
      '確定刪除這筆日常紀錄？',
      [
        {
          text: '取消',
          style: 'cancel',
          onPress: () => {
            deleteConfirmationOpen.current = false;
          },
        },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            deleteConfirmationOpen.current = false;
            if (mutationInFlight.current) return;
            mutationInFlight.current = true;
            setDeleting(true);
            try {
              await deleteDailyLog(session.userId, record.id);
              const next = emptyDailyLog(recordDate);
              setRecord(null);
              setDraft(next);
              setBaseline(next);
              dirtyRef.current = false;
              setError('');
            } catch (e) {
              setError((e as Error).message || '刪除失敗，請稍後再試');
            } finally {
              mutationInFlight.current = false;
              setDeleting(false);
            }
          },
        },
      ],
      { cancelable: false },
    );
  };
  if (loading)
    return (
      <ScreenPageState title="日常紀錄" description={headerDescription} icon="book-outline">
        <ScreenState loading text="載入中…" />
      </ScreenPageState>
    );
  return (
    <ScreenPageFrame>
      <KeyboardAwareScrollView
        contentContainerStyle={[s.page, { paddingBottom: bottomContentPadding }]}
      >
        <ScreenPageHeader
          title="日常紀錄"
          description={headerDescription}
          icon="book-outline"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        <SaveStatusNotice status={saveStatus} onDismiss={() => setSaveStatus(null)} />
        <View style={s.pageDecoration}>
          <SoftEntrance>
            <Image
              accessible={false}
              resizeMode="contain"
              source={DAILY_ARTWORKS[settings.homeTheme]}
              style={s.pageArtwork}
            />
          </SoftEntrance>
        </View>
        <Text style={s.introHint}>紀錄日期：{dateLabel}</Text>
        {error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        ) : null}
        {error && !dirty ? (
          <AppButton title="重新載入" variant="tertiary" onPress={() => void load()} />
        ) : null}
        <Text style={s.label}>喝水量</Text>
        <Options
          label="喝水量"
          values={water}
          value={draft.waterLevel}
          onPick={(v) => set('waterLevel', v)}
        />
        <Text style={s.label}>飼料量</Text>
        <Options
          label="飼料量"
          values={water}
          value={draft.foodLevel}
          onPick={(v) => set('foodLevel', v)}
        />
        <Text style={s.label}>精神狀態</Text>
        <Options
          label="精神狀態"
          values={energy}
          value={draft.energyLevel}
          onPick={(v) => set('energyLevel', v)}
        />
        <Text style={s.label}>大便狀況</Text>
        <Options
          label="大便狀況"
          values={stool}
          value={draft.stoolLevel}
          onPick={(v) => set('stoolLevel', v)}
        />
        <View style={s.classifierSection}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ expanded: classifierExpanded }}
            accessibilityLabel="用照片取得建議"
            style={s.classifierHeading}
            onPress={() => setClassifierExpanded((value) => !value)}
          >
            <Ionicons name="scan-outline" size={18} color={Colors.primaryDecoration} />
            <Text style={s.classifierTitle}>用照片取得建議</Text>
            <Ionicons
              name={classifierExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.subtext}
            />
          </TouchableOpacity>
          {classifierExpanded ? (
            <>
              <Text style={s.classifierHint}>
                你選擇辨識後，照片會送至 MEGO 後端暫時處理，不會存入照護紀錄或附件，也不會傳給 MEGO
                AI。結果僅供參考，請確認大便狀況選項。
              </Text>
              <View style={s.classifierActions}>
                <AppButton
                  title={classifying ? '辨識中…' : '拍照辨識'}
                  variant="secondary"
                  disabled={classifying}
                  accessibilityLabel="拍攝糞便照片並取得分類建議"
                  style={s.classifierButton}
                  onPress={() => void runStoolClassification('camera')}
                >
                  {classifying ? (
                    <LottieArt source={CLASSIFY_PAWS} style={s.classifierWaiting} />
                  ) : (
                    <Ionicons name="camera-outline" size={19} color={Colors.successDecoration} />
                  )}
                  <Text style={s.classifierButtonText}>{classifying ? '辨識中…' : '拍照辨識'}</Text>
                </AppButton>
                <AppButton
                  title="從相簿選擇"
                  variant="secondary"
                  disabled={classifying}
                  accessibilityLabel="從相簿選取糞便照片並取得分類建議"
                  style={s.classifierButton}
                  onPress={() => void runStoolClassification('library')}
                >
                  <Ionicons name="images-outline" size={19} color={Colors.successDecoration} />
                  <Text style={s.classifierButtonText}>從相簿選擇</Text>
                </AppButton>
              </View>
            </>
          ) : null}
          {stoolSuggestion ? (
            <View style={s.suggestion} accessibilityLiveRegion="polite">
              <Text style={s.suggestionTitle}>
                {stoolSuggestion.status === 'ok'
                  ? `照片建議：${stoolSuggestion.suggestedStoolLabel}（信心 ${Math.round(stoolSuggestion.confidence * 100)}%）`
                  : stoolSuggestion.message || '目前無法判斷照片'}
              </Text>
              <Text style={s.suggestionText}>
                {stoolSuggestion.status === 'ok'
                  ? `目前選擇：${stool.find(([value]) => value === draft.stoolLevel)?.[1] || '尚未選擇'}。請確認或手動修改，再儲存紀錄。`
                  : '請重新拍攝，或直接手動選擇大便狀況。'}
              </Text>
              {stoolSuggestion.status === 'ok' &&
              stoolSuggestion.suggestedStoolLevel &&
              draft.stoolLevel !== stoolSuggestion.suggestedStoolLevel ? (
                <AppButton
                  title={`採用建議：${stoolSuggestion.suggestedStoolLabel}`}
                  variant="secondary"
                  style={s.suggestionAction}
                  onPress={() => set('stoolLevel', stoolSuggestion.suggestedStoolLevel!)}
                />
              ) : null}
              <Text style={s.suggestionDisclaimer}>{stoolSuggestion.disclaimer}</Text>
            </View>
          ) : null}
        </View>
        <SupplementalNotesField
          value={draft.notes || ''}
          onChange={(value) => set('notes', value)}
          maxLength={150}
        />
        <AppButton
          title={
            saving
              ? '儲存中…'
              : record
                ? '儲存這筆紀錄'
                : recordDate === dateKey()
                  ? '儲存今日紀錄'
                  : '儲存這天的紀錄'
          }
          variant="primary"
          disabled={saving || deleting}
          busy={saving}
          style={s.save}
          textStyle={s.saveText}
          onPress={save}
        />
        {record && !quickEntry ? (
          <RecordActionButton
            kind="delete"
            label={deleting ? '刪除中…' : '刪除這筆紀錄'}
            disabled={saving || deleting}
            busy={deleting}
            style={s.deleteAction}
            onPress={remove}
          />
        ) : null}
      </KeyboardAwareScrollView>
    </ScreenPageFrame>
  );
}
function Options({
  label,
  values,
  value,
  onPick,
}: {
  label: string;
  values: [string | boolean | number, string][];
  value: string | boolean | number | undefined;
  onPick: (v: string | boolean | number) => void;
}) {
  return (
    <SelectionGroup label={label}>
      {values.map(([v, l]) => (
        <SelectionChip
          size="form"
          selected={value === v}
          label={l}
          key={String(v)}
          onPress={() => onPick(v)}
        />
      ))}
    </SelectionGroup>
  );
}
