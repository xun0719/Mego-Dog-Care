import { CardSurface } from '../constants/Layout';
import { taipeiWallDate } from '../utils/taipeiDate';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：以月曆瀏覽每日照護紀錄，並可進入各筆來源明細。 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors } from '../constants/Colors';
import { PageLayout } from '../constants/PageLayout';
import ScreenState from '../components/ScreenState';
import { openTimelineSource } from '../constants/Timeline';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import { getTimelineCalendar, getTimelineDay } from '../services/timelineService';
import { TimelineItem, TimelineType } from '../types';
import {
  getLocalDateKey,
  getMonthRange,
  getTimelineCategoriesForTypes,
  TimelineCategory,
} from '../features/timeline/timelineContent';
import TimelineCard from '../features/timeline/components/TimelineCard';
import TimelineHeader from '../features/timeline/components/TimelineHeader';
import { TimelineEmptyState } from '../features/timeline/components/TimelineStates';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';

type Props = NativeStackScreenProps<HomeStackParamList, 'TimelineOverview'>;

export default function TimelineScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [calendarDays, setCalendarDays] = useState<Array<{ date: string; types: TimelineType[] }>>(
    [],
  );
  const [month, setMonth] = useState(() => {
    const today = taipeiWallDate();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => taipeiWallDate());
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarError, setCalendarError] = useState('');
  const [detailsError, setDetailsError] = useState('');
  const calendarRequestId = useRef(0);
  const detailsRequestId = useRef(0);
  const loadedCalendarKey = useRef('');

  const loadCalendar = useCallback(
    async (showLoader = false, signal?: AbortSignal) => {
      const current = ++calendarRequestId.current;
      if (!selectedPet || !session?.userId) {
        setCalendarDays([]);
        setLoading(false);
        return;
      }
      const range = getMonthRange(month);
      const key = `${session.userId}:${selectedPet.id}:${range.startAt}`;
      try {
        setCalendarError('');
        if (showLoader || loadedCalendarKey.current !== key) setLoading(true);
        const summary = await getTimelineCalendar(session.userId, selectedPet.id, {
          ...range,
          signal,
        });
        if (current !== calendarRequestId.current) return;
        setCalendarDays(summary.days);
        loadedCalendarKey.current = key;
      } catch (requestError) {
        if (current !== calendarRequestId.current || signal?.aborted) return;
        setCalendarError((requestError as Error).message || '無法載入這個月的紀錄');
        setCalendarDays([]);
      } finally {
        if (current === calendarRequestId.current) setLoading(false);
      }
    },
    [month, selectedPet, session?.userId],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadCalendar(false, controller.signal);
      return () => {
        controller.abort();
        calendarRequestId.current += 1;
      };
    }, [loadCalendar]),
  );

  const loadSelectedDate = useCallback(
    async (signal?: AbortSignal) => {
      const current = ++detailsRequestId.current;
      if (!selectedPet || !session?.userId) {
        setItems([]);
        setDetailsLoading(false);
        return;
      }
      try {
        setDetailsError('');
        setDetailsLoading(true);
        setItems([]);
        const dayItems = await getTimelineDay(session.userId, selectedPet.id, selectedDate, signal);
        if (current !== detailsRequestId.current) return;
        setItems(dayItems);
      } catch (requestError) {
        if (current !== detailsRequestId.current || signal?.aborted) return;
        setDetailsError((requestError as Error).message || '無法載入當日紀錄');
        setItems([]);
      } finally {
        if (current === detailsRequestId.current) setDetailsLoading(false);
      }
    },
    [selectedDate, selectedPet, session?.userId],
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadSelectedDate(controller.signal);
      return () => {
        controller.abort();
        detailsRequestId.current += 1;
      };
    }, [loadSelectedDate]),
  );

  const markedDays = useMemo(() => {
    const categoriesByDay: Record<string, TimelineCategory[]> = {};
    calendarDays.forEach(({ date, types }) => {
      categoriesByDay[date] = getTimelineCategoriesForTypes(types);
    });
    return categoriesByDay;
  }, [calendarDays]);

  const selectMonth = (nextMonth: Date) => {
    const monthStart = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    if (monthStart.getTime() !== month.getTime()) {
      setItems([]);
      setCalendarDays([]);
      setLoading(true);
    }
    setItems([]);
    setDetailsLoading(true);
    setMonth(monthStart);
    setSelectedDate((currentDate) => {
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
      return new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        Math.min(currentDate.getDate(), lastDay),
      );
    });
  };
  const selectDate = (date: Date) => {
    if (date.getFullYear() !== month.getFullYear() || date.getMonth() !== month.getMonth()) {
      setItems([]);
      setCalendarDays([]);
      setLoading(true);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setItems([]);
    setDetailsLoading(true);
    setDetailsError('');
    setSelectedDate(date);
  };
  const goToday = () => {
    const today = taipeiWallDate();
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (todayMonth.getTime() !== month.getTime()) {
      setItems([]);
      setCalendarDays([]);
      setLoading(true);
    }
    setItems([]);
    setDetailsLoading(true);
    setDetailsError('');
    setMonth(todayMonth);
    setSelectedDate(today);
  };
  const refresh = () => {
    setRefreshing(true);
    Promise.all([loadCalendar(), loadSelectedDate()]).finally(() => setRefreshing(false));
  };

  const error = calendarError || detailsError;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <FlatList
        data={detailsError || loading ? [] : items}
        keyExtractor={(item) => item.id}
        removeClippedSubviews
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <>
            <TimelineHeader
              petName={selectedPet?.name}
              avatarAttachmentId={selectedPet?.avatarAttachmentId}
              userId={selectedPet?.userId}
              month={month}
              selectedDate={selectedDate}
              markedDays={markedDays}
              itemCount={items.length}
              onSelectDate={selectDate}
              onSelectMonth={selectMonth}
              onGoToday={goToday}
              onOpenPhotos={() => navigation.navigate('PhotosOverview')}
            />
            {loading && <ScreenState loading text="正在更新照護紀錄…" />}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.error}>{error}</Text>
                <TouchableOpacity
                  style={styles.retry}
                  onPress={() => {
                    void loadCalendar(true);
                    void loadSelectedDate();
                  }}
                >
                  <Text style={styles.retryText}>重新載入</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !detailsError ? (
            detailsLoading ? (
              <Text style={styles.loadingDetails}>正在載入當日紀錄…</Text>
            ) : (
              <TimelineEmptyState
                onCreate={
                  selectedPet && !selectedPet.memorial
                    ? () =>
                        navigation.navigate('DailyLog', {
                          recordDate: getLocalDateKey(selectedDate),
                        })
                    : undefined
                }
              />
            )
          ) : null
        }
        renderItem={({ item }) => (
          <TimelineCard
            item={item}
            onPress={() => openTimelineSource(navigation, item, getLocalDateKey(selectedDate))}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    paddingHorizontal: PageLayout.mainHorizontal,
    paddingTop: PageLayout.top,
    flexGrow: 1,
  },
  errorBox: { ...CardSurface.hint, alignItems: 'center' },
  error: { color: Colors.danger, textAlign: 'center' },
  loadingDetails: { color: Colors.subtext, textAlign: 'center', paddingVertical: 20 },
  retry: {
    marginTop: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
  },
  retryText: { color: Colors.primary, fontWeight: '800' },
});
