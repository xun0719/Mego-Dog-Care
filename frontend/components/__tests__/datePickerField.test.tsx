Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import DatePickerField from '../DatePickerField';
import { Alert } from 'react-native';
import { taipeiDateKey, formatTaipeiTime } from '../../utils/taipeiDate';
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
const onChange = jest.fn();
const button = (label: string) =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === label,
  );
async function mount(
  mode: 'date' | 'datetime' | 'time',
  value: Date,
  minimumDate?: Date,
  maximumDate?: Date,
) {
  await act(async () => {
    screen = create(
      <DatePickerField
        label="日期"
        mode={mode}
        value={value}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        onChange={onChange}
      />,
    );
  });
  const field = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityHint,
  );
  await act(async () => {
    field.props.onPress();
    jest.runOnlyPendingTimers();
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.useRealTimers();
});
test('calendar clamps the initial value, labels full dates and announces selected state', async () => {
  const minimum = new Date('2026-10-03T15:00:00+08:00');
  await mount('date', new Date('2026-10-01T12:00:00+08:00'), minimum);
  expect(button('2026 年 10 月 3 日').props.accessibilityState.selected).toBe(true);
  expect(button('2026 年 10 月 2 日').props.accessibilityState.disabled).toBe(true);
  await act(async () => button('確認日期').props.onPress());
  expect(taipeiDateKey(onChange.mock.calls[0][0])).toBe('2026-10-03');
});
test('minutes move by five and support quarter-hour shortcuts', async () => {
  await mount('time', new Date('2026-10-03T12:07:00+08:00'));
  await act(async () => button('增加五分鐘').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('12:12');
});
test('quarter-hour choice is confirmed explicitly', async () => {
  await mount('time', new Date('2026-10-03T12:07:00+08:00'));
  await act(async () => button('設為 45 分鐘').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('12:45');
});
test('final datetime confirmation refuses an out-of-range time', async () => {
  const minimum = new Date('2026-10-03T15:00:00+08:00');
  await mount('datetime', minimum, minimum);
  await act(async () => button('確認日期').props.onPress());
  await act(async () => button('減少一小時').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(onChange).not.toHaveBeenCalled();
  // 訊息顯示在欄位下方，不再疊一層系統 Alert。
  expect(
    screen.root
      .findAll(
        (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'alert',
      )
      .map((node) => node.props.children),
  ).toContain('請選擇允許範圍內的日期與時間。');
  expect(Alert.alert).not.toHaveBeenCalled();
});

test('birthdays before 2000 display and confirm without being reset to today', async () => {
  await mount('date', new Date('1999-03-10T12:00:00+08:00'));
  expect(button('1999 年 3 月 10 日').props.accessibilityState.selected).toBe(true);
  expect(onChange).not.toHaveBeenCalled();
  await act(async () => button('確認日期').props.onPress());
  expect(taipeiDateKey(onChange.mock.calls[0][0])).toBe('1999-03-10');
});

test('time selection preserves 02:30 even when it is a device daylight-saving gap', async () => {
  await mount('time', new Date('2026-03-08T02:30:00+08:00'));
  await act(async () => button('確認時間').props.onPress());
  expect(formatTaipeiTime(onChange.mock.calls[0][0])).toBe('02:30');
});

test('changing a calendar draft and cancelling does not populate the field', async () => {
  await mount('date', new Date('1999-03-10T12:00:00+08:00'));
  await act(async () => button('1999 年 3 月 11 日').props.onPress());
  await act(async () => button('取消選擇').props.onPress());
  expect(onChange).not.toHaveBeenCalled();
  const modal = screen.root.find((node) => node.type === ('Modal' as never));
  expect(modal.props.visible).toBe(false);
});

test('datetime display and confirmation use Taipei time at a UTC date boundary', async () => {
  await mount('datetime', new Date('2026-09-30T16:30:00Z'));
  expect(button('2026 年 10 月 1 日').props.accessibilityState.selected).toBe(true);
  await act(async () => button('確認日期').props.onPress());
  await act(async () => button('確認時間').props.onPress());
  expect(onChange.mock.calls[0][0].toISOString()).toBe('2026-09-30T16:30:00.000Z');
});

test('optional dates expose clear while mandatory dates do not', async () => {
  const onClear = jest.fn();
  await act(async () => {
    screen = create(
      <DatePickerField
        label="結束日期"
        value={new Date('2026-10-13T12:00:00+08:00')}
        onChange={onChange}
        onClear={onClear}
      />,
    );
  });
  await act(async () => button('清除結束日期').props.onPress());
  expect(onClear).toHaveBeenCalledTimes(1);
  await act(async () =>
    screen.update(<DatePickerField label="開始日期" value={new Date()} onChange={onChange} />),
  );
  expect(
    screen.root.findAll((node) => node.props.accessibilityLabel === '清除開始日期'),
  ).toHaveLength(0);
});

test('date field centers its content between equal side rails and exposes a chevron', async () => {
  await act(async () => {
    screen = create(
      <DatePickerField label="下次接種日期" placeholder="選擇下次接種日期" onChange={onChange} />,
    );
  });
  const field = button('下次接種日期');
  expect(field.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ minHeight: 54, alignItems: 'center', justifyContent: 'center' }),
    ]),
  );
  const content = field.findAll(
    (node) => node.type === ('View' as never) && node.props.style?.flex === 1,
  )[0];
  expect(content.props.style).toMatchObject({
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  });
  const rails = field.findAll((node) => node.props.style?.width === 22);
  expect(rails).toHaveLength(2);
  expect(rails[1].props.name).toBe('chevron-down');
  expect(field.findAllByType('Text' as never)[0].props.children).toBe('選擇下次接種日期');
  expect(field.props.activeOpacity).toBeLessThan(1);
  expect(
    screen.root.findAll((node) => node.props.accessibilityLabel === '清除下次接種日期'),
  ).toHaveLength(0);
  expect(onChange).not.toHaveBeenCalled();
});

