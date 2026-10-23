Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import CarePhotoViewer, { carePhotoPreviewHeight } from '../components/CarePhotoViewer';
import { photo } from './carePhotoFixture';

let mockFrame = { x: 0, y: 0, width: 390, height: 844 };
let mockInsets = { top: 59, right: 0, bottom: 34, left: 0 };
jest.mock('react-native', () => ({
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  Text: 'Text',
  TouchableOpacity: 'Button',
  View: 'View',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  SafeAreaProvider: 'SafeAreaProvider',
  useSafeAreaInsets: () => mockInsets,
  useSafeAreaFrame: () => mockFrame,
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../components/CarePhotoImage', () => 'PhotoImage');
const mockClose = jest.fn();
const mockOpen = jest.fn();
let screen: ReactTestRenderer;
const render = (visible = true) => (
  <CarePhotoViewer
    photo={visible ? photo('a') : null}
    userId="u1"
    token="token"
    onClose={mockClose}
    onOpenRecord={mockOpen}
  />
);
beforeEach(() => {
  jest.clearAllMocks();
  mockFrame = { x: 0, y: 0, width: 390, height: 844 };
  mockInsets = { top: 59, right: 0, bottom: 34, left: 0 };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('first opening seeds modal safe area before layout and retains a tappable close control', async () => {
  await act(async () => {
    screen = create(render());
  });
  const provider = screen.root.findByType('SafeAreaProvider' as never);
  expect(provider.props.initialMetrics).toEqual({ frame: mockFrame, insets: mockInsets });
  expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
    'top',
    'left',
    'right',
  ]);
  const modal = screen.root.findByType('Modal' as never);
  expect(modal.props.presentationStyle).toBe('fullScreen');
  expect(modal.props.statusBarTranslucent).toBe(true);
  const close = screen.root
    .findAllByType('Button' as never)
    .find((node) => node.props.accessibilityLabel === '關閉照片')!;
  await act(async () => close.props.onPress());
  expect(mockClose).toHaveBeenCalledTimes(1);
});

test('preview height follows measured scroll area and changes with modal layout', async () => {
  await act(async () => {
    screen = create(render());
  });
  const scroll = screen.root.findByType('ScrollView' as never);
  await act(async () => scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } }));
  expect(screen.root.findByType('PhotoImage' as never).props.style.height).toBeCloseTo(220);
  await act(async () => scroll.props.onLayout({ nativeEvent: { layout: { height: 300 } } }));
  expect(screen.root.findByType('PhotoImage' as never).props.style.height).toBe(165);
  expect(scroll.props.contentContainerStyle[1].paddingBottom).toBe(58);
});

test('closing removes modal content and reopening uses the current orientation metrics', async () => {
  await act(async () => {
    screen = create(render());
  });
  await act(async () => screen.update(render(false)));
  expect(screen.root.findAllByType('SafeAreaProvider' as never)).toHaveLength(0);
  mockFrame = { x: 0, y: 0, width: 844, height: 390 };
  mockInsets = { top: 0, left: 59, right: 59, bottom: 21 };
  await act(async () => screen.update(render()));
  expect(screen.root.findByType('SafeAreaProvider' as never).props.initialMetrics).toEqual({
    frame: mockFrame,
    insets: mockInsets,
  });
});

test('preview sizes are bounded without using global window dimensions', () => {
  expect(carePhotoPreviewHeight(0)).toBe(240);
  expect(carePhotoPreviewHeight(200)).toBe(160);
  expect(carePhotoPreviewHeight(1800)).toBe(480);
});
