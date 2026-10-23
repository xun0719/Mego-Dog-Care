Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import AIChatScreen from '../AIChatScreen';
import { sendAIChat } from '../../services/aiService';
import { loadAISession, saveActiveAISession } from '../../services/aiSessionService';
let mockFocus = 0;
jest.mock('react-native', () => {
  const React = require('react');
  return {
    ActivityIndicator: 'Busy',
    Text: 'Text',
    TextInput: 'Input',
    TouchableOpacity: 'Button',
    View: 'View',
    StyleSheet: { create: (x: object) => x },
    FlatList: React.forwardRef(
      (
        props: { ListHeaderComponent: React.ReactNode; ListFooterComponent: React.ReactNode },
        ref: unknown,
      ) => {
        React.useImperativeHandle(ref, () => ({ scrollToEnd: jest.fn() }));
        return React.createElement(
          'List',
          props,
          props.ListHeaderComponent,
          props.ListFooterComponent,
        );
      },
    ),
  };
});
jest.mock('react-native-keyboard-controller', () => ({
  KeyboardAvoidingView: 'Keyboard',
  useReanimatedKeyboardAnimation: () => ({ height: { value: 0 } }),
}));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'AnimatedView' },
  useAnimatedStyle: (callback: () => unknown) => callback(),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'Safe' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ canGoBack: () => true, goBack: jest.fn() }),
  useFocusEffect: (callback: () => void) =>
    require('react').useEffect(callback, [callback, mockFocus]),
}));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: { id: 'p1', name: 'Kuro' } }),
}));
jest.mock('../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../features/ai/components/AIChatContent', () => ({
  AIChatEmptyConversation: 'Empty',
  AIChatMessageBubble: 'Message',
}));
jest.mock('../../services/aiService', () => ({ sendAIChat: jest.fn() }));
jest.mock('../../services/aiSessionService', () => ({
  captureAISessionGeneration: jest.fn().mockReturnValue(0),
  loadAISession: jest.fn(),
  saveActiveAISession: jest.fn().mockResolvedValue(undefined),
  activateEmptyAISession: jest.fn(),
}));
test('late A reply neither changes B messages nor clears B waiting state', async () => {
  let resolveA!: (value: object) => void, resolveB!: (value: object) => void;
  (sendAIChat as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveA = resolve;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );
  (loadAISession as jest.Mock)
    .mockResolvedValueOnce({ sessionId: 'A', messages: [] })
    .mockResolvedValueOnce({ sessionId: 'B', messages: [] });
  let screen: ReturnType<typeof create>;
  await act(async () => {
    screen = create(<AIChatScreen />);
  });
  const input = () => screen!.root.findByType('Input' as never);
  const button = () =>
    screen!.root.find(
      (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === '送出問題',
    );
  let pendingA!: Promise<void>, pendingB!: Promise<void>;
  await act(async () => input().props.onChangeText('question A'));
  await act(async () => {
    pendingA = button().props.onPress();
  });
  mockFocus++;
  await act(async () => screen!.update(<AIChatScreen />));
  expect(button().props.disabled).toBe(false);
  await act(async () => input().props.onChangeText('question B'));
  await act(async () => {
    pendingB = button().props.onPress();
  });
  await act(async () => {
    resolveA({ answer: 'answer A', sources: [] });
    await pendingA;
  });
  expect(button().props.disabled).toBe(true);
  expect(screen!.root.findByType('List' as never).props.data).toEqual([
    { role: 'user', text: 'question B' },
  ]);
  await act(async () => {
    resolveB({ answer: 'answer B', sources: [] });
    await pendingB;
  });
  expect(
    screen!.root.findByType('List' as never).props.data.map((item: { text: string }) => item.text),
  ).toEqual(['question B', 'answer B']);
  expect(saveActiveAISession).toHaveBeenCalledWith(
    'u1',
    'p1',
    'A',
    expect.any(Array),
    undefined,
    0,
  );
  expect(saveActiveAISession).toHaveBeenCalledWith(
    'u1',
    'p1',
    'B',
    expect.any(Array),
    undefined,
    0,
  );
  await act(async () => screen!.unmount());
});
