const { jest } = require('@jest/globals');
// Unit tests model endpoint values and animation policy, not native frame timing.
const React = require('react');
const Native = require('react-native');
function builder(name, options = {}) {
  return {
    name,
    ...options,
    duration(value) {
      return builder(name, { ...options, durationMs: value });
    },
    delay(value) {
      return builder(name, { ...options, delayMs: value });
    },
  };
}
module.exports = {
  __esModule: true,
  default: {
    View: Native.View || 'View',
    FlatList: Native.FlatList || 'FlatList',
    createAnimatedComponent: (component) => component,
  },
  useSharedValue: (value) => React.useRef({ value }).current,
  useAnimatedStyle: (callback) =>
    new Proxy(
      {},
      {
        ownKeys: () => Object.keys(callback()),
        getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
        get: (_target, name) => callback()[name],
      },
    ),
  interpolateColor: (value, _inputs, outputs) => outputs[value >= 0.5 ? 1 : 0],
  withSpring: jest.fn((value) => value),
  withTiming: jest.fn((value) => value),
  withSequence: (...values) => values.at(-1),
  cancelAnimation: jest.fn(),
  FadeInDown: builder('FadeInDown'),
  FadeOut: builder('FadeOut'),
  LinearTransition: builder('LinearTransition'),
  LayoutAnimationConfig: ({ children, ...props }) =>
    React.createElement('LayoutAnimationConfig', props, children),
};
