import { useEffect, useState } from 'react';
import { AccessibilityInfo, type ViewStyle } from 'react-native';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    AccessibilityInfo?.isReduceMotionEnabled?.()
      .then((value) => {
        if (active && !changed) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo?.addEventListener?.('reduceMotionChanged', (value) => {
      changed = true;
      setReduced(value);
    });
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reduced;
}

export function pressFeedbackStyle(
  pressed: boolean,
  reducedMotion: boolean,
  disabled = false,
): ViewStyle {
  if (!pressed || disabled) return {};
  return reducedMotion ? { opacity: 0.82 } : { opacity: 0.82, transform: [{ scale: 0.98 }] };
}

export function usePressFeedback() {
  const reduced = useReducedMotion();
  return (pressed: boolean, disabled = false) => pressFeedbackStyle(pressed, reduced, disabled);
}
