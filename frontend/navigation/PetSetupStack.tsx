/** 用途：管理首次登入但尚未建立毛孩時的設定流程。 */
import React from 'react';
import { Alert } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { usePet } from '../contexts/PetContext';
import CreatePetScreen from '../screens/CreatePetScreen';
import { PetData } from '../types';
import { toPetFormData } from '../utils/petFormMapping';
import { PetSetupStackParamList } from './types';

const Stack = createNativeStackNavigator<PetSetupStackParamList>();

export default function PetSetupStack() {
  const { createPet } = usePet();

  const handleCreate = async (data: PetData) => {
    try {
      await createPet(toPetFormData(data));
      return true;
    } catch (error) {
      Alert.alert('新增失敗', (error as Error).message);
      return false;
    }
  };

  return (
    <Stack.Navigator id="PetSetupStack">
      <Stack.Screen name="CreatePet" options={{ title: '建立毛孩資料', headerBackVisible: false }}>
        {() => <CreatePetScreen onSubmit={handleCreate} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
