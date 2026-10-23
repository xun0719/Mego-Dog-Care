/**
 * 用途：統一播放 Lottie 向量動畫，集中處理減少動態、背景暫停與無障礙語意。
 * 使用頁：LoginScreen；之後新增 Lottie 的畫面也應使用此元件。
 */
import React, { useEffect, useState } from 'react';
import { AppState, View, type StyleProp, type ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReducedMotion } from '../hooks/usePressFeedback';

type LottieArtProps = {
  source: unknown;
  style?: StyleProp<ViewStyle>;
  /** 外部條件（例如送出中）；為 false 時停在首幀。 */
  playing?: boolean;
  loop?: boolean;
  speed?: number;
  /** 有標籤才朗讀；省略代表純裝飾，輔助技術會略過。 */
  accessibilityLabel?: string;
};

export function LottieArt({
  source,
  style,
  playing = true,
  loop = true,
  speed = 1,
  accessibilityLabel,
}: LottieArtProps) {
  const reducedMotion = useReducedMotion();
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);

  // 減少動態、進背景或外部停用時都停在首幀，維持版面不跳動。
  const animating = playing && !reducedMotion && appActive;
  const decorative = accessibilityLabel === undefined;
  return (
    <View
      style={style}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <LottieView
        source={source as React.ComponentProps<typeof LottieView>['source']}
        style={styles.fill}
        resizeMode="contain"
        autoPlay={animating}
        loop={animating && loop}
        speed={speed}
        progress={animating ? undefined : 0}
      />
    </View>
  );
}

const styles = { fill: { width: '100%', height: '100%' } } as const;
