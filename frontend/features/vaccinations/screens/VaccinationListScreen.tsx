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
/** 用途：顯示毛孩疫苗紀錄列表。 */
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
import { getVaccinations } from '../../../services/vaccinationService';
import type { Vaccination } from '../../../types';
import { vaccinationStyles as styles } from '../vaccinationStyles';
import { MemorialReadOnlyNotice } from '../../../components/MemorialReadOnlyNotice';

export function VaccinationListScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const [storedRecords, setRecords] = useState<Vaccination[]>([]);
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
        const result = await getVaccinations(session.userId, selectedPet.id, signal);
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
      <ScreenPageState title="疫苗紀錄" description="查看接種與下次日期" icon="medkit-outline">
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
                title="疫苗紀錄"
                description="查看接種與下次日期"
                icon="medkit-outline"
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
                  onPress={() => navigation.navigate('VaccinationForm')}
                  accessibilityLabel="新增疫苗紀錄"
                >
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  <Text style={styles.primaryText}>新增疫苗紀錄</Text>
                </AppButton>
              )}
              {!error && !records.length ? (
                <ThemedRecordEmptyState
                  title="目前沒有疫苗紀錄"
                  hint="完成接種後，在這裡留下日期與下次提醒。"
                />
              ) : null}
            </>
          }
          renderItem={({ item: record, index }) => (
            <RecordListItem motion={listMotion} id={record.id} index={index}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`查看疫苗紀錄：${record.vaccineName || '未填寫'}`}
                style={styles.card}
                onPress={() => navigation.navigate('VaccinationDetail', { recordId: record.id })}
              >
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="medkit-outline" size={18} color={Colors.successDecoration} />
                  </View>
                  <Text style={styles.name}>{record.vaccineName}</Text>
                  <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
                </View>
                <Text style={styles.cardText}>
                  接種日期：
                  {new Date(record.administeredAt).toLocaleDateString('zh-TW', {
                    timeZone: TAIPEI_TIME_ZONE,
                  })}
                </Text>
                <Text style={styles.cardText}>醫院：{record.hospitalName || '未填寫醫院'}</Text>
                {record.nextDueAt ? (
                  <Text style={styles.cardMeta}>
                    下次接種：
                    {new Date(record.nextDueAt).toLocaleDateString('zh-TW', {
                      timeZone: TAIPEI_TIME_ZONE,
                    })}
                  </Text>
                ) : null}
              </TouchableOpacity>
            </RecordListItem>
          )}
        />
      </RecordListScope>
    </ScreenPageFrame>
  );
}