test('clear is centered inside an outlined action beside the label, not below the date field', async () => {
  const onClear = jest.fn();
  await act(async () => {
    screen = create(
      <DatePickerField
        label="下次日期"
        value={new Date()}
        disabled
        onChange={onChange}
        onClear={onClear}
      />,
    );
  });
  const clear = button('清除下次日期');
  expect(clear.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        borderWidth: 1,
        maxWidth: '45%',
      }),
    ]),
  );
  const label = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.children === '下次日期',
  )[0];
  expect(clear.parent).toBe(label.parent);
  expect(clear.parent?.props.style).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ flexDirection: 'row', alignItems: 'center' }),
      expect.objectContaining({ minHeight: 44 }),
    ]),
  );
  const field = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityHint,
  );
  expect(field.findAll((node) => node.props.accessibilityLabel === '清除下次日期')).toHaveLength(0);
  const siblings = clear.parent!.parent!.children;
  expect(siblings.indexOf(clear.parent!)).toBeLessThan(siblings.indexOf(field));
  expect(clear.findAllByType('Icon' as never)[0].props.name).toBe('close-circle-outline');
  expect(clear.props.disabled).toBe(true);
  expect(clear.props.accessibilityState.disabled).toBe(true);
  expect(onClear).not.toHaveBeenCalled();
});

test('an empty time field prompts for time without populating it', async () => {
  await act(async () => {
    screen = create(<DatePickerField label="提醒時間" mode="time" onChange={onChange} />);
  });
  expect(button('提醒時間').findAllByType('Text' as never)[0].props.children).toBe('選擇時間');
  expect(onChange).not.toHaveBeenCalled();
});

test('date constraints appear below the field, not inside the label and clear-action row', async () => {
  const hint = '不可早於接種日期，可選同一天。';
  await act(async () => {
    screen = create(
      <DatePickerField
        label="下次接種日期（選填）"
        hint={hint}
        value={new Date()}
        onChange={onChange}
        onClear={jest.fn()}
      />,
    );
  });
  const hintText = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.children === hint,
  )[0];
  expect(hintText.props.style).toMatchObject({ marginTop: 6, lineHeight: 20 });
  expect(hintText.props.numberOfLines).toBeUndefined();
  const field = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityHint,
  );
  expect(field.props.accessibilityHint).toContain(hint);
  const siblings = hintText.parent!.children;
  expect(siblings.indexOf(hintText)).toBeGreaterThan(siblings.indexOf(field));
  const label = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.children === '下次接種日期（選填）',
  )[0];
  expect(label.parent).not.toBe(hintText.parent);
  expect(button('清除下次接種日期（選填）').parent).toBe(label.parent);
  expect(onChange).not.toHaveBeenCalled();
});
