import React, { useEffect, useRef, type ReactNode } from 'react';
import Animated, {
  FadeInDown,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import { useReducedMotion } from '../hooks/usePressFeedback';

/** Animate this screen's first owner only; switching accounts/pets stays quiet. */
export function useRecordListMotion(scope: string) {
  const reduced = useReducedMotion();
  const owner = useRef(scope);
  const switched = useRef(false);
  const seen = useRef(new Set<string>());
  if (owner.current !== scope) {
    owner.current = scope;
    switched.current = true;
    seen.current.clear();
  }
  return {
    scope,
    reduced,
    suppressEntering: reduced || switched.current,
    seen: seen.current,
    layout: reduced ? undefined : LinearTransition.duration(180),
    exiting: reduced ? undefined : FadeOut.duration(120),
  };
}
type Motion = ReturnType<typeof useRecordListMotion>;
export function RecordListScope({ motion, children }: { motion: Motion; children: ReactNode }) {
  return (
    <LayoutAnimationConfig key={motion.scope} skipEntering={motion.suppressEntering} skipExiting>
      {children}
    </LayoutAnimationConfig>
  );
}
export function RecordListItem({
  motion,
  id,
  index,
  children,
}: {
  motion: Motion;
  id: string;
  index: number;
  children: ReactNode;
}) {
  // Virtualized rows do not replay their entrance when remounted by scrolling.
  const enter = useRef(!motion.suppressEntering && !motion.seen.has(id) && index < 8).current;
  useEffect(() => {
    motion.seen.add(id);
  }, [id, motion.seen]);
  return (
    <Animated.View
      entering={
        !motion.suppressEntering && enter
          ? FadeInDown.duration(180).delay(Math.min(index * 40, 240))
          : undefined
      }
      exiting={motion.exiting}
      layout={motion.layout}
    >
      {children}
    </Animated.View>
  );
}
