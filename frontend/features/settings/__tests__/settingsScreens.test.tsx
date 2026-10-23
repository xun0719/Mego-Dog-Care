Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, __DEV__: false });
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import { AccountInfoScreen } from '../screens/AccountInfoScreen';
import { AIUsageScreen } from '../screens/AIUsageScreen';
import { AIDataUseInfoScreen } from '../screens/AIDataUseInfoScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { TermsOfUseScreen } from '../screens/TermsOfUseScreen';
import { PetManagementScreen } from '../screens/PetManagementScreen';
import HomeThemeScreen from '../../../screens/HomeThemeScreen';
import ExportCenterScreen from '../../../screens/ExportCenterScreen';
import SettingsHomeScreen from '../../../screens/SettingsHomeScreen';
import PetMemorialScreen from '../../pets/screens/PetMemorialScreen';
import { EditPetScreen } from '../../../screens/ManagePetScreen';
import { getLostProfile } from '../../../services/lostPetService';
import { DEFAULT_PROFILE } from '../../pet-identity/identityFields';
import { getAIUsage, getAIUsageHistory } from '../../../services/aiService';
import { SETTINGS_PAGES, type SettingsPageKey } from '../settingsPages';

jest.mock('react-native', () => ({
  ...Object.fromEntries(
    [
      'Text',
      'View',
      'ScrollView',
      'TouchableOpacity',
      'Image',
      'ActivityIndicator',
      'Pressable',
      'TextInput',
      'Modal',
      'KeyboardAvoidingView',
      'Switch',
    ].map((name) => [name, name]),
  ),
  StyleSheet: { create: (value: object) => value },
  Platform: { OS: 'ios' },
  Alert: { alert: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Icon' }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  navigate: mockNavigate,
  getParent: () => ({ navigate: mockNavigate }),
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useIsFocused: () => true,
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('../../../components/SoftMotion', () => ({ SoftButton: 'SoftButton' }));
jest.mock('../../../components/ScreenState', () => 'ScreenState');
jest.mock('../../../components/AppButton', () => ({ AppButton: 'AppButton' }));
jest.mock('../../../components/DatePickerField', () => 'DatePickerField');
jest.mock('../../../components/KeyboardAwareScrollView', () => 'KeyboardAwareScrollView');
jest.mock('../../../components/SupplementalNotesField', () => 'SupplementalNotesField');
jest.mock('../../../screens/PetFormScreen', () => 'PetFormScreen');
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('../../../assets/home-scene/logo.webp', () => 1);
jest.mock('../../../components/AuthenticatedPetAvatar', () => 'Avatar');
jest.mock('../../../components/navigation/useTabContentBottomPadding', () => ({
  useTabContentBottomPadding: () => 124,
}));
const mockMarkSaved = jest.fn();
jest.mock('../../../hooks/useFormUnsavedChangesGuard', () => ({
  useFormUnsavedChangesGuard: () => ({
    dirtyRef: require('react').useRef(false),
    markSaved: mockMarkSaved,
  }),
}));
jest.mock('../../../services/lostPetService', () => ({ getLostProfile: jest.fn() }));
jest.mock('../../../services/careNotificationSync', () => ({ syncCareNotifications: jest.fn() }));
jest.mock('../../../services/aiService', () => ({
  getAIUsage: jest.fn(),
  getAIUsageHistory: jest.fn(),
}));
jest.mock('../../../services/exportService', () => ({ createExport: jest.fn() }));
jest.mock('../../../services/exportTrackingService', () => ({
  readExportTracking: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    session: { userId: 'u1', email: 'owner@example.com' },
    deleteAccount: jest.fn(),
  }),
}));
const mockPet = { id: 'p1', name: '毛孩 A', memorial: false };
let mockSelectedPet: typeof mockPet | null = mockPet;
jest.mock('../../../contexts/PetContext', () => ({
  usePet: () => ({
    pets: mockSelectedPet ? [mockSelectedPet] : [],
    selectedPet: mockSelectedPet,
    selectPet: jest.fn(),
  }),
}));
jest.mock('../../../hooks/useFormPet', () => ({ useFormPet: () => mockSelectedPet }));
jest.mock('../../../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { homeTheme: 'morning-home' }, update: jest.fn() }),
}));
jest.mock('../../../constants/HomeThemes', () => ({
  HOME_THEME_IDS: ['morning-home'],
  HOME_THEMES: {
    'morning-home': {
      id: 'morning-home',
      title: '晨光小屋',
      description: '溫暖的場景',
      accent: '#b75',
      background: 1,
    },
  },
}));
jest.mock('../../pets/components/PetIdentityCarousel', () => ({
  PetIdentityCarousel: 'PetIdentityCarousel',
}));
jest.mock('../components/SettingsHomeRows', () => ({
  SettingsHomeSection: 'Section',
  SettingsHomeRow: 'Row',
}));

