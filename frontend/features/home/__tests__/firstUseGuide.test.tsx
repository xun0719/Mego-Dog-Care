Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firstUseGuideKey, clearFirstUseGuide, useFirstUseGuide } from '../useFirstUseGuide';
import { FirstUseGuide } from '../components/FirstUseGuide';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (x: object) => x },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
let guide: ReturnType<typeof useFirstUseGuide>;
let screen: ReactTestRenderer;
function Harness({ userId, enabled = true }: { userId?: string; enabled?: boolean }) {
  guide = useFirstUseGuide(userId, enabled);
  return null;
}
beforeEach(() => {
  jest.clearAllMocks();
  storage.getItem.mockResolvedValue(null);
  storage.setItem.mockResolvedValue();
  storage.removeItem.mockResolvedValue();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test('first visit shows a guide; dismissing saves only this account and hides it', async () => {
  await act(async () => {
    screen = create(<Harness userId="u1" />);
  });
  expect(guide.visible).toBe(true);
  await act(async () => guide.dismiss());
  expect(guide.visible).toBe(false);
  expect(storage.setItem).toHaveBeenCalledWith(firstUseGuideKey('u1'), 'done');
  storage.getItem.mockResolvedValue('done');
  await act(async () => screen.unmount());
  await act(async () => {
    screen = create(<Harness userId="u1" />);
  });
  expect(guide.visible).toBe(false);
});

test('switching accounts ignores a late previous-account read', async () => {
  let resolveOld!: (value: string | null) => void;
  storage.getItem.mockImplementation((key) =>
    key === firstUseGuideKey('u1')
      ? new Promise((resolve) => {
          resolveOld = resolve;
        })
      : Promise.resolve('done'),
  );
  await act(async () => {
    screen = create(<Harness userId="u1" />);
  });
  await act(async () => screen.update(<Harness userId="u2" />));
  await act(async () => resolveOld(null));
  expect(guide.visible).toBe(false);
});

test('the guide is not shown for disabled/memorial or signed-out views', async () => {
  await act(async () => {
    screen = create(<Harness userId="u1" enabled={false} />);
  });
  expect(guide.visible).toBe(false);
  expect(storage.getItem).not.toHaveBeenCalled();
  await act(async () => screen.update(<Harness />));
  expect(guide.visible).toBe(false);
});

test('storage failure keeps the guide visible with a retryable message', async () => {
  storage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
  await act(async () => {
    screen = create(<Harness userId="u1" />);
  });
  await act(async () => guide.dismiss());
  expect(guide.visible).toBe(true);
  expect(guide.error).toContain('請再試一次');
  await act(async () => guide.dismiss());
  expect(guide.visible).toBe(false);
});

test('account deletion removes only its local guide status', async () => {
  await clearFirstUseGuide('u1');
  expect(storage.removeItem).toHaveBeenCalledWith(firstUseGuideKey('u1'));
});

test('the card is compact, dismissible and does not require a daily streak', async () => {
  await act(async () => {
    screen = create(<FirstUseGuide userId="u1" />);
  });
  const json = JSON.stringify(screen.toJSON());
  expect(json).toContain('首頁快速記');
  expect(json).toContain('紀錄回顧');
  expect(json).toContain('MEGO AI 整理');
  expect(json).toContain('不必每天填滿');
  const button = screen.root.find((node) => node.type === ('Button' as never));
  await act(async () => button.props.onPress());
  expect(screen.toJSON()).toBeNull();
});
