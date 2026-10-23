/** 用途：毛孩管理頁，切換、編輯毛孩與進入身分 QR 設定。 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { usePet } from '../../../contexts/PetContext';
import { MainTabParamList, ProfileStackParamList } from '../../../navigation/types';
import { SettingsPage as Page, settingsPalette as palette } from '../components/SettingsLayout';
import { PetIdentityCarousel } from '../../pets/components/PetIdentityCarousel';
import { Colors } from '../../../constants/Colors';
import { SETTINGS_PAGES } from '../settingsPages';

export function PetManagementScreen({
  navigation,
}: NativeStackScreenProps<ProfileStackParamList, 'PetManagement'>) {
  const { pets, selectedPet, selectPet } = usePet();
  const parent = navigation.getParent<BottomTabNavigationProp<MainTabParamList>>();
  return (
    <Page page="PetManagement">
      <PetIdentityCarousel
        pets={pets}
        selectedPet={selectedPet}
        onSelect={selectPet}
        onEdit={(pet) => {
          selectPet(pet.id);
          navigation.navigate('EditPet');
        }}
      />
      <TouchableOpacity
        style={s.primary}
        onPress={() => parent?.navigate('Home', { screen: 'AddPet' })}
      >
        <Text style={s.primaryText}>＋ 加入另一位毛孩</Text>
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={SETTINGS_PAGES.LostPetSettings.title}
        style={s.identityAction}
        onPress={() => navigation.navigate('LostPetSettings')}
      >
        <Ionicons name="qr-code-outline" size={19} color={palette.primary} />
        <Text style={s.identityActionText}>{SETTINGS_PAGES.LostPetSettings.title}</Text>
      </TouchableOpacity>
    </Page>
  );
}

const s = StyleSheet.create({
  primary: {
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: palette.primary,
  },
  primaryText: { color: Colors.onPrimary, fontWeight: '800' },
  identityAction: {
    minHeight: 52,
    marginTop: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  identityActionText: { color: palette.primary, fontWeight: '800' },
});