let screen: ReactTestRenderer;
let identityScreens: typeof import('../../pet-identity/screens/PetIdentityScreens');
beforeAll(() => {
  const previous = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'https://example.com';
  identityScreens = require('../../pet-identity/screens/PetIdentityScreens');
  if (previous === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = previous;
});
const mount = async (element: React.ReactElement) => {
  await act(async () => {
    screen = create(element);
  });
};
const assertHeader = async (page: SettingsPageKey, title: string = SETTINGS_PAGES[page].title) => {
  const headings = screen.root.findAll(
    (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
  );
  expect(headings).toHaveLength(1);
  expect(headings[0].props.children).toBe(title);
  const back = screen.root.findByType('SoftButton' as never);
  await act(async () => back.props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSelectedPet = mockPet;
  (getAIUsage as jest.Mock).mockResolvedValue({ used: 2, unlimited: true });
  (getAIUsageHistory as jest.Mock).mockResolvedValue({ dailyUsage: [], totalUsed: 2 });
  (getLostProfile as jest.Mock).mockResolvedValue({
    profile: { ...DEFAULT_PROFILE, enabled: true, publicToken: 'test-token' },
  });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});

test.each([
  ['AccountInfo', <AccountInfoScreen />],
  ['AIUsage', <AIUsageScreen />],
  ['AIDataUseInfo', <AIDataUseInfoScreen />],
  ['About', <AboutScreen />],
  ['PrivacyPolicy', <PrivacyPolicyScreen />],
  ['TermsOfUse', <TermsOfUseScreen />],
  [
    'PetManagement',
    <PetManagementScreen
      {...({ navigation: mockNavigation } as unknown as React.ComponentProps<
        typeof PetManagementScreen
      >)}
    />,
  ],
  ['HomeTheme', <HomeThemeScreen />],
  ['ExportCenter', <ExportCenterScreen />],
] as [SettingsPageKey, React.ReactElement][])(
  '%s renders one shared heading and delegates back without changing its contents',
  async (page, element) => {
    await mount(element);
    await assertHeader(page);
  },
);

test('account keeps Email and the first delete confirmation behind the new heading', async () => {
  await mount(<AccountInfoScreen />);
  expect(JSON.stringify(screen.toJSON())).toContain('owner@example.com');
  const button = screen.root.findByProps({ accessibilityLabel: '永久刪除帳號及所有相關資料' });
  await act(async () => button.props.onPress());
  expect(Alert.alert).toHaveBeenCalledWith('永久刪除帳號？', expect.any(String), expect.any(Array));
});

test.each(['loading', 'error'])(
  'AI usage retains the same heading and back action during %s',
  async (state) => {
    if (state === 'loading') {
      (getAIUsage as jest.Mock).mockReturnValue(new Promise(() => {}));
      (getAIUsageHistory as jest.Mock).mockReturnValue(new Promise(() => {}));
    } else {
      (getAIUsage as jest.Mock).mockRejectedValue(new Error('offline'));
      (getAIUsageHistory as jest.Mock).mockRejectedValue(new Error('offline'));
    }
    await mount(<AIUsageScreen />);
    await assertHeader('AIUsage');
    expect(
      screen.root.findByType('ScreenState' as never).props[
        state === 'loading' ? 'loading' : 'error'
      ],
    ).toBe(true);
  },
);

test.each(['active', 'memorial', 'missing'])(
  'memorial %s view owns its safe area and a visible way back',
  async (state) => {
    mockSelectedPet = state === 'missing' ? null : { ...mockPet, memorial: state === 'memorial' };
    await mount(<PetMemorialScreen navigation={mockNavigation} />);
    await assertHeader('PetMemorial', state === 'active' ? '移到回憶' : '回憶');
    expect(screen.root.findByType('SafeAreaView' as never).props.edges).toEqual([
      'top',
      'left',
      'right',
    ]);
  },
);

test('pet management keeps edit, switching, add and QR destinations', async () => {
  await mount(
    <PetManagementScreen
      {...({ navigation: mockNavigation } as unknown as React.ComponentProps<
        typeof PetManagementScreen
      >)}
    />,
  );
  const carousel = screen.root.findByType('PetIdentityCarousel' as never);
  await act(async () => carousel.props.onEdit(mockPet));
  expect(mockNavigate).toHaveBeenCalledWith('EditPet');
  await act(async () =>
    screen.root
      .findByProps({ accessibilityLabel: SETTINGS_PAGES.LostPetSettings.title })
      .props.onPress(),
  );
  expect(mockNavigate).toHaveBeenCalledWith('LostPetSettings');
});

test('all setting entry names match their destination headings', async () => {
  await mount(
    <SettingsHomeScreen
      {...({ navigation: mockNavigation } as unknown as React.ComponentProps<
        typeof SettingsHomeScreen
      >)}
    />,
  );
  const pages = [
    'AccountInfo',
    'PetManagement',
    'NotificationSettings',
    'HomeTheme',
    'AIDataUseInfo',
    'AIUsage',
    'ExportCenter',
    'About',
    'PrivacyPolicy',
    'TermsOfUse',
  ] as SettingsPageKey[];
  for (const page of pages) {
    const row = screen.root
      .findAllByType('Row' as never)
      .find((node) => node.props.title === SETTINGS_PAGES[page].title);
    expect(row).toBeDefined();
    await act(async () => row!.props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith(page);
  }
  expect(screen.root.findAllByType('SoftButton' as never)).toHaveLength(0);
});

test.each(['LostPetSettings', 'LostPetQr'] as const)(
  '%s normal, loading, error and missing-data views share their destination name',
  async (page) => {
    const Component =
      page === 'LostPetSettings'
        ? identityScreens.LostPetSettingsScreen
        : identityScreens.LostPetQrScreen;
    const element = (
      <Component
        {...({ navigation: mockNavigation } as unknown as React.ComponentProps<typeof Component>)}
      />
    );
    for (const state of ['normal', 'loading', 'error', 'missing']) {
      mockGoBack.mockClear();
      if (state === 'loading') (getLostProfile as jest.Mock).mockReturnValue(new Promise(() => {}));
      if (state === 'error') (getLostProfile as jest.Mock).mockRejectedValue(new Error('offline'));
      if (state === 'missing') mockSelectedPet = null;
      await mount(element);
      await assertHeader(page);
      if (state === 'normal') {
        if (page === 'LostPetQr')
          expect(screen.root.findAllByType('QRCode' as never)).toHaveLength(1);
        else expect(screen.root.findAllByType('KeyboardAwareScrollView' as never)).toHaveLength(1);
      }
      await act(async () => screen.unmount());
    }
  },
);

test('editing a missing pet still offers a way back instead of a blank screen', async () => {
  mockSelectedPet = null;
  await mount(<EditPetScreen navigation={mockNavigation} />);
  expect(
    screen.root.findAll(
      (node) => node.type === ('Text' as never) && node.props.accessibilityRole === 'header',
    )[0].props.children,
  ).toBe('編輯毛孩資料');
  await act(async () => screen.root.findByType('SoftButton' as never).props.onPress());
  expect(mockGoBack).toHaveBeenCalledTimes(1);
});
