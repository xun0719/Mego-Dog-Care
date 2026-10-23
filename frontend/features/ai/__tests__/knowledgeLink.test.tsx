Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create } from 'react-test-renderer';
import { Alert, Linking } from 'react-native';
import { AIChatMessageBubble } from '../components/AIChatContent';
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn().mockRejectedValue(new Error('unavailable')) },
  Text: 'Text',
  View: 'View',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('../components/AIChatMarkdown', () => ({ AIChatMarkdown: 'Markdown' }));
test('a failed reference link shows actionable feedback instead of disappearing silently', async () => {
  let screen: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <AIChatMessageBubble
        item={
          {
            role: 'assistant',
            text: '照護資料',
            knowledgeSources: [
              {
                url: 'https://example.com/source',
                title: '來源',
                section: '照護',
                documentTitle: '資料',
              },
            ],
          } as never
        }
      />,
    );
  });
  const link = screen!.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityRole === 'link',
  );
  await act(async () => link.props.onPress());
  expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/source');
  expect(Alert.alert).toHaveBeenCalledWith('無法開啟參考資料', '請稍後再試。');
  await act(async () => screen!.unmount());
});

test('record sources and public references are separate and system replies are not called AI', async () => {
  let screen!: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <AIChatMessageBubble
        item={{
          role: 'assistant',
          text: '紀錄內容',
          generationMode: 'deterministic',
          sources: [{ type: 'weight', label: '體重紀錄' }],
          knowledgeSources: [
            {
              url: 'https://example.com/source',
              title: '來源',
              documentTitle: '資料',
              section: '照護',
            },
          ],
        }}
      />,
    );
  });
  const text = JSON.stringify(screen.toJSON());
  expect(text).toContain('系統整理（非 AI）');
  expect(text).toContain('使用你的照護紀錄');
  expect(text).toContain('不是外部文獻');
  expect(text).toContain('照護參考文獻');
  await act(async () => screen.unmount());
});

test('AI replies without attached sources display a verification reminder', async () => {
  let screen!: ReturnType<typeof create>;
  await act(async () => {
    screen = create(
      <AIChatMessageBubble item={{ role: 'assistant', text: '一般回答', generationMode: 'llm' }} />,
    );
  });
  expect(JSON.stringify(screen.toJSON())).toContain('本則未附照護紀錄或文獻來源');
  await act(async () => screen.unmount());
});
