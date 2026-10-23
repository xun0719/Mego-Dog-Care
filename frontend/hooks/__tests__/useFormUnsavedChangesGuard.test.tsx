Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { guardTabNavigation } from '../useUnsavedChangesGuard';
import { useFormUnsavedChangesGuard } from '../useFormUnsavedChangesGuard';
import { Alert } from 'react-native';
let mockPrevent = false;
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }));
jest.mock('@react-navigation/native', () => {
  const react = jest.requireActual('react');
  return {
    useNavigation: () => ({ dispatch: jest.fn() }),
    useFocusEffect: (callback: () => void) => react.useEffect(callback, [callback]),
    usePreventRemove: (prevent: boolean) => {
      mockPrevent = prevent;
    },
  };
});
let screen: ReactTestRenderer;
let form: {
  value: { notes: string; date: Date };
  setValue: React.Dispatch<React.SetStateAction<{ notes: string; date: Date }>>;
  markSaved: (saved?: { notes: string; date: Date }, proceed?: () => void) => void;
};
function Form({ initial = '複製帶入的資料' }) {
  const [value, setValue] = useState({ notes: initial, date: new Date('2026-10-01') });
  const guard = useFormUnsavedChangesGuard(value, setValue);
  form = { value, setValue, markSaved: guard.markSaved };
  return null;
}
const mount = async () => {
  await act(async () => {
    screen = create(<Form />);
  });
};
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.clearAllMocks();
});
test('prefilled copy forms start clean and reverting to baseline removes the guard', async () => {
  await mount();
  expect(mockPrevent).toBe(false);
  await act(async () => form.setValue({ ...form.value, notes: '修改' }));
  expect(mockPrevent).toBe(true);
  await act(async () => form.setValue({ ...form.value, notes: '複製帶入的資料' }));
  expect(mockPrevent).toBe(false);
});
test('loaded data establishes a clean baseline and discard restores its original values', async () => {
  await mount();
  const loaded = { notes: '伺服器資料', date: new Date('2026-10-03') };
  await act(async () => {
    form.setValue(loaded);
    form.markSaved(loaded);
  });
  expect(mockPrevent).toBe(false);
  await act(async () => form.setValue({ ...loaded, notes: '草稿' }));
  guardTabNavigation(jest.fn());
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)[2];
  await act(async () =>
    buttons.find((button: { text: string }) => button.text === '放棄變更').onPress(),
  );
  expect(form.value).toEqual(loaded);
  expect(mockPrevent).toBe(false);
});
test('success navigation waits until the saved baseline disables the remove guard', async () => {
  await mount();
  await act(async () => form.setValue({ ...form.value, notes: '新資料' }));
  const proceed = jest.fn(() => expect(mockPrevent).toBe(false));
  await act(async () => form.markSaved(form.value, proceed));
  expect(proceed).toHaveBeenCalledTimes(1);
});
test('edits made during a pending save remain dirty after the submitted snapshot is saved', async () => {
  await mount();
  const submitted = form.value;
  await act(async () => form.setValue({ ...submitted, notes: '等待期間的新內容' }));
  await act(async () => form.markSaved(submitted));
  expect(mockPrevent).toBe(true);
  expect(form.value.notes).toBe('等待期間的新內容');
});
