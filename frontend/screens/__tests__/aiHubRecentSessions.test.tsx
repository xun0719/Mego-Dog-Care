Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import AIAssistantHubScreen from '../AIAssistantHubScreen';
import { AI_LOCAL_HISTORY_NOTICE } from '../../features/ai/aiResponseContent';
import {
  loadAISessions,
  deleteAISession,
  activateEmptyAISession,
} from '../../services/aiSessionService';

jest.mock('react-native', () => ({
  Text: 'Text',
  View: 'View',
  ScrollView: 'Scroll',
  TouchableOpacity: 'Button',
  Modal: 'Modal',
  ActivityIndicator: 'Busy',
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'Safe' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({
  usePet: () => ({ selectedPet: { id: 'p1', name: 'Kuro' } }),
}));
jest.mock('../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));
jest.mock('../../features/ai/components/AIConversationSessionRow', () => ({
  AIConversationSessionRow: 'Conversation',
}));
jest.mock('../../services/aiDataConsentService', () => ({
  getAIDataConsent: jest.fn().mockResolvedValue({ accepted: true }),
  acceptAIDataConsent: jest.fn(),
}));
jest.mock('../../services/aiSessionService', () => ({
  loadAISessions: jest.fn(),
  activateAISession: jest.fn(),
  activateEmptyAISession: jest.fn().mockResolvedValue(undefined),
  deleteAISession: jest.fn().mockResolvedValue(undefined),
}));

const mockNavigate = jest.fn();
const navigation = {
  getParent: () => ({ getParent: () => ({ navigate: mockNavigate }) }),
  navigate: mockNavigate,
};
let screen: ReactTestRenderer;
const sessions = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: String(index),
    title: `對話 ${index + 1}`,
    messages: [],
    updatedAt: `2026-10-${String(index + 1).padStart(2, '0')}T00:00:00Z`,
  }));
const mount = async () => {
  await act(async () => {
    screen = create(
      <AIAssistantHubScreen
        {...({ navigation } as unknown as React.ComponentProps<typeof AIAssistantHubScreen>)}
      />,
    );
  });
};
beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each([0, 1, 5])(
  'with %i conversations, limit sits beside heading and storage notice follows the list',
  async (count) => {
    (loadAISessions as jest.Mock).mockResolvedValue(sessions(count));
    await mount();
    const scroll = screen.root.findAllByType('Scroll' as never)[0];
    const heading = scroll.findAll(
      (node) => node.type === ('Text' as never) && node.props.children === '最近對話',
    )[0];
    expect(heading.parent?.props.style).toMatchObject({ marginBottom: 16, flexWrap: 'wrap' });
    expect(
      heading.parent?.findAll(
        (node) => node.type === ('Text' as never) && node.props.children === '最多 5 個',
      ),
    ).toHaveLength(1);
    const nodes = scroll.findAll((node) => ['Text', 'Conversation'].includes(node.type as string));
    const footerIndex = nodes.findIndex((node) => node.props.children === AI_LOCAL_HISTORY_NOTICE);
    const cards = scroll.findAllByType('Conversation' as never);
    expect(cards).toHaveLength(count);
    expect(footerIndex).toBeGreaterThan(nodes.indexOf(heading));
    for (const card of cards) expect(footerIndex).toBeGreaterThan(nodes.indexOf(card));
    expect(nodes[footerIndex].props.style).toMatchObject({ marginTop: 12, lineHeight: 18 });
    expect(JSON.stringify(screen.toJSON())).not.toContain('最多保留 5 個；超過時');
  },
);

test.each(['loading', 'error'])('storage notice also follows the %s status', async (state) => {
  if (state === 'loading') (loadAISessions as jest.Mock).mockReturnValue(new Promise(() => {}));
  else (loadAISessions as jest.Mock).mockRejectedValue(new Error('offline'));
  await mount();
  const scroll = screen.root.findAllByType('Scroll' as never)[0];
  const text = scroll.findAllByType('Text' as never).map((node) => node.props.children);
  const status = state === 'loading' ? '正在整理最近對話…' : '最近對話暫時載入失敗';
  expect(text).toContain(status);
  expect(text.indexOf(AI_LOCAL_HISTORY_NOTICE)).toBeGreaterThan(text.indexOf(status));
});

test('a sixth conversation still asks before deleting the named oldest session', async () => {
  (loadAISessions as jest.Mock).mockResolvedValue(sessions(5));
  await mount();
  await act(async () =>
    screen.root.findByProps({ accessibilityLabel: '開始新的 MEGO AI 對話' }).props.onPress(),
  );
  expect(Alert.alert).toHaveBeenCalledWith(
    '對話已達 5 個',
    expect.stringContaining('對話 1'),
    expect.any(Array),
  );
  expect(deleteAISession).not.toHaveBeenCalled();
  expect(activateEmptyAISession).not.toHaveBeenCalled();
  const confirm = (Alert.alert as jest.Mock).mock.calls[0][2].find(
    (action: { text: string }) => action.text === '刪除並建立',
  );
  await act(async () => confirm.onPress());
  expect(deleteAISession).toHaveBeenCalledWith('u1', 'p1', '0');
  expect(activateEmptyAISession).toHaveBeenCalledWith('u1', 'p1');
  expect(mockNavigate).toHaveBeenCalledWith('AIChat');
});
