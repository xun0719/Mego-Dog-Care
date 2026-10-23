Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { ScreenPageHeader } from '../../components/ScreenPageHeader';
import StoolHealthEventScreen from '../StoolHealthEventScreen';
import VomitingHealthEventScreen from '../VomitingHealthEventScreen';
import ObservationHealthEventScreen from '../ObservationHealthEventScreen';
import CreateHealthEventScreen from '../CreateHealthEventScreen';
import { getHealthEvent } from '../../services/healthEventService';

const mockPet = { id: 'p1', name: '小米' };
const mockNavigation = { goBack: jest.fn(), popToTop: jest.fn(), replace: jest.fn() };
const mockDirtyRef = { current: false };
const mockMarkSaved = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Text: 'Text',
  View: 'View',
  TextInput: 'Input',
  ActivityIndicator: 'Spinner',
  TouchableOpacity: 'Button',
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('../../components/SoftMotion', () => ({ SoftButton: 'Button' }));
jest.mock('../../hooks/usePressFeedback', () => ({ useReducedMotion: () => true }));
jest.mock('../../utils/haptics', () => ({ hapticError: jest.fn() }));
jest.mock('../../hooks/useFormPet', () => ({ useFormPet: () => mockPet }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));
jest.mock('../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({ dirtyRef: mockDirtyRef, markSaved: mockMarkSaved }),
}));
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/AttachmentPicker', () => 'Attachments');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/KeyboardAwareScrollView', () => 'ScrollView');
jest.mock('../../services/healthEventService', () => ({
  getHealthEvent: jest.fn(),
  createHealthEvent: jest.fn(),
  updateHealthEvent: jest.fn(),
}));

let screen: ReactTestRenderer;
const cases = [
  ['排便異常', StoolHealthEventScreen, {}, '記錄排便異常'],
  ['嘔吐', VomitingHealthEventScreen, {}, '記錄嘔吐'],
  ['食慾下降', ObservationHealthEventScreen, { type: 'low_appetite' }, '記錄食慾下降'],
  ['精神下降', ObservationHealthEventScreen, { type: 'low_energy' }, '記錄精神下降'],
  ['喝水異常', ObservationHealthEventScreen, { type: 'abnormal_drinking' }, '記錄喝水異常'],
  ['其他', CreateHealthEventScreen, { type: 'other', label: '其他' }, '其他'],
] as const;
type ScreenComponent = React.ComponentType<Record<string, unknown>>;
const mount = async (Component: unknown, params: object) => {
  await act(async () => {
    screen = create(
      React.createElement(Component as ScreenComponent, {
        navigation: mockNavigation,
        route: { params },
      }),
    );
  });
};
const back = () =>
  screen.root.find(
    (node) => node.type === ('Button' as never) && node.props.accessibilityLabel === '返回上一頁',
  );
beforeEach(() => {
  jest.clearAllMocks();
  mockDirtyRef.current = false;
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each(cases)(
  '%s uses one shared heading and the original back action',
  async (_name, Component, params, title) => {
    await mount(Component, params);
    expect(screen.root.findAllByType(ScreenPageHeader)).toHaveLength(1);
    expect(screen.root.findByType(ScreenPageHeader).props.title).toBe(title);
    expect(
      screen.root.findAll(
        (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
      ),
    ).toHaveLength(1);
    await act(async () => back().props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  },
);

test.each(cases.slice(0, 5))(
  '%s keeps a back action while loading and after a failed request',
  async (_name, Component, params) => {
    let reject!: (error: Error) => void;
    (getHealthEvent as jest.Mock).mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    await mount(Component, { ...params, eventId: 'event-1' });
    expect(screen.root.findAllByType('Spinner' as never)).toHaveLength(1);
    await act(async () => back().props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('暫時無法讀取紀錄')));
    expect(screen.root.findAllByType('Spinner' as never)).toHaveLength(0);
    expect(screen.root.findAllByType(ScreenPageHeader)).toHaveLength(1);
    expect(
      screen.root.findAll(
        (node) => node.type === ('Text' as never) && node.props.children === '暫時無法讀取紀錄',
      ),
    ).toHaveLength(1);
    await act(async () => back().props.onPress());
    expect(mockNavigation.goBack).toHaveBeenCalledTimes(2);
  },
);
