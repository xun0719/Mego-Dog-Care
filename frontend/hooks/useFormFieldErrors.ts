/**
 * 用途：表單欄位錯誤的共用狀態與捲動定位。
 * 取代 Alert 式驗證：錯誤顯示在欄位下方（FieldError），並自動捲到第一個出錯的欄位。
 * 來源是 MedicalVisitFormScreen 既有的做法，抽出供其他表單共用。
 */
import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { KeyboardAwareScrollViewRef } from 'react-native-keyboard-controller';
import { useReducedMotion } from './usePressFeedback';
import { hapticError } from '../utils/haptics';

/** 捲動時在欄位上方保留的留白，讓標籤不會貼齊畫面頂端。 */
const SCROLL_OFFSET = 16;

export type FieldErrors<Key extends string> = Partial<Record<Key, string>>;

/** KeyboardAwareScrollView 與一般 ScrollView 都符合，表單兩種都有在用。 */
export type FormScrollRef = {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
};

export function useFormFieldErrors<
  Key extends string,
  Ref extends FormScrollRef = KeyboardAwareScrollViewRef,
>() {
  const reducedMotion = useReducedMotion();
  const [errors, setErrors] = useState<FieldErrors<Key>>({});
  const scrollRef = useRef<Ref>(null);
  const positions = useRef<Record<string, number>>({});

  /** 掛在欄位容器的 onLayout 上，記下它在捲動容器內的位置。 */
  const position = useCallback(
    (key: Key) => (event: LayoutChangeEvent) => {
      positions.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToField = useCallback(
    (key: Key) => {
      // 等版面更新後再捲動；測試環境不一定有 requestAnimationFrame。
      const afterLayout =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (callback: () => void) => callback();
      afterLayout(() =>
        scrollRef.current?.scrollTo({
          y: Math.max((positions.current[key] || 0) - SCROLL_OFFSET, 0),
          animated: !reducedMotion,
        }),
      );
    },
    [reducedMotion],
  );

  /**
   * 設定錯誤並捲到第一個出錯的欄位。
   * order 指定欄位在畫面上的先後，決定「第一個」是哪一個。
   * 回傳 true 代表沒有錯誤，可以繼續送出。
   */
  const showErrors = useCallback(
    (next: FieldErrors<Key>, order: readonly Key[]) => {
      setErrors(next);
      const first = order.find((key) => next[key]);
      if (!first) return true;
      // 錯誤在欄位下方，不一定在視線內；震一下讓使用者知道送出被擋下了。
      hapticError();
      scrollToField(first);
      return false;
    },
    [scrollToField],
  );

  /** 使用者開始修改某欄位時清掉該欄的錯誤，不必等到再次送出。 */
  const clearError = useCallback((key: Key) => {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }, []);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, scrollRef, position, showErrors, clearError, clearErrors, setErrors };
}

export default useFormFieldErrors;
