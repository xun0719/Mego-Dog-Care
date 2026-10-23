import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：顯示全量體重摘要、期間篩選、折線趨勢與可管理的歷史紀錄。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RecordEmptyState } from '../components/RecordEmptyState';
import { RecordActionButton } from '../components/RecordActionButton';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import FilterChip from '../components/FilterChip';
import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import ScreenState from '../components/ScreenState';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/weightService';
import { WeightRecord, WeightSummary } from '../types';
import {
  EMPTY_WEIGHT_SUMMARY,
  filterWeightsByPeriod,
  formatWeightDate,
  WEIGHT_PERIODS,
  WeightPeriod,
} from '../features/weights/weightListContent';
import { WeightLineChart } from '../features/weights/components/WeightLineChart';
import { WeightSummaryCard } from '../features/weights/components/WeightSummaryCard';
import { weightListStyles as styles } from '../features/weights/weightListStyles';

type Props = NativeStackScreenProps<HomeStackParamList, 'WeightList'>;

export default function WeightListScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet, refreshPets } = usePet();
  const [storedItems, setItems] = useState<WeightRecord[]>([]);
  const [storedSummary, setSummary] = useState<WeightSummary>(EMPTY_WEIGHT_SUMMARY);
  const [period, setPeriod] = useState<WeightPeriod>(route.params?.focusRecordId ? 'all' : 7);
  const [historyExpanded, setHistoryExpanded] = useState(Boolean(route.params?.focusRecordId));
  const ownerKey = `${session?.userId ?? ''}:${selectedPet?.id ?? ''}`;
  const requestedOwner = useRef('');
  const [loadedOwner, setLoadedOwner] = useState('');
  const summary = loadedOwner === ownerKey ? storedSummary : EMPTY_WEIGHT_SUMMARY;
  const items = useMemo(
    () => (loadedOwner === ownerKey ? storedItems : []),
    [loadedOwner, ownerKey, storedItems],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mutationLock = useRef(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++requestId.current;
      if (!selectedPet || !session?.userId) {
        setItems([]);
        setLoadedOwner(ownerKey);
        setSummary(EMPTY_WEIGHT_SUMMARY);
        hasLoadedRef.current = true;
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (requestedOwner.current !== ownerKey) {
        requestedOwner.current = ownerKey;
        setItems([]);
        setSummary(EMPTY_WEIGHT_SUMMARY);
        setLoadedOwner(ownerKey);
        setLoading(true);
        setError('');
      }
      try {
        setError('');
        const result = await service.getWeights(session.userId, selectedPet.id, signal);
        if (current !== requestId.current) return;
        setItems(result.records);
        setLoadedOwner(ownerKey);
        setSummary(result.summary);
      } catch (requestError) {
        if (current === requestId.current && !signal?.aborted)
          setError((requestError as Error).message || '無法載入體重紀錄');
      } finally {
        if (current === requestId.current) {
          hasLoadedRef.current = true;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [selectedPet, session?.userId, ownerKey],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      // Keep the list mounted when returning from edit so FlatList retains its scroll position.
      if (!hasLoadedRef.current) setLoading(true);
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  const filteredItems = useMemo(() => filterWeightsByPeriod(items, period), [items, period]);
  const visibleHistory = historyExpanded ? filteredItems : filteredItems.slice(0, 3);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const remove = (item: WeightRecord) =>
    Alert.alert('刪除體重紀錄', `確定刪除 ${item.weightKg} kg？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          if (!session?.userId || deletingId || mutationLock.current) return;
          mutationLock.current = true;
          setDeletingId(item.id);
          try {
            await service.deleteWeight(session.userId, item.id);
            await Promise.all([load(), refreshPets()]);
          } catch (requestError) {
            Alert.alert('刪除失敗', (requestError as Error).message);
          } finally {
            mutationLock.current = false;
            setDeletingId(null);
          }
        },
      },
    ]);

  if (loading || loadedOwner !== ownerKey)
    return (
      <ScreenPageState title="體重紀錄" description="查看體重變化與歷史" icon="scale-outline">
        <ScreenState loading text="正在載入體重紀錄…" />
      </ScreenPageState>
    );

  if (error) {
    return (
      <ScreenPageState title="體重紀錄" description="查看體重變化與歷史" icon="scale-outline">
        <View style={styles.center}>
          <Text style={styles.stateTitle}>載入失敗</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load()}>
            <Text style={styles.retryText}>重試</Text>
          </TouchableOpacity>
        </View>
      </ScreenPageState>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList
        data={visibleHistory}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <ScreenPageHeader
              style={styles.listContext}
              title="體重紀錄"
              description="查看體重變化與歷史"
              icon="scale-outline"
            />
            <WeightSummaryCard summary={summary} />
            <Text style={styles.heading}>查看期間</Text>
            <View style={styles.filters}>
              {WEIGHT_PERIODS.map((option) => (
                <FilterChip
                  key={String(option.value)}
                  label={option.label}
                  selected={period === option.value}
                  onPress={() => setPeriod(option.value)}
                />
              ))}
            </View>
            <Text style={styles.heading}>體重趨勢</Text>
            <WeightLineChart items={filteredItems} />
            <Text style={styles.heading}>歷史紀錄（{filteredItems.length} 筆）</Text>
            {filteredItems.length > 3 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ expanded: historyExpanded }}
                accessibilityLabel={
                  historyExpanded
                    ? '收合體重歷史紀錄至 3 筆'
                    : `查看全部 ${filteredItems.length} 筆體重紀錄`
                }
                onPress={() => setHistoryExpanded((expanded) => !expanded)}
                style={styles.historyToggle}
              >
                <Text style={styles.historyToggleText}>
                  {historyExpanded ? '收合至 3 筆' : `查看全部 ${filteredItems.length} 筆`}
                </Text>
                <Ionicons
                  name={historyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={17}
                  color={Colors.primaryDecoration}
                />
              </TouchableOpacity>
            ) : null}
            {route.params?.focusRecordId &&
              !items.some((item) => item.id === route.params?.focusRecordId) && (
                <Text style={styles.sourceMissing}>來源體重紀錄可能已刪除或不屬於目前毛孩。</Text>
              )}
            {!items.length ? (
              <RecordEmptyState
                title="尚未記錄體重"
                hint="偶爾記一次，就能慢慢看見變化。"
                artwork={
                  <Ionicons name="scale-outline" size={34} color={Colors.primaryDecoration} />
                }
              />
            ) : !filteredItems.length ? (
              <Text style={styles.empty}>此期間沒有體重紀錄</Text>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, route.params?.focusRecordId === item.id && styles.focusCard]}>
            <View style={styles.recordContent}>
              <Text style={styles.weight}>{item.weightKg} kg</Text>
              <Text style={styles.date}>{formatWeightDate(item.measuredAt)}</Text>
              <Text style={styles.notes}>{item.notes?.trim() || '無補充備註'}</Text>
            </View>
            <View style={styles.actions}>
              <RecordActionButton
                kind="edit"
                label="編輯"
                accessibilityLabel={`編輯體重 ${item.weightKg} 公斤`}
                onPress={() => navigation.navigate('WeightForm', { record: item })}
                disabled={Boolean(deletingId)}
                style={styles.rowAction}
              />
              <RecordActionButton
                kind="delete"
                label={deletingId === item.id ? '刪除中…' : '刪除'}
                accessibilityLabel={`刪除體重 ${item.weightKg} 公斤`}
                onPress={() => remove(item)}
                disabled={Boolean(deletingId)}
                busy={deletingId === item.id}
                style={styles.rowAction}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
