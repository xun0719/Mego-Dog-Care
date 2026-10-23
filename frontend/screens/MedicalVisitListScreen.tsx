import Animated from 'react-native-reanimated';
import {
  RecordListItem,
  RecordListScope,
  useRecordListMotion,
} from '../components/RecordListMotion';
import { CardSurface } from '../constants/Layout';
import { TAIPEI_TIME_ZONE } from '../utils/taipeiDate';
import { ScreenPageHeader, ScreenPageState } from '../components/ScreenPageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：顯示目前毛孩依日期排序的就醫紀錄列表與完整畫面狀態。 */
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../components/AppButton';
import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import ScreenState from '../components/ScreenState';
import { ThemedRecordEmptyState } from '../components/RecordEmptyState';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import * as service from '../services/medicalVisitService';
import { MedicalVisit } from '../types';
import { Type } from '../constants/Typography';
import { MemorialReadOnlyNotice } from '../components/MemorialReadOnlyNotice';
type Props = NativeStackScreenProps<HomeStackParamList, 'MedicalVisitList'>;
export default function MedicalVisitListScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const listMotion = useRecordListMotion(`${session?.userId ?? ''}:${selectedPet?.id ?? ''}`);
  const [items, setItems] = useState<MedicalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++requestId.current;
      setItems([]);
      if (!selectedPet || !session?.userId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        setError('');
        const result = await service.getMedicalVisits(session.userId, selectedPet.id, signal);
        if (current === requestId.current) setItems(result);
      } catch (e) {
        if (current === requestId.current) setError((e as Error).message || '無法載入就醫紀錄');
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [selectedPet, session?.userId],
  );
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setLoading(true);
      void load(controller.signal);
      return () => {
        controller.abort();
        requestId.current += 1;
      };
    }, [load]),
  );
  if (loading)
    return (
      <ScreenPageState title="就醫紀錄" description="回顧每次看診重點" icon="business-outline">
        <ScreenState loading text="正在載入就醫紀錄…" />
      </ScreenPageState>
    );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.container}>
      <RecordListScope motion={listMotion}>
        <Animated.FlatList
          itemLayoutAnimation={listMotion.layout}
          data={error ? [] : items}
          keyExtractor={(item) => item.id}
          removeClippedSubviews
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          contentContainerStyle={[s.content, { paddingBottom: bottomContentPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListHeaderComponent={
            <>
              <ScreenPageHeader
                style={s.listHeader}
                title="就醫紀錄"
                description="回顧每次看診重點"
                icon="business-outline"
              />
              {selectedPet?.memorial ? (
                <MemorialReadOnlyNotice petName={selectedPet.name} />
              ) : (
                <AppButton
                  variant="primary"
                  style={s.primary}
                  onPress={() => navigation.navigate('MedicalVisitForm', {})}
                  accessibilityLabel="新增就醫紀錄"
                >
                  <Ionicons name="add" size={20} color={Colors.onPrimary} />
                  <Text style={s.primaryText}>新增就醫紀錄</Text>
                </AppButton>
              )}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="尋找附近動物醫院"
                style={s.mapLink}
                onPress={() => navigation.navigate('VetMap')}
              >
                <Ionicons name="map-outline" size={19} color={Colors.successDecoration} />
                <Text style={s.mapLinkText}>尋找附近動物醫院</Text>
                <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
              </TouchableOpacity>
              {!!error && <Center text={error} action={load} />}
            </>
          }
          ListEmptyComponent={
            !error ? (
              <ThemedRecordEmptyState
                title="目前沒有就醫紀錄"
                hint="下次看診後，再把重要內容留在這裡。"
              />
            ) : null
          }
          renderItem={({ item, index }) => (
            <RecordListItem motion={listMotion} id={item.id} index={index}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`查看就醫紀錄：${item.clinicName || '未填寫醫院'}`}
                style={s.card}
                onPress={() => navigation.navigate('MedicalVisitDetail', { visitId: item.id })}
              >
                <View style={s.cardTitleRow}>
                  <View style={s.cardIcon}>
                    <Ionicons name="business-outline" size={18} color={Colors.successDecoration} />
                  </View>
                  <View style={s.cardTitleBody}>
                    <Text style={s.clinic}>{item.clinicName || '未填寫醫院'}</Text>
                    <Text style={s.date}>
                      {new Date(item.visitedAt).toLocaleDateString('zh-TW', {
                        timeZone: TAIPEI_TIME_ZONE,
                      })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={Colors.subtext} />
                </View>
                <Text style={s.reason}>看診原因：{item.reason}</Text>
                <Text style={s.meta}>
                  附件 {item.attachments?.length || 0} 份 藥物 {item.medications?.length || 0} 筆
                </Text>
                <Text style={s.meta}>
                  下次回診：
                  {item.followUpAt
                    ? new Date(item.followUpAt).toLocaleDateString('zh-TW', {
                        timeZone: TAIPEI_TIME_ZONE,
                      })
                    : '未安排'}
                </Text>
              </TouchableOpacity>
            </RecordListItem>
          )}
        />
      </RecordListScope>
    </SafeAreaView>
  );
}
function Center({
  text,
  loading,
  action,
}: {
  text: string;
  loading?: boolean;
  action?: () => void;
}) {
  return (
    <View style={s.center}>
      {loading && <ActivityIndicator color={Colors.primary} />}
      <Text style={s.empty}>{text}</Text>
      {action && (
        <TouchableOpacity style={s.retry} onPress={action}>
          <Text style={s.retryText}>重新載入</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 50 },
  listHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  listHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listHeaderBody: { flex: 1 },
  title: { color: Colors.text, fontSize: Type.title1, fontWeight: '800' },
  listSubtitle: { color: Colors.subtext, fontSize: Type.footnote, marginTop: 3 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 24,
  },
  primary: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 14,
    minHeight: 52,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryText: { color: Colors.onPrimary, fontWeight: '800' },
  mapLink: {
    minHeight: 52,
    marginBottom: 18,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mapLinkText: { color: Colors.text, fontSize: Type.body, fontWeight: '700', flex: 1 },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  empty: { color: Colors.subtext, textAlign: 'center', padding: 18 },
  retry: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryText: { color: Colors.text, fontWeight: '700' },
  card: {
    ...CardSurface.record,

    marginBottom: 11,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  cardTitleBody: { flex: 1 },
  date: { color: Colors.subtext, fontSize: Type.caption },
  clinic: { color: Colors.text, fontSize: Type.headline, fontWeight: '800', marginTop: 4 },
  reason: { color: Colors.text, marginTop: 8, lineHeight: 21 },
  copy: { color: Colors.primary, fontWeight: '800', marginTop: 8 },
  meta: { color: Colors.subtext, fontSize: Type.caption, marginTop: 8 },
});
