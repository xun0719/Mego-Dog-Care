Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { LottieArt } from '../LottieArt';
let mockReduced = false;
const mockAppStateListeners = new Set<(state: string) => void>();
const appStateChange = (state: string) =>
  mockAppStateListeners.forEach((listener) => listener(state));
jest.mock('../../hooks/usePressFeedback', () => ({ useReducedMotion: () => mockReduced }));
jest.mock('react-native', () => ({
  View: 'View',
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, callback: (state: string) => void) => {
      mockAppStateListeners.add(callback);
      return { remove: () => mockAppStateListeners.delete(callback) };
    },
  },
}));
let screen: ReactTestRenderer;
const source = { dummy: true };
const player = () => screen.root.findByType('LottieView' as never);
const mount = async (props: object = {}) => {
  await act(async () => {
    screen = create(<LottieArt source={source} {...props} />);
  });
};
beforeEach(() => {
  mockReduced = false;
  mockAppStateListeners.clear();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('an animation plays and loops by default', async () => {
  await mount();
  expect(player().props.autoPlay).toBe(true);
  expect(player().props.loop).toBe(true);
  expect(player().props.progress).toBeUndefined();
});

test('reduced motion holds the first frame instead of playing', async () => {
  mockReduced = true;
  await mount();
  expect(player().props.autoPlay).toBe(false);
  expect(player().props.loop).toBe(false);
  expect(player().props.progress).toBe(0);
});

test('an inactive caller condition holds the first frame', async () => {
  await mount({ playing: false });
  expect(player().props.autoPlay).toBe(false);
  expect(player().props.progress).toBe(0);
});

test('leaving and returning to the foreground pauses and resumes', async () => {
  await mount();
  await act(async () => appStateChange('background'));
  expect(player().props.autoPlay).toBe(false);
  await act(async () => appStateChange('active'));
  expect(player().props.autoPlay).toBe(true);
});

test('an animation without a label is hidden from assistive technology', async () => {
  await mount();
  const wrapper = screen.root.findByType('View' as never);
  expect(wrapper.props.accessible).toBe(false);
  expect(wrapper.props.accessibilityElementsHidden).toBe(true);
  expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
});

test('a labelled animation is announced as an image', async () => {
  await mount({ accessibilityLabel: '奔跑的狗狗插畫' });
  const wrapper = screen.root.findByType('View' as never);
  expect(wrapper.props.accessible).toBe(true);
  expect(wrapper.props.accessibilityRole).toBe('image');
  expect(wrapper.props.accessibilityLabel).toBe('奔跑的狗狗插畫');
  expect(wrapper.props.accessibilityElementsHidden).toBe(false);
});
