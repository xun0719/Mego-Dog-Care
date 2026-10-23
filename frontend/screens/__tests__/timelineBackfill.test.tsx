Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import TimelineScreen from '../TimelineScreen';
let mockPet = { id: 'p1', name: '小米', memorial: false };
const mockNavigation = { navigate: jest.fn() };
jest.mock('react-native', () => {
  const react = jest.requireActual('react');
  return {
    Text: 'Text',
    View: 'View',
    TouchableOpacity: 'Button',
    RefreshControl: 'Refresh',
    StyleSheet: { create: (styles: object) => styles },
    FlatList: (props: {
      data: unknown[];
      ListHeaderComponent: React.ReactNode;
      ListEmptyComponent: React.ReactNode;
    }) =>
      react.createElement(
        'List',
        props,
        props.ListHeaderComponent,
        props.data.length ? null : props.ListEmptyComponent,
      ),
  };
});
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return { useFocusEffect: (callback: () => void) => react.useEffect(callback, [callback]) };
});
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({ usePet: () => ({ selectedPet: mockPet }) }));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/ScreenState', () => 'ScreenState');
jest.mock('../../features/timeline/components/TimelineHeader', () => 'Header');
jest.mock('../../features/timeline/components/TimelineCard', () => 'Card');
jest.mock('../../services/timelineService', () => ({
  getTimelineCalendar: jest.fn().mockResolvedValue({ days: [] }),
  getTimelineDay: jest.fn().mockResolvedValue([]),
}));
let screen: ReactTestRenderer;
const mount = async () => {
  await act(async () => {
    screen = create(<TimelineScreen navigation={mockNavigation as never} route={{} as never} />);
  });
};
beforeEach(() => {
  jest.clearAllMocks();
  mockPet = { ...mockPet, memorial: false };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('empty selected dates open a daily log with that calendar date', async () => {
  await mount();
  await act(async () =>
    screen.root.findByType('Header' as never).props.onSelectDate(new Date(2026, 9, 3)),
  );
  const button = screen.root.findByType('AppButton' as never);
  expect(button.props.title).toBe('新增這一天的日常紀錄');
  button.props.onPress();
  expect(mockNavigation.navigate).toHaveBeenCalledWith('DailyLog', { recordDate: '2026-10-03' });
});
test('memorial pets do not receive an add-record action', async () => {
  mockPet = { ...mockPet, memorial: true };
  await mount();
  expect(screen.root.findAllByType('AppButton' as never)).toHaveLength(0);
});
