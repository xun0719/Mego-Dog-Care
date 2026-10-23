import { useFormPet } from '../../../hooks/useFormPet';
import { syncCareNotifications } from '../../../services/careNotificationSync';
/** 用途：把毛孩移到回憶，或在誤設時還原；所有紀錄都會保留。 */
import React, { useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';

import { AppButton } from '../../../components/AppButton';
import DatePickerField from '../../../components/DatePickerField';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { FieldError } from '../../../components/FieldError';
import { useFormFieldErrors } from '../../../hooks/useFormFieldErrors';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import { Colors } from '../../../constants/Colors';
import { useFormUnsavedChangesGuard } from '../../../hooks/useFormUnsavedChangesGuard';
import { ScreenPageFrame, ScreenPageHeader } from '../../../components/ScreenPageHeader';
import ScreenState from '../../../components/ScreenState';
import { SettingsPageState } from '../../settings/components/SettingsPageHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { usePet } from '../../../contexts/PetContext';
import { taipeiDateKey, taipeiDateFromKey } from '../../../utils/taipeiDate';
import type { MainTabParamList } from '../../../navigation/types';
import { MemorialPetCard } from '../components/MemorialPetCard';
import { memorialStyles as styles } from '../memorialStyles';
import {
  MEMORIAL_EFFECTS,
  MEMORIAL_EFFECT_GROUPS,
  MEMORIAL_NOTE_MAX,
  validateMemorialDate,
} from '../memorialContent';

type Props = { navigation: { goBack: () => void } };

export default function PetMemorialScreen({ navigation }: Props) {
  const tabNavigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { errors, scrollRef, position, showErrors, clearError } = useFormFieldErrors<
    'date',
    ScrollView
  >();
  const { session } = useAuth();
  const { pets, selectPet, memorializeSelectedPet, restoreSelectedPet } = usePet();
  const selectedPet = useFormPet();
  const bottomPadding = useTabContentBottomPadding(24);
  const [date, setDate] = useState<Date>();
  const [note, setNote] = useState('');
  const mutationLock = useRef(false);
  const [saving, setSaving] = useState(false);
  const formValues = { date, note };
  const { markSaved } = useFormUnsavedChangesGuard(
    formValues,
    (value) => {
      setDate(value.date);
      setNote(value.note);
    },
    Boolean(selectedPet) && !selectedPet?.memorial,
    saving,
  );
  if (!selectedPet)
    return (
      <SettingsPageState page="PetMemorial">
        <ScreenState text="請先選擇毛孩，再查看回憶。" />
      </SettingsPageState>
    );
  const pet = selectedPet;

  const refreshNotifications = async (memorialPetId: string, memorial: boolean) => {
    if (!session?.userId) return;
    const nextPets = pets.map((item) => (item.id === memorialPetId ? { ...item, memorial } : item));
    return syncCareNotifications(session.userId, nextPets);
  };

  const confirmMemorial = () => {
    const dateKey = date ? taipeiDateKey(date) : '';
    const problem = validateMemorialDate(dateKey, pet, taipeiDateKey());
    if (!showErrors(problem ? { date: problem } : {}, ['date'])) return;
    Alert.alert(`把${pet.name}移到回憶？`, MEMORIAL_EFFECTS.join('\n\n'), [
      { text: '再想想', style: 'cancel' },
      {
        text: '移到回憶',
        onPress: async () => {
          if (mutationLock.current) return;
          mutationLock.current = true;
          setSaving(true);
          try {
            const stopped = await memorializeSelectedPet(
              {
                passedAwayDate: dateKey,
                memorialNote: note.trim(),
              },
              pet.id,
            );
            const warning = await refreshNotifications(pet.id, true);
            Alert.alert(
              '已移到回憶',
              (stopped ? `謝謝牠的陪伴。已停止 ${stopped} 個未完成的提醒。` : '謝謝牠的陪伴。') +
                (warning ? '\n' + warning : ''),
            );
            markSaved(formValues, () => navigation.goBack());
          } catch (error) {
            Alert.alert('無法移到回憶', (error as Error).message);
          } finally {
            mutationLock.current = false;
            setSaving(false);
          }
        },
      },
    ]);
  };

  const confirmRestore = () =>
    Alert.alert(
      `把${pet.name}從回憶還原？`,
      '還原後可以再新增紀錄。之前停止的提醒不會自動恢復，需要時請重新建立；身分 QR 公開頁會重新開啟。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '還原',
          onPress: async () => {
            if (mutationLock.current) return;
            mutationLock.current = true;
            setSaving(true);
            try {
              await restoreSelectedPet(pet.id);
              await refreshNotifications(pet.id, false);
              navigation.goBack();
            } catch (error) {
              Alert.alert('無法還原', (error as Error).message);
            } finally {
              mutationLock.current = false;
              setSaving(false);
            }
          },
        },
      ],
    );

  const earliestDate = [pet.birthDate, pet.adoptionDate].filter(Boolean).sort().pop();
  const pageHeader = (
    <ScreenPageHeader
      title={pet.memorial ? '回憶' : '移到回憶'}
      description={
        pet.memorial ? '保留毛孩一起生活的紀錄與照片' : '保留一起生活的紀錄，設定前請確認以下內容'
      }
      icon="flower-outline"
      iconColor={Colors.memorial}
      iconBackground={Colors.memorialSoft}
    />
  );
  const petCard = <MemorialPetCard pet={pet} userId={session?.userId} />;

  const openHistory = (screen: 'TimelineOverview' | 'PhotosOverview') => {
    selectPet(pet.id);
    tabNavigation.navigate('Timeline', { screen });
  };

  if (pet.memorial) {
    return (
      <ScreenPageFrame>
        <ScrollView
          style={styles.page}
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        >
          {pageHeader}
          {petCard}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>一起留下的日常</Text>
            <Text style={styles.helper}>紀錄與照片都還在，想念時可以隨時回來看看。</Text>
            <View style={styles.reviewActions}>
              <AppButton
                title="查看照護紀錄"
                variant="secondary"
                style={styles.reviewButton}
                disabled={saving}
                onPress={() => openHistory('TimelineOverview')}
              >
                <Ionicons name="book-outline" size={20} color={Colors.memorial} />
                <Text style={styles.reviewText}>查看照護紀錄</Text>
              </AppButton>
              <AppButton
                title="查看照護相簿"
                variant="secondary"
                style={styles.reviewButton}
                disabled={saving}
                onPress={() => openHistory('PhotosOverview')}
              >
                <Ionicons name="images-outline" size={20} color={Colors.memorial} />
                <Text style={styles.reviewText}>查看照護相簿</Text>
              </AppButton>
            </View>
          </View>
          <View style={styles.restoreSection}>
            <Text style={styles.restoreTitle}>誤設處理</Text>
            <Text style={styles.helper}>
              若是不小心設定成回憶，可以還原為照顧中。已停止的提醒不會自動恢復。
            </Text>
            <AppButton
              title={saving ? '正在還原…' : '從回憶還原'}
              variant="secondary"
              style={styles.restoreButton}
              textStyle={{ color: Colors.memorial }}
              busy={saving}
              onPress={confirmRestore}
              accessibilityLabel={`把${pet.name}從回憶還原`}
            />
          </View>
        </ScrollView>
      </ScreenPageFrame>
    );
  }

  return (
    <ScreenPageFrame>
      <ScrollView
        ref={scrollRef}
        style={styles.page}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      >
        {pageHeader}
        {petCard}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>設定後會有哪些變化</Text>
          {MEMORIAL_EFFECT_GROUPS.map((group) => (
            <View key={group.title} style={styles.group}>
              <View style={styles.groupHeading}>
                <Ionicons name={group.icon} size={20} color={Colors.memorial} />
                <Text style={styles.groupTitle}>{group.title}</Text>
              </View>
              {group.items.map((effect) => (
                <View key={effect} style={styles.effectRow}>
                  <Text style={styles.bullet} accessible={false}>
                    ・
                  </Text>
                  <Text style={styles.effectText}>{effect}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.section} onLayout={position('date')}>
          <Text style={styles.sectionTitle}>留下紀念</Text>
          <View>
            <DatePickerField
              label="離開的日期（必填）"
              placeholder="選擇離開的日期"
              value={date}
              minimumDate={earliestDate ? taipeiDateFromKey(earliestDate) : undefined}
              maximumDate={new Date()}
              onChange={(next) => {
                clearError('date');
                setDate(next);
              }}
            />
            <FieldError message={errors.date} />
          </View>
          <SupplementalNotesField
            label="想對牠說的話（選填）"
            accessibilityLabel="想對牠說的話"
            value={note}
            onChange={setNote}
            maxLength={MEMORIAL_NOTE_MAX}
            placeholder="例如：謝謝你陪我們走過的每一天"
            helperText="可以現在寫，也可以先留白。"
          />
        </View>
        <AppButton
          title={saving ? '正在處理…' : '移到回憶'}
          busy={saving}
          onPress={confirmMemorial}
          style={styles.submit}
          accessibilityLabel={`把${pet.name}移到回憶`}
        />
      </ScrollView>
    </ScreenPageFrame>
  );
}
