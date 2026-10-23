import { useFormPet } from '../hooks/useFormPet';
/** 用途：將既有毛孩表單接入 React Navigation，支援新增與編輯。 */
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { usePet } from '../contexts/PetContext';
import { HomeStackParamList } from '../navigation/types';
import PetFormScreen from './PetFormScreen';
import { PetData } from '../types';
import { toPetFormData } from '../utils/petFormMapping';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { Colors } from '../constants/Colors';
import { Radius, Spacing } from '../constants/Layout';
import { Type } from '../constants/Typography';
import { ScreenPageState } from '../components/ScreenPageHeader';
import ScreenState from '../components/ScreenState';

type AddProps = NativeStackScreenProps<HomeStackParamList, 'AddPet'>;
type EditProps = { navigation: { goBack: () => void; navigate: (route: 'PetMemorial') => void } };

export function AddPetScreen({ navigation }: AddProps) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { createPet } = usePet();
  const submit = async (data: PetData) => {
    try {
      await createPet(toPetFormData(data));
      return true;
    } catch (error) {
      Alert.alert('新增失敗', (error as Error).message);
      return false;
    }
  };
  return (
    <PetFormScreen
      pageHeader
      title="新增毛孩"
      submitLabel="儲存毛孩資料"
      bottomContentPadding={bottomContentPadding}
      onSubmit={submit}
      onSaved={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
    />
  );
}

export function EditPetScreen({ navigation }: EditProps) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { updateSelectedPet } = usePet();
  const selectedPet = useFormPet();
  if (!selectedPet)
    return (
      <ScreenPageState
        title="編輯毛孩資料"
        description="查看與更新毛孩的基本資料"
        icon="paw"
        iconColor={Colors.primaryDecoration}
        iconBackground={Colors.primarySoft}
      >
        <ScreenState text="請先選擇要編輯的毛孩。" />
      </ScreenPageState>
    );
  const initialData: PetData = {
    name: selectedPet.name,
    gender: selectedPet.gender,
    breedType: selectedPet.breedType ?? 'unknown',
    breed: selectedPet.breed ?? '',
    birthday: selectedPet.birthDate ?? '',
    arrivalDate: selectedPet.adoptionDate ?? '',
    avatarUri: '',
    avatarAttachmentId: selectedPet.avatarAttachmentId,
    neutered: selectedPet.neutered,
    allergies: selectedPet.allergies ?? '',
    chronicDiseases: selectedPet.chronicDiseases ?? '',
    microchipNumber: selectedPet.microchipNumber ?? '',
    coatColor: selectedPet.coatColor ?? '',
    distinctiveFeatures: selectedPet.distinctiveFeatures ?? '',
  };
  const submit = async (data: PetData) => {
    try {
      await updateSelectedPet(toPetFormData(data), selectedPet.id);
      return true;
    } catch (error) {
      Alert.alert('更新失敗', (error as Error).message);
      return false;
    }
  };
  return (
    <PetFormScreen
      pageHeader
      title="編輯毛孩資料"
      submitLabel="儲存變更"
      bottomContentPadding={bottomContentPadding}
      initialData={initialData}
      onSubmit={submit}
      onSaved={() => navigation.goBack()}
      onCancel={() => navigation.goBack()}
      footer={
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={selectedPet.memorial ? '查看回憶' : `把${selectedPet.name}移到回憶`}
          style={styles.memorialEntry}
          onPress={() => navigation.navigate('PetMemorial')}
        >
          <Ionicons name="flower-outline" size={20} color={Colors.memorial} />
          <View style={styles.memorialCopy}>
            <Text style={styles.memorialTitle}>
              {selectedPet.memorial ? '在回憶中' : '移到回憶'}
            </Text>
            <Text style={styles.memorialHint}>
              {selectedPet.memorial
                ? '查看紀念頁，或在誤設時還原'
                : '毛孩離開後，紀錄會保留供回顧，不再新增'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>
      }
    />
  );
}

const styles = StyleSheet.create({
  memorialEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    backgroundColor: Colors.memorialSoft,
  },
  memorialCopy: { flex: 1 },
  memorialTitle: { color: Colors.text, fontSize: Type.body, fontWeight: '800' },
  memorialHint: { marginTop: 2, color: Colors.subtext, fontSize: Type.footnote, lineHeight: 18 },
});
