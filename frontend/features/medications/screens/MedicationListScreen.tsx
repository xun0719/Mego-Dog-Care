import Animated from 'react-native-reanimated';
import {
  RecordListItem,
  RecordListScope,
  useRecordListMotion,
} from '../../../components/RecordListMotion';
import {
  ScreenPageHeader,
  ScreenPageFrame,
  ScreenPageState,
} from '../../../components/ScreenPageHeader';
/**
 * 用途：顯示目前與歷史用藥療程。
 * 資料：../../../services/medicationService.ts
 * 表單：MedicationFormScreen.tsx
 */
import React, { useCallback, useRef, useState } from 'react';
import { RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import { Colors } from '../../../constants/Colors';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import ScreenState from '../../../components/ScreenState';
import { ThemedRecordEmptyState } from '../../../components/RecordEmptyState';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import type { HomeStackParamList } from '../../../navigation/types';
import { getMedications } from '../../../services/medicationService';
import type { MedicationCourse } from '../../../types';
import { medicationStyles as styles } from '../medicationStyles';
import { mealTimingLabels } from '../types';
import { MemorialReadOnlyNotice } from '../../../components/MemorialReadOnlyNotice';

type ListEntry =
  | { kind: 'section'; id: string; title: string }
  | { kind: 'item'; id: string; item: MedicationCourse };

export function MedicationListScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [storedRecords, setData] = useState<MedicationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const ownerKey = `${session?.userId ?? ''}:${selectedPet?.id ?? ''}`;
  const listMotion = useRecordListMotion(ownerKey);
  const [dataOwner, setDataOwner] = useState('');
  const data = dataOwner === ownerKey ? storedRecords : [];
  const cacheOwner = useRef('');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++requestId.current;
      if (!session?.userId || !selectedPet) {
        setLoading(false);
        setRefreshing(false);
        setError('請先登入並選擇毛孩');
        return;
      }
      if (cacheOwner.current !== ownerKey) {
        setData([]);
        cacheOwner.current = ownerKey;
      }
      setDataOwner(ownerKey);
      setError('');
      setLoading(true);
      try {
        const result = await getMedications(session.userId, selectedPet.id, undefined, signal);
        if (current === requestId.current) {
          setData(result.records);
          setError('');
        }
      } catch (caught) {
        if (current === requestId.current && !signal?.aborted) setError((caught as Error).message);
      } finally {
        if (current === requestId.current) {
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
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );

  if (loading && !data.length)
    return (
      <ScreenPageState title="用藥紀錄" description="查看療程與用藥提醒" icon="medical-outline">
        <ScreenState loading text="載入中…" />
      </ScreenPageState>
    );

  const active = data.filter((item) => item.status === 'active');
  const history = data.filter((item) => item.status !== 'active');
  const listData: ListEntry[] = [
    ...(active.length
      ? [
          { kind: 'section' as const, id: 'active-section', title: '目前用藥' },
          ...active.map((item) => ({ kind: 'item' as const, id: `active-${item.id}`, item })),
        ]
      : []),
    ...(history.length
      ? [
          { kind: 'section' as const, id: 'history-section', title: '歷史用藥' },
          ...history.map((item) => ({ kind: 'item' as const, id: `history-${item.id}`, item })),
        ]
      : []),
  ];

  return (
    <ScreenPageFrame>
      <RecordListScope motion={listMotion}>
        <Animated.FlatList
          itemLayoutAnimation={listMotion.layout}
          data={listData}
          keyExtractor={(entry) => entry.id}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          ListHeaderComponent={
            <>
              <ScreenPageHeader
                style={styles.listHeader}
                title="用藥紀錄"
                description="查看療程與用藥提醒"
                icon="medical-outline"
              />
              {error ? (
                <TouchableOpacity onPress={() => void load()}>
                  <Text style={styles.error}>{error}（重試）</Text>
                </TouchableOpacity>
              ) : null}
              {selectedPet?.memorial ? (
                <MemorialReadOnlyNotice petName={selectedPet.name} />
              ) : (
                <AppButton
                  variant="primary"
                  style={styles.primary}
                  onPress={() => navigation.navigate('MedicationForm')}
                  accessibilityLabel="新增用藥療程"
                >
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  <Text style={styles.primaryText}>新增用藥療程</Text>
                </AppButton>
              )}
              {!error && !data.length ? (
                <ThemedRecordEmptyState
                  title="目前沒有用藥紀錄"
                  hint="需要時再新增，讓 MEGO 幫你整理療程。"
                />
              ) : null}
            </>
          }
          renderItem={({ item: entry, index }) => {
            if (entry.kind === 'section') return <Text style={styles.section}>{entry.title}</Text>;
            const medication = entry.item;
            return (
              <RecordListItem motion={listMotion} id={entry.id} index={index}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`查看用藥：${medication.name}`}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('MedicationDetail', { recordId: medication.id })
                  }
                >
                  <View style={styles.cardTitleRow}>
                    <View style={styles.cardIcon}>
                      <Ionicons name="medical-outline" size={18} color={Colors.successDecoration} />
                    </View>
                    <Text style={styles.name}>{medication.name}</Text>
                    <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
                  </View>
                  <Text style={styles.cardText}>
                    {medication.startDate}
                    {medication.endDate ? ` ～ ${medication.endDate}` : ''}
                  </Text>
                  <Text style={styles.cardText}>
                    每日 {medication.timesPerDay} 次 · {mealTimingLabels[medication.mealTiming]}
                  </Text>
                  <Text style={styles.cardHint}>
                    {medication.reminderEnabled ? '已設定提醒' : '尚未設定提醒'}
                  </Text>
                </TouchableOpacity>
              </RecordListItem>
            );
          }}
        />
      </RecordListScope>
    </ScreenPageFrame>
  );
}
