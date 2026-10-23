import React, { forwardRef } from 'react';
import { Platform } from 'react-native';
import {
  KeyboardAwareScrollView as ControllerAwareScrollView,
  type KeyboardAwareScrollViewProps,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';

/** Shared keyboard-aware container for long forms and screens with text inputs. */
const KeyboardAwareScrollView = forwardRef<
  KeyboardAwareScrollViewRef,
  KeyboardAwareScrollViewProps
>(function KeyboardAwareScrollView(
  {
    children,
    keyboardShouldPersistTaps = 'handled',
    keyboardDismissMode = Platform.OS === 'ios' ? 'interactive' : 'on-drag',
    ...scrollViewProps
  },
  ref,
) {
  return (
    <ControllerAwareScrollView
      {...scrollViewProps}
      ref={ref}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode={keyboardDismissMode}
    >
      {children}
    </ControllerAwareScrollView>
  );
});

export default KeyboardAwareScrollView;
