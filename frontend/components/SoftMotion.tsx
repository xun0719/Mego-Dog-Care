import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TouchableOpacityProps, ViewProps } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { useReducedMotion } from '../hooks/usePressFeedback';

const spring = { damping: 24, stiffness: 300, mass: 0.6, overshootClamping: true };
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SoftEntrance({ children, style, ...props }: ViewProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(1);
  const played = useRef(false);
  useEffect(() => {
    cancelAnimation(opacity);
    if (reduced) opacity.value = 1;
    else if (!played.current) {
      played.current = true;
      opacity.value = 0.5;
      opacity.value = withSpring(1, spring);
    }
    return () => cancelAnimation(opacity);
  }, [opacity, reduced]);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: reduced ? 1 : opacity.value }));
  return (
    <Animated.View {...props} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export function SoftField({
  focused,
  invalid,
  style,
  ...props
}: ViewProps & { focused: boolean; invalid: boolean }) {
  const reduced = useReducedMotion();
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    cancelAnimation(focus);
    focus.value = reduced ? (focused ? 1 : 0) : withSpring(focused ? 1 : 0, spring);
    return () => cancelAnimation(focus);
  }, [focus, focused, reduced]);
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: invalid
      ? Colors.danger
      : reduced
        ? focused
          ? Colors.primary
          : Colors.border
        : interpolateColor(focus.value, [0, 1], [Colors.border, Colors.primary]),
  }));
  return <Animated.View {...props} style={[style, animatedStyle]} />;
}

/** Keep the existing API, including caller press handlers and disabled behavior. */
export function SoftButton({ style, onPressIn, onPressOut, ...props }: TouchableOpacityProps) {
  const reduced = useReducedMotion();
  const [pressed, setPressed] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const active = pressed && !props.disabled;
  useEffect(() => {
    cancelAnimation(scale);
    cancelAnimation(opacity);
    scale.value = reduced ? 1 : withSpring(active ? 0.98 : 1, spring);
    opacity.value = reduced ? (active ? 0.82 : 1) : withSpring(active ? 0.82 : 1, spring);
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [active, opacity, reduced, scale]);
  const animatedStyle = useAnimatedStyle(() =>
    reduced
      ? { opacity: active ? 0.82 : 1 }
      : { opacity: opacity.value, transform: [{ scale: scale.value }] },
  );
  return (
    <AnimatedPressable
      {...props}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
    />
  );
}
