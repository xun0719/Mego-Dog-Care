import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';
import {
  buildCalendarDays,
  getLocalDateKey,
  TIMELINE_CATEGORIES,
  TimelineCategory,
} from '../timelineContent';
import MonthPicker from '../../../components/MonthPicker';
import { Type } from '../../../constants/Typography';
import { taipeiDateKey } from '../../../utils/taipeiDate';

type Props = {
  petName?: string;
  avatarAttachmentId?: string;
  userId?: string;
  month: Date;
  selectedDate: Date;
  markedDays: Record<string, TimelineCategory[]>;
  itemCount: number;
  onSelectDate: (date: Date) => void;
  onSelectMonth: (date: Date) => void;
  onGoToday: () => void;
  onOpenPhotos?: () => void;
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function TimelineHeader({
  petName,
  avatarAttachmentId,
  userId,
  month,
  selectedDate,
  markedDays,
  itemCount,
  onSelectDate,
  onSelectMonth,
  onGoToday,
  onOpenPhotos,
}: Props) {
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const todayKey = taipeiDateKey();
  const selectedKey = getLocalDateKey(selectedDate);
  const selectedHeading = `${selectedDate.getMonth() + 1} 月 ${selectedDate.getDate()} 日，${selectedDate.toLocaleDateString('zh-TW', { weekday: 'long' })}`;
  const isToday = selectedKey === todayKey;

  const changeMonth = (amount: number) =>
    onSelectMonth(new Date(month.getFullYear(), month.getMonth() + amount, 1));

  return (
    <View>
      <View style={styles.petHeader}>
        <View style={styles.petHeaderRow}>
          {avatarAttachmentId && userId ? (
            <AuthenticatedPetAvatar
              attachmentId={avatarAttachmentId}
              userId={userId}
              style={styles.petAvatar}
              fallback={
                <View style={styles.petAvatarFallback}>
                  <Ionicons name="paw-outline" size={21} color={Colors.primaryDecoration} />
                </View>
              }
            />
          ) : (
            <View style={styles.petAvatarFallback}>
              <Ionicons name="paw-outline" size={21} color={Colors.primaryDecoration} />
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>照護紀錄</Text>
            <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
              {petName ? `${petName} 的生活足跡` : '生活足跡'}
            </Text>
          </View>
        </View>
        {onOpenPhotos ? (
          <View style={styles.photosRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="開啟照護相簿"
              style={styles.photosButton}
              onPress={onOpenPhotos}
            >
              <Ionicons name="images-outline" size={18} color={Colors.primaryDecoration} />
              <Text style={styles.photosButtonText}>相簿</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthBar}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="上一個月"
            style={styles.arrowButton}
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="選擇年份與月份"
            style={styles.monthTitleButton}
            onPress={() => setMonthPickerOpen(true)}
          >
            <Text style={styles.monthTitle}>
              {month.getFullYear()} 年 {month.getMonth() + 1} 月
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.subtext} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="下一個月"
            style={styles.arrowButton}
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((weekday) => (
            <Text key={weekday} style={styles.weekday}>
              {weekday}
            </Text>
          ))}
        </View>
        <View style={styles.daysGrid}>
          {days.map((date) => {
            const key = getLocalDateKey(date);
            const categories = markedDays[key] || [];
            const selected = key === selectedKey;
            const currentMonth = date.getMonth() === month.getMonth();
            const marks = categories.slice(0, 4);
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${date.getMonth() + 1} 月 ${date.getDate()} 日${categories.length ? `，${categories.length} 類紀錄` : ''}`}
                accessibilityState={{ selected }}
                style={styles.dayCell}
                onPress={() => onSelectDate(date)}
              >
                <View
                  style={[
                    styles.dayNumberWrap,
                    selected && styles.dayNumberSelected,
                    key === todayKey && !selected && styles.dayNumberToday,
                    !currentMonth && styles.dayOutsideMonth,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      !currentMonth && styles.dayNumberMuted,
                      selected && styles.dayNumberSelectedText,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                </View>
                <View style={styles.markerRow}>
                  {marks.map((category) => (
                    <View
                      key={category}
                      style={[
                        styles.marker,
                        {
                          backgroundColor:
                            TIMELINE_CATEGORIES.find((item) => item.key === category)?.color ??
                            Colors.shadow,
                        },
                      ]}
                    />
                  ))}
                  {categories.length > marks.length ? (
                    <Text style={styles.moreMarker}>+</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.legend}>
          {TIMELINE_CATEGORIES.map((category) => (
            <View key={category.key} style={styles.legendItem}>
              <View style={[styles.legendMark, { backgroundColor: category.color }]} />
              <Text style={styles.legendText}>{category.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.selectedDayRow}>
        <View style={styles.flex}>
          <Text style={styles.selectedDate}>{selectedHeading}</Text>
          <Text style={styles.selectedCount}>
            {itemCount ? `${itemCount} 筆紀錄與提醒` : '查看這一天的照護紀錄'}
          </Text>
        </View>
        {!isToday ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.todayButton}
            onPress={onGoToday}
          >
            <Text style={styles.todayButtonText}>回到今天</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.todayTag}>
            <Text style={styles.todayTagText}>今天</Text>
          </View>
        )}
      </View>

      <MonthPicker
        visible={monthPickerOpen}
        month={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`}
        onChange={(value) => {
          const [year, selectedMonth] = value.split('-').map(Number);
          onSelectMonth(new Date(year, selectedMonth - 1, 1));
        }}
        onClose={() => setMonthPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  petHeader: { marginBottom: 16 },
  petHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  photosRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  photosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  photosButtonText: {
    flexShrink: 1,
    color: Colors.primary,
    fontSize: Type.subhead,
    fontWeight: '800',
  },
  petAvatar: { flexShrink: 0, width: 48, height: 48, borderRadius: 16, marginRight: 12 },
  petAvatarFallback: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primarySoft,
  },
  eyebrow: { color: Colors.primary, fontSize: Type.caption, fontWeight: '800', letterSpacing: 0.8 },
  title: { color: Colors.text, fontSize: Type.title2, fontWeight: '800', marginTop: 2 },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  monthBar: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  monthTitleButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
  },
  monthTitle: { color: Colors.text, fontSize: Type.headline, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginTop: 6, marginBottom: 2 },
  weekday: {
    width: `${100 / 7}%`,
    color: Colors.subtext,
    textAlign: 'center',
    fontSize: Type.caption,
    fontWeight: '700',
  },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  dayNumberWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberSelected: { backgroundColor: Colors.primary },
  dayNumberToday: { borderWidth: 1.5, borderColor: Colors.primary },
  dayOutsideMonth: { opacity: 0.48 },
  dayNumber: { color: Colors.text, fontSize: Type.subhead, fontWeight: '600' },
  dayNumberMuted: { color: Colors.subtext },
  dayNumberSelectedText: { color: Colors.onPrimary, fontWeight: '800' },
  markerRow: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 1,
  },
  marker: { width: 4, height: 4, borderRadius: 2 },
  moreMarker: { color: Colors.subtext, fontSize: Type.caption2, lineHeight: 14 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 13,
    rowGap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 7,
    paddingTop: 11,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendMark: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { color: Colors.subtext, fontSize: Type.caption2 },
  selectedDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 11,
    paddingHorizontal: 2,
  },
  selectedDate: { color: Colors.text, fontSize: Type.headline, fontWeight: '800' },
  selectedCount: { color: Colors.subtext, fontSize: Type.caption, marginTop: 3 },
  todayButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
  },
  todayButtonText: { color: Colors.primary, fontWeight: '800', fontSize: Type.footnote },
  todayTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.successSoft,
  },
  todayTagText: { color: Colors.success, fontSize: Type.caption, fontWeight: '800' },
});
