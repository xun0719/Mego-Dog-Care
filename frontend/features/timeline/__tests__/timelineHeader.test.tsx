Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import TimelineHeader from '../components/TimelineHeader';
jest.mock('react-native', () => ({
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../../components/MonthPicker', () => 'MonthPicker');
let screen: ReactTestRenderer;
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test.each(['MEGO 測試犬 11', '犬'.repeat(20), '🐶'.repeat(20)])(
  'long name %s has a separate album action row and working navigation',
  async (name) => {
    const onOpenPhotos = jest.fn();
    await act(async () => {
      screen = create(
        <TimelineHeader
          petName={name}
          month={new Date(2026, 9, 1)}
          selectedDate={new Date(2026, 9, 12)}
          markedDays={{}}
          itemCount={0}
          onSelectDate={jest.fn()}
          onSelectMonth={jest.fn()}
          onGoToday={jest.fn()}
          onOpenPhotos={onOpenPhotos}
        />,
      );
    });
    const title = screen.root
      .findAllByType('Text' as never)
      .find((n) => n.props.children === `${name} 的生活足跡`)!;
    const album = screen.root.findByProps({ accessibilityLabel: '開啟照護相簿' });
    expect(title.props.numberOfLines).toBe(2);
    // The text row and album row share a vertical parent rather than competing horizontally.
    expect(title.parent?.parent).not.toBe(album.parent);
    expect(title.parent?.parent?.parent).toBe(album.parent?.parent);
    expect(album.props.style.minHeight).toBeGreaterThanOrEqual(44);
    await act(async () => album.props.onPress());
    expect(onOpenPhotos).toHaveBeenCalledTimes(1);
  },
);
