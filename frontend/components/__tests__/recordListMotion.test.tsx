Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { RecordListItem, RecordListScope, useRecordListMotion } from '../RecordListMotion';
import { SoftButton, SoftEntrance, SoftField } from '../SoftMotion';
import { cancelAnimation, withSpring } from 'react-native-reanimated';
import { Colors } from '../../constants/Colors';
let mockReduced = false;
jest.mock('../../hooks/usePressFeedback', () => ({ useReducedMotion: () => mockReduced }));
jest.mock('react-native', () => ({ View: 'View', Pressable: 'Button' }));
function List({
  scope = 'u1:p1',
  ids = ['a', 'b', 'c'],
  offset = 0,
}: {
  scope?: string;
  ids?: string[];
  offset?: number;
}) {
  const motion = useRecordListMotion(scope);
  return (
    <RecordListScope motion={motion}>
      {ids.map((id, index) => (
        <RecordListItem key={id} motion={motion} id={id} index={offset + index}>
          <>{id}</>
        </RecordListItem>
      ))}
    </RecordListScope>
  );
}
let screen: ReactTestRenderer;
const rows = () => screen.root.findAllByType('View' as never);
beforeEach(() => {
  mockReduced = false;
  jest.clearAllMocks();
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test('removing a row preserves survivors and their layout transition without replaying entrance', async () => {
  await act(async () => {
    screen = create(<List />);
  });
  expect(rows()[1].props.entering.delayMs).toBe(40);
  expect(rows()[1].props.layout.durationMs).toBe(180);
  expect(rows()[0].props.exiting.durationMs).toBe(120);
  const survivor = rows()[1];
  await act(async () => screen.update(<List ids={['b', 'c']} />));
  expect(rows()[0]).toBe(survivor);
});
test('stagger is bounded and later virtualized rows have no entrance', async () => {
  await act(async () => {
    screen = create(<List ids={['a', 'b', 'c']} offset={6} />);
  });
  expect(rows()[0].props.entering.delayMs).toBe(240);
  expect(rows()[1].props.entering.delayMs).toBe(240);
  expect(rows()[2].props.entering).toBeUndefined();
});
test('virtualized remount of the same record does not replay entrance', async () => {
  await act(async () => {
    screen = create(<List ids={['a']} />);
  });
  await act(async () => screen.update(<List ids={[]} />));
  await act(async () => screen.update(<List ids={['a']} />));
  expect(rows()[0].props.entering).toBeUndefined();
});
test('switching pet/account resets rows quietly, including switching back', async () => {
  await act(async () => {
    screen = create(<List />);
  });
  expect(screen.root.findByType('LayoutAnimationConfig' as never).props.skipExiting).toBe(true);
  await act(async () => screen.update(<List scope="u1:p2" />));
  expect(screen.root.findByType('LayoutAnimationConfig' as never).props.skipEntering).toBe(true);
  expect(rows().every((row) => row.props.entering === undefined)).toBe(true);
  await act(async () => screen.update(<List scope="u2:p1" />));
  await act(async () => screen.update(<List />));
  expect(rows().every((row) => row.props.entering === undefined)).toBe(true);
});
test('enabling reduced motion removes all row animation props immediately', async () => {
  await act(async () => {
    screen = create(<List />);
  });
  mockReduced = true;
  await act(async () => screen.update(<List />));
  for (const row of rows()) {
    expect(row.props.entering).toBeUndefined();
    expect(row.props.exiting).toBeUndefined();
    expect(row.props.layout).toBeUndefined();
  }
});
test('reduced entrance and focus use endpoint styles without starting a spring', async () => {
  mockReduced = true;
  await act(async () => {
    screen = create(
      <>
        <SoftEntrance />
        <SoftField focused invalid={false} />
      </>,
    );
  });
  expect(withSpring).not.toHaveBeenCalled();
  expect(Object.assign({}, ...rows()[0].props.style)).toMatchObject({ opacity: 1 });
  expect(Object.assign({}, ...rows()[1].props.style)).toMatchObject({
    borderColor: Colors.primary,
  });
});
test('spring button keeps caller handlers, releases, and freezes when reduced motion changes', async () => {
  const onPressIn = jest.fn(),
    onPressOut = jest.fn();
  await act(async () => {
    screen = create(<SoftButton onPressIn={onPressIn} onPressOut={onPressOut} />);
  });
  const button = () => screen.root.findByType('Button' as never);
  await act(async () => button().props.onPressIn({}));
  expect(onPressIn).toHaveBeenCalledTimes(1);
  expect(withSpring).toHaveBeenCalledWith(0.98, expect.any(Object));
  jest.clearAllMocks();
  mockReduced = true;
  await act(async () =>
    screen.update(<SoftButton onPressIn={onPressIn} onPressOut={onPressOut} />),
  );
  expect(withSpring).not.toHaveBeenCalled();
  expect(cancelAnimation).toHaveBeenCalled();
  expect(Object.assign({}, ...button().props.style)).toMatchObject({ opacity: 0.82 });
  expect(Object.assign({}, ...button().props.style).transform).toBeUndefined();
  await act(async () => button().props.onPressOut({}));
  expect(onPressOut).toHaveBeenCalledTimes(1);
  expect(Object.assign({}, ...button().props.style).opacity).toBe(1);
});
