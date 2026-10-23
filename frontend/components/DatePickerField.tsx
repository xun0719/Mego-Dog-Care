import { datePickerStyles as styles } from './date-picker/datePickerStyles';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { adjustTimePart, clampDate, dateInRange } from '../utils/datePicker';
import { fromTaipeiPickerValue, taipeiPickerValue } from '../utils/taipeiDate';

interface Props {
  value?: Date;
  mode?: 'date' | 'datetime' | 'time';
  label: string;
  placeholder?: string;
  hint?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  onChange: (date: Date) => void;
  onClear?: () => void;
}

const today = () => {
  const date = taipeiPickerValue();
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

function CalendarModal({
  open,
  value,
  minimumDate,
  maximumDate,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  value: Date;
  minimumDate?: Date;
  maximumDate?: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}) {
  const [month, setMonth] = useState(
    new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)),
  );
  // 超出範圍的訊息顯示在對話框內；再疊一層系統 Alert 會蓋住剛才選的日期。
  const [rangeError, setRangeError] = useState('');
  const [selected, setSelected] = useState(value);
  const [yearPicker, setYearPicker] = useState(false);
  const [yearStart, setYearStart] = useState(Math.floor(value.getUTCFullYear() / 12) * 12);
  useEffect(() => {
    if (open) {
      setSelected(clampDate(value, minimumDate, maximumDate, true));
      setMonth(new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1)));
      setYearPicker(false);
      setYearStart(Math.floor(value.getUTCFullYear() / 12) * 12);
    }
  }, [open, value, minimumDate, maximumDate]);
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1)).getUTCDay();
  const days = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const cells = Array.from({ length: first + days }, (_, i) => (i < first ? null : i - first + 1));
  const selectable = (day: number) => {
    const date = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 12));
    return dateInRange(date, minimumDate, maximumDate, true);
  };
  const years = Array.from({ length: 12 }, (_, index) => yearStart + index);
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={styles.calendarModal}
          contentContainerStyle={styles.modalContent}
          bounces={false}
        >
          <View style={styles.monthRow}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={yearPicker ? '上一組年份' : '上一個月'}
              onPress={() =>
                yearPicker
                  ? setYearStart((value) => value - 12)
                  : setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))
              }
            >
              <Text style={styles.monthArrow}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="選擇年份"
              onPress={() => {
                setYearPicker((value) => !value);
                setYearStart(Math.floor(month.getUTCFullYear() / 12) * 12);
              }}
            >
              <Text style={styles.monthTitle}>
                {yearPicker
                  ? `${yearStart}–${yearStart + 11}`
                  : `${month.getUTCFullYear()} 年 ${month.getUTCMonth() + 1} 月`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={yearPicker ? '下一組年份' : '下一個月'}
              onPress={() =>
                yearPicker
                  ? setYearStart((value) => value + 12)
                  : setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))
              }
            >
              <Text style={styles.monthArrow}>›</Text>
            </TouchableOpacity>
          </View>
          {yearPicker ? (
            <View style={styles.yearGrid}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  accessibilityRole="button"
                  accessibilityLabel={`選擇年份 ${year}`}
                  style={styles.yearCell}
                  onPress={() => {
                    setMonth(new Date(Date.UTC(year, month.getUTCMonth(), 1)));
                    setYearPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.yearText,
                      year === month.getUTCFullYear() && styles.selectedYear,
                    ]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.weekRow}>
                {['日', '一', '二', '三', '四', '五', '六'].map((x) => (
                  <Text key={x} style={styles.week}>
                    {x}
                  </Text>
                ))}
              </View>
              <View style={styles.dayGrid}>
                {cells.map((day, i) =>
                  day == null ? (
                    <View key={i} style={styles.dayCell} />
                  ) : (
                    <TouchableOpacity
                      key={i}
                      accessibilityRole="button"
                      accessibilityLabel={`${month.getUTCFullYear()} 年 ${month.getUTCMonth() + 1} 月 ${day} 日`}
                      accessibilityState={{
                        disabled: !selectable(day),
                        selected:
                          selected.getUTCFullYear() === month.getUTCFullYear() &&
                          selected.getUTCMonth() === month.getUTCMonth() &&
                          selected.getUTCDate() === day,
                      }}
                      disabled={!selectable(day)}
                      style={styles.dayCell}
                      onPress={() =>
                        setSelected(
                          new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), day, 12)),
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.dayText,
                          selected.getUTCFullYear() === month.getUTCFullYear() &&
                            selected.getUTCMonth() === month.getUTCMonth() &&
                            selected.getUTCDate() === day &&
                            styles.selectedDay,
                          !selectable(day) && styles.disabledDay,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </>
          )}
          {rangeError ? (
            <Text accessibilityRole="alert" style={styles.rangeError}>
              {rangeError}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="確認日期"
              style={styles.done}
              onPress={() => {
                if (!dateInRange(selected, minimumDate, maximumDate, true)) {
                  setRangeError('請選擇允許範圍內的日期。');
                  return;
                }
                setRangeError('');
                onConfirm(selected);
              }}
            >
              <Text style={styles.doneText}>完成</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="取消選擇"
              style={styles.cancel}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TimeModal({
  open,
  value,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}) {
  const [hour, setHour] = useState(value.getUTCHours());
  const [minute, setMinute] = useState(value.getUTCMinutes());
  useEffect(() => {
    if (open) {
      setHour(value.getUTCHours());
      setMinute(value.getUTCMinutes());
    }
  }, [open, value]);
  const adjust = (kind: 'hour' | 'minute', amount: number) => {
    if (kind === 'hour') setHour((v) => adjustTimePart(v, amount, 24));
    else setMinute((v) => adjustTimePart(v, amount, 60));
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={styles.calendarModal}
          contentContainerStyle={styles.modalContent}
          bounces={false}
        >
          <Text style={styles.timeTitle}>選擇時間</Text>
          <View style={styles.timePickerRow}>
            {(['hour', 'minute'] as const).map((kind) => (
              <View key={kind} style={styles.timeColumn}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={kind === 'hour' ? '增加一小時' : '增加五分鐘'}
                  onPress={() => adjust(kind, kind === 'minute' ? 5 : 1)}
                >
                  <Text style={styles.timeArrow}>＋</Text>
                </TouchableOpacity>
                <Text style={styles.timeValue}>
                  {String(kind === 'hour' ? hour : minute).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={kind === 'hour' ? '減少一小時' : '減少五分鐘'}
                  onPress={() => adjust(kind, kind === 'minute' ? -5 : -1)}
                >
                  <Text style={styles.timeArrow}>−</Text>
                </TouchableOpacity>
                <Text style={styles.timeUnit}>{kind === 'hour' ? '小時' : '分鐘'}</Text>
              </View>
            ))}
          </View>
          <View style={styles.quickMinutes}>
            {[0, 15, 30, 45].map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`設為 ${value} 分鐘`}
                accessibilityState={{ selected: minute === value }}
                style={styles.quickMinute}
                onPress={() => setMinute(value)}
              >
                <Text style={styles.dayText}>{String(value).padStart(2, '0')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="確認時間"
              style={styles.done}
              onPress={() => {
                const next = new Date(value);
                next.setUTCHours(hour, minute, 0, 0);
                onConfirm(next);
              }}
            >
              <Text style={styles.doneText}>完成</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="取消選擇"
              style={styles.cancel}
              onPress={onCancel}
            >
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DatePickerField({
  value,
  mode = 'date',
  label,
  placeholder,
  hint,
  minimumDate: minimumInstant,
  maximumDate: maximumInstant,
  disabled,
  onChange,
  onClear,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'date' | 'time'>('date');
  const valueTime = value?.getTime();
  const minimumTime = minimumInstant?.getTime();
  const maximumTime = maximumInstant?.getTime();
  const validValue = useMemo(
    () =>
      valueTime !== undefined && Number.isFinite(valueTime)
        ? taipeiPickerValue(new Date(valueTime))
        : undefined,
    [valueTime],
  );
  const minimumDate = useMemo(
    () =>
      minimumTime !== undefined && Number.isFinite(minimumTime)
        ? taipeiPickerValue(new Date(minimumTime))
        : undefined,
    [minimumTime],
  );
  const maximumDate = useMemo(
    () =>
      maximumTime !== undefined && Number.isFinite(maximumTime)
        ? taipeiPickerValue(new Date(maximumTime))
        : undefined,
    [maximumTime],
  );
  const [draft, setDraft] = useState(validValue ?? today());
  // TimeModal 不知道可選範圍，超出時由欄位顯示訊息，不用系統 Alert。
  const [rangeMessage, setRangeMessage] = useState('');
  useEffect(() => {
    if (validValue && !open) setDraft(validValue);
  }, [validValue, open]);
  const shown = validValue
    ? mode === 'date'
      ? validValue.toLocaleDateString('zh-TW', { timeZone: 'UTC' })
      : mode === 'time'
        ? validValue.toLocaleTimeString('zh-TW', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : validValue.toLocaleString('zh-TW', {
            timeZone: 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })
    : placeholder || (mode === 'time' ? '選擇時間' : '選擇日期');
  return (
    <View style={styles.container}>
      {(Boolean(label) || Boolean(onClear && validValue)) && (
        <View style={[styles.labelRow, onClear && styles.clearableLabelRow]}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          {onClear && validValue && (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`清除${label}`}
              disabled={disabled}
              accessibilityState={{ disabled: Boolean(disabled) }}
              activeOpacity={0.72}
              onPress={onClear}
              style={[styles.clearButton, disabled && styles.disabledField]}
            >
              <Ionicons name="close-circle-outline" size={17} color={Colors.primaryDecoration} />
              <Text style={styles.clearText}>{mode === 'time' ? '清除時間' : '清除日期'}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`${label}${validValue ? `，目前為 ${shown}` : ''}`}
        accessibilityHint={[
          disabled ? '目前無法修改' : `開啟${mode === 'time' ? '時間' : '日期'}選擇器`,
          hint,
        ]
          .filter(Boolean)
          .join('。')}
        disabled={disabled}
        accessibilityState={{ disabled: Boolean(disabled) }}
        activeOpacity={0.72}
        style={[styles.field, disabled && styles.disabledField]}
        onPress={() => {
          setDraft(clampDate(validValue ?? today(), minimumDate, maximumDate, mode === 'date'));
          setPhase(mode === 'datetime' ? 'date' : mode);
          // 先更新台灣日期草稿，再開啟手刻選擇器。
          setTimeout(() => setOpen(true), 0);
        }}
      >
        <View style={styles.fieldBalance} accessible={false} />
        <View style={styles.fieldContent}>
          <Ionicons
            name={mode === 'time' ? 'time-outline' : 'calendar-outline'}
            size={19}
            color={Colors.primaryDecoration}
            style={styles.calendarIcon}
          />
          <Text style={validValue ? styles.value : styles.placeholder}>{shown}</Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={18}
          color={Colors.subtext}
          style={styles.fieldBalance}
        />
      </TouchableOpacity>
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
      {rangeMessage ? (
        <Text accessibilityRole="alert" style={styles.rangeError}>
          {rangeMessage}
        </Text>
      ) : null}
      {mode === 'time' || (mode === 'datetime' && phase === 'time') ? (
        <TimeModal
          open={open}
          value={draft}
          onConfirm={(date) => {
            if (!dateInRange(date, minimumDate, maximumDate)) {
              setRangeMessage('請選擇允許範圍內的日期與時間。');
              return;
            }
            setRangeMessage('');
            setDraft(date);
            onChange(fromTaipeiPickerValue(date));
            setOpen(false);
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <CalendarModal
          open={open}
          value={draft}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onConfirm={(date) => {
            // CalendarModal 內部已擋下並顯示訊息，這裡只是防禦。
            if (!dateInRange(date, minimumDate, maximumDate, true)) return;
            setRangeMessage('');
            if (mode === 'datetime')
              date.setUTCHours(draft.getUTCHours(), draft.getUTCMinutes(), 0, 0);
            setDraft(mode === 'datetime' ? clampDate(date, minimumDate, maximumDate) : date);
            if (mode === 'datetime') {
              setPhase('time');
            } else {
              onChange(fromTaipeiPickerValue(date, true));
              setOpen(false);
            }
          }}
          onCancel={() => setOpen(false)}
        />
      )}
    </View>
  );
}
