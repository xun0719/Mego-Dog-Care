Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import { guardTabNavigation, useUnsavedChangesGuard } from '../useUnsavedChangesGuard';
const mockDispatch = jest.fn();
let mockRemove: (event: { data: { action: object } }) => void;
let mockPrevent = false;
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return {
    useNavigation: () => ({ dispatch: mockDispatch }),
    useFocusEffect: (callback: () => void) => react.useEffect(callback, [callback]),
    usePreventRemove: (prevent: boolean, callback: typeof mockRemove) => {
      mockPrevent = prevent;
      mockRemove = callback;
    },
  };
});
let renderer: ReactTestRenderer;
const discard = jest.fn();
function Form({ dirty }: { dirty: boolean }) {
  useUnsavedChangesGuard(dirty, discard);
  return null;
}
async function mount(dirty: boolean) {
  await act(async () => {
    renderer = create(<Form dirty={dirty} />);
  });
}
function choose(text: string) {
  const calls = (Alert.alert as jest.Mock).mock.calls;
  const buttons = calls[calls.length - 1][2];
  return buttons.find((button: { text: string }) => button.text === text).onPress();
}
afterEach(async () => {
  if (renderer) await act(async () => renderer.unmount());
  jest.clearAllMocks();
});
test('clean forms do not block tabs or removal', async () => {
  await mount(false);
  expect(mockPrevent).toBe(false);
  expect(guardTabNavigation(jest.fn())).toBe(false);
});
test('canceling a tab switch keeps the draft and does not navigate', async () => {
  await mount(true);
  const proceed = jest.fn();
  expect(guardTabNavigation(proceed)).toBe(true);
  choose('繼續編輯');
  expect(discard).not.toHaveBeenCalled();
  expect(proceed).not.toHaveBeenCalled();
});
test('discarding a tab switch resumes the pending action once', async () => {
  await mount(true);
  const proceed = jest.fn();
  guardTabNavigation(proceed);
  await act(async () => choose('放棄變更'));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(proceed).toHaveBeenCalledTimes(1);
});
test('back and swipe removal resume the original action only after discard', async () => {
  await mount(true);
  const action = { type: 'GO_BACK' };
  mockRemove({ data: { action } });
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async () => choose('放棄變更'));
  expect(mockDispatch).toHaveBeenCalledWith(action);
});

test('two mounted dirty forms retain independent guards when the front form unmounts', async () => {
  const first = jest.fn();
  const second = jest.fn();
  function Guard({ restore }: { restore: () => void }) {
    useUnsavedChangesGuard(true, restore);
    return null;
  }
  await act(async () => {
    renderer = create(
      <>
        <Guard key="first" restore={first} />
        <Guard key="second" restore={second} />
      </>,
    );
  });
  const proceed = jest.fn();
  guardTabNavigation(proceed);
  await act(async () => choose('繼續編輯'));
  await act(async () =>
    renderer.update(
      <>
        <Guard key="first" restore={first} />
      </>,
    ),
  );
  guardTabNavigation(proceed);
  await act(async () => choose('放棄變更'));
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).not.toHaveBeenCalled();
  expect(proceed).toHaveBeenCalledTimes(1);
});
