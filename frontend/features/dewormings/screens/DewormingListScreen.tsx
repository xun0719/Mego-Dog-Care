import Animated from 'react-native-reanimated';
import {
  RecordListItem,
  RecordListScope,
  useRecordListMotion,
} from '../../../components/RecordListMotion';
import { TAIPEI_TIME_ZONE } from '../../../utils/taipeiDate';
import {
  ScreenPageHeader,
  ScreenPageFrame,
  ScreenPageState,
} from '../../../components/ScreenPageHeader';
/** 用途：顯示毛孩的驅蟲紀錄列表。 */
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
import { getDewormings } from '../../../services/dewormingService';
import type { Deworming } from '../../../types';
import { dewormingStyles as styles } from '../dewormingStyles';
import { dewormingTypeLabels } from '../types';
import { MemorialReadOnlyNotice } from '../../../components/MemorialReadOnlyNotice';

export function DewormingListScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [storedRecords, setRecords] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const ownerKey = `${session?.userId ?? ''}:${selectedPet?.id ?? ''}`;
  const listMotion = useRecordListMotion(ownerKey);
  const [dataOwner, setDataOwner] = useState('');
  const records = dataOwner === ownerKey ? storedRecords : [];
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
        setRecords([]);
        cacheOwner.current = ownerKey;
      }
      setDataOwner(ownerKey);
      setError('');
      setLoading(true);
      try {
        const result = await getDewormings(session.userId, selectedPet.id, signal);
        if (current === requestId.current) {
          setRecords(result.records);
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
  if (loading && !records.length)
    return (
      <ScreenPageState
        title="驅蟲紀錄"
        description="查看使用與下次日期"
        icon="shield-checkmark-outline"
      >
        <ScreenState loading text="載入中…" />
      </ScreenPageState>
    );
  return (
    <ScreenPageFrame>
      <RecordListScope motion={listMotion}>
        <Animated.FlatList
          itemLayoutAnimation={listMotion.layout}
          data={records}
          keyExtractor={(record) => record.id}
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
                title="驅蟲紀錄"
                description="查看使用與下次日期"
                icon="shield-checkmark-outline"
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
                  onPress={() => navigation.navigate('DewormingForm')}
                  accessibilityLabel="新增驅蟲紀錄"
                >
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  <Text style={styles.primaryText}>新增驅蟲紀錄</Text>
                </AppButton>
              )}
              {!error && !records.length ? (
                <ThemedRecordEmptyState
                  title="目前沒有驅蟲紀錄"
                  hint="記下每次預防，照護就不容易忘記。"
                />
              ) : null}
            </>
          }
          renderItem={({ item: record, index }) => (
            <RecordListItem motion={listMotion} id={record.id} index={index}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`查看驅蟲紀錄：${record.productName || '未填寫'}`}
                style={styles.card}
                onPress={() => navigation.navigate('DewormingDetail', { recordId: record.id })}
              >
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={Colors.successDecoration}
                    />
                  </View>
                  <Text style={styles.name}>{dewormingTypeLabels[record.type]}</Text>
                  <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
                </View>
                <Text style={styles.cardText}>{record.productName}</Text>
                <Text style={styles.cardText}>
                  使用日期：
                  {new Date(record.administeredAt).toLocaleDateString('zh-TW', {
                    timeZone: TAIPEI_TIME_ZONE,
                  })}
                </Text>
                {record.nextDueAt ? (
                  <Text style={styles.cardMeta}>
                    下次：
                    {new Date(record.nextDueAt).toLocaleDateString('zh-TW', {
                      timeZone: TAIPEI_TIME_ZONE,
                    })}
                  </Text>
                ) : null}
                <Text style={styles.cardHint}>
                  {record.reminderId ? '已建立提醒' : '尚未建立提醒'}
                </Text>
              </TouchableOpacity>
            </RecordListItem>
          )}
        />
      </RecordListScope>
    </ScreenPageFrame>
  );
}
