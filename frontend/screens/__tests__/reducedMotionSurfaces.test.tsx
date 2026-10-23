Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import LoginScreen from '../LoginScreen';
import SupplementalNotesField from '../../components/SupplementalNotesField';
let mockReduced = true;
// 畫面與 LottieArt 各自訂閱 AppState，替身要廣播給全部訂閱者。
const mockAppStateListeners = new Set<(state: string) => void>();
const mockAppStateChange = (state: string) =>
  mockAppStateListeners.forEach((listener) => listener(state));
const mockStart = jest.fn();
const mockStop = jest.fn();
const mockTiming: jest.Mock = jest.fn(() => ({ start: mockStart, stop: mockStop }));
jest.mock('../../hooks/usePressFeedback', () => ({ useReducedMotion: () => mockReduced }));
jest.mock('../../assets/artwork/auth/login-paw-v1.webp', () => 1);
jest.mock('../../assets/artwork/auth/dog-run-v1.json', () => ({ dog: true }));
jest.mock('../../assets/artwork/auth/paws-loading-light-v1.json', () => ({ paws: true }));
jest.mock('react-native', () => ({
  Text: 'Text',
  TextInput: 'Input',
  TouchableOpacity: 'Button',
  Image: 'Image',
  View: 'View',
  ScrollView: 'Scroll',
  Modal: 'Modal',
  Pressable: 'Button',
  KeyboardAvoidingView: 'KeyboardView',
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
  Keyboard: { addListener: () => ({ remove: jest.fn() }), dismiss: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: (_event: string, callback: (state: string) => void) => {
      mockAppStateListeners.add(callback);
      return { remove: () => mockAppStateListeners.delete(callback) };
    },
  },
  StyleSheet: { create: (x: object) => x },
  Animated: {
    Value: class {
      setValue() {}
      stopAnimation() {}
      interpolate() {
        return 0;
      }
    },
    View: 'AnimatedView',
    Image: 'AnimatedImage',
    add: () => 0,
    timing: (...args: unknown[]) => mockTiming(...args),
    loop: () => ({ start: mockStart, stop: mockStop }),
    sequence: () => ({ start: mockStart, stop: mockStop }),
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'Safe',
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
let screen: ReactTestRenderer;
beforeEach(() => {
  jest.clearAllMocks();
  mockAppStateListeners.clear();
  mockReduced = true;
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('reduced-motion login holds the dog animation on its first frame', async () => {
  await act(async () => {
    screen = create(<LoginScreen onLoginSuccess={jest.fn()} onGoToRegister={jest.fn()} />);
  });
  const dog = screen.root.find(
    (node) => node.type === ('View' as never) && node.props.accessibilityLabel === '奔跑的狗狗插畫',
  );
  const player = dog.findByType('LottieView' as never);
  expect(player.props.autoPlay).toBe(false);
  expect(player.props.loop).toBe(false);
  expect(player.props.progress).toBe(0);
});
test('the dog animation plays normally and pauses when the app moves to the background', async () => {
  mockReduced = false;
  await act(async () => {
    screen = create(<LoginScreen onLoginSuccess={jest.fn()} onGoToRegister={jest.fn()} />);
  });
  const player = () =>
    screen.root
      .find(
        (node) =>
          node.type === ('View' as never) && node.props.accessibilityLabel === '奔跑的狗狗插畫',
      )
      .findByType('LottieView' as never);
  expect(player().props.autoPlay).toBe(true);
  expect(player().props.progress).toBeUndefined();
  await act(async () => mockAppStateChange('background'));
  expect(player().props.autoPlay).toBe(false);
  expect(player().props.progress).toBe(0);
});
test('reduced-motion notes open immediately without spatial entrance', async () => {
  await act(async () => {
    screen = create(<SupplementalNotesField value="" onChange={jest.fn()} />);
  });
  const open = screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === '編輯補充備註',
  );
  await act(async () => open.props.onPress());
  expect(mockTiming).not.toHaveBeenCalled();
  const card = screen.root
    .findAllByType('AnimatedView' as never)
    .find((node) => Array.isArray(node.props.style) && node.props.style.at(-1).transform)!;
  expect(card.props.style.at(-1)).toMatchObject({ opacity: 1, transform: [] });
});
