Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { VaccinationFormScreen } from '../../features/vaccinations/screens/VaccinationFormScreen';
import { DewormingFormScreen } from '../../features/dewormings/screens/DewormingFormScreen';

jest.mock('react-native', () => ({
  Text: 'Text',
  TextInput: 'Input',
  View: 'View',
  Switch: 'Switch',
  TouchableOpacity: 'Button',
  Alert: { alert: jest.fn() },
  StyleSheet: { create: (styles: object) => styles },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({}),
  useRoute: () => ({ params: {} }),
}));
jest.mock('../../components/ScreenPageHeader', () => ({
  ScreenPageHeader: 'Header',
  ScreenPageFrame: 'Frame',
}));
jest.mock('../../components/KeyboardAwareScrollView', () => 'Scroll');
jest.mock('../../components/SupplementalNotesField', () => 'Notes');
jest.mock('../../components/DatePickerField', () => 'DatePicker');
jest.mock('../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 96,
}));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ session: { userId: 'u1' } }) }));
jest.mock('../../contexts/PetContext', () => ({ usePet: () => ({ pets: [] }) }));
jest.mock('../../hooks/useFormPet', () => ({ useFormPet: () => ({ id: 'p1', name: 'Kuro' }) }));
jest.mock('../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({ markSaved: jest.fn() }),
}));
jest.mock('../../services/careNotificationSync', () => ({ syncCareNotifications: jest.fn() }));
jest.mock('../../services/vaccinationService', () => ({
  createVaccination: jest.fn(),
  updateVaccination: jest.fn(),
}));
jest.mock('../../services/dewormingService', () => ({
  createDeworming: jest.fn(),
  updateDeworming: jest.fn(),
}));

let screen: ReactTestRenderer;
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
test.each([
  ['疫苗', VaccinationFormScreen, '選擇下次接種日期'],
  ['驅蟲', DewormingFormScreen, '選擇下次驅蟲日期'],
] as const)(
  '%s keeps the optional date empty and clearing it disables the reminder',
  async (label, Component, placeholder) => {
    await act(async () => {
      screen = create(<Component />);
    });
    const pickers = () => screen.root.findAllByType('DatePicker' as never);
    const next = () => pickers().find((node) => node.props.placeholder === placeholder)!;
    const action = label === '疫苗' ? '接種' : '驅蟲';
    const unavailable = `請先選擇下次${action}日期。\n選好後即可開啟提醒。`;
    expect(next().props.label).toBe(`下次${action}日期（選填）`);
    expect(next().props.hint).toBe(
      `不可早於${label === '疫苗' ? '接種' : '使用'}日期，可選同一天。`,
    );
    expect(screen.root.findByType('Switch' as never).props.accessibilityHint).toBe(unavailable);
    expect(next().props.value).toBeUndefined();
    expect(pickers()[0].props.onClear).toBeUndefined();
    await act(async () => next().props.onChange(new Date('2030-10-20T12:00:00+08:00')));
    expect(next().props.value).toBeInstanceOf(Date);
    expect(screen.root.findByType('Switch' as never).props.accessibilityHint).toBe(
      `加入下次${action}提醒。\n手機通知依設定與系統權限排定。`,
    );
    await act(async () => screen.root.findByType('Switch' as never).props.onValueChange(true));
    expect(screen.root.findByType('Switch' as never).props.value).toBe(true);
    await act(async () => next().props.onClear());
    expect(next().props.value).toBeUndefined();
    expect(screen.root.findByType('Switch' as never).props.value).toBe(false);
    expect(screen.root.findByType('Switch' as never).props.disabled).toBe(true);
    expect(screen.root.findByType('Switch' as never).props.accessibilityHint).toBe(unavailable);
  },
);
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
