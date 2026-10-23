import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useNavigation, usePreventRemove } from '@react-navigation/native';

const activeGuards = new Map<symbol, (proceed: () => void) => void>();

/** Tab switches do not remove a route, so the tab navigator consults the focused form. */
export function guardTabNavigation(proceed: () => void): boolean {
  const activeGuard = [...activeGuards.values()].at(-1);
  if (!activeGuard) return false;
  activeGuard(proceed);
  return true;
}

export function useUnsavedChangesGuard(dirty: boolean, onDiscard: () => void, submitting = false) {
  const navigation = useNavigation();
  const [discarding, setDiscarding] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const dialogOpen = useRef(false);
  const guardKey = useRef(Symbol('form-guard')).current;
  const confirm = useCallback(
    (proceed: () => void) => {
      if (dialogOpen.current) return;
      dialogOpen.current = true;
      if (submitting) {
        Alert.alert(
          '儲存正在處理',
          '請求已送出，結果尚未確認。請等待處理完成；離開畫面不能取消已送出的儲存。',
          [
            {
              text: '繼續等待',
              onPress: () => {
                dialogOpen.current = false;
              },
            },
          ],
          { cancelable: false },
        );
        return;
      }
      Alert.alert(
        '尚未儲存修改',
        '離開後，這次修改將不會儲存。',
        [
          {
            text: '繼續編輯',
            style: 'cancel',
            onPress: () => {
              dialogOpen.current = false;
            },
          },
          {
            text: '放棄變更',
            style: 'destructive',
            onPress: () => {
              dialogOpen.current = false;
              pending.current = proceed;
              onDiscard();
              setDiscarding(true);
            },
          },
        ],
        { cancelable: false },
      );
    },
    [onDiscard, submitting],
  );

  usePreventRemove((dirty || submitting) && !discarding, ({ data }) =>
    confirm(() => navigation.dispatch(data.action)),
  );
  useFocusEffect(
    useCallback(() => {
      if (!(dirty || submitting) || discarding) return;
      activeGuards.set(guardKey, confirm);
      return () => {
        activeGuards.delete(guardKey);
      };
    }, [confirm, dirty, submitting, discarding, guardKey]),
  );
  useEffect(() => {
    if (!discarding) return;
    const proceed = pending.current;
    pending.current = null;
    proceed?.();
    setDiscarding(false);
  }, [discarding]);
}
