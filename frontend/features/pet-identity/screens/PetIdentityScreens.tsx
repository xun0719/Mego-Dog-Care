import { useFormPet } from '../../../hooks/useFormPet';
import { editableLostProfile } from '../identityFields';
import { ScreenPageFrame } from '../../../components/ScreenPageHeader';
import {
  SettingsPageHeader,
  SettingsPageState,
} from '../../settings/components/SettingsPageHeader';
import { useFormUnsavedChangesGuard } from '../../../hooks/useFormUnsavedChangesGuard';
/** 用途：毛孩資訊公開範圍設定與資訊 QR；保留既有 route。 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, ScrollView, Share, Switch, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../../../components/AppButton';
import SupplementalNotesField from '../../../components/SupplementalNotesField';
import { Colors } from '../../../constants/Colors';
import ScreenState from '../../../components/ScreenState';
import KeyboardAwareScrollView from '../../../components/KeyboardAwareScrollView';
import { FieldError } from '../../../components/FieldError';
import { SaveStatusNotice, type SaveStatus } from '../../../components/SaveStatusNotice';
import { useFormFieldErrors } from '../../../hooks/useFormFieldErrors';
import { useAuth } from '../../../contexts/AuthContext';
import type { ProfileStackParamList } from '../../../navigation/types';
import {
  getLostProfile,
  LostProfile,
  saveLostProfile,
  rotateLostToken,
} from '../../../services/lostPetService';
import { IdentityInfoBox, identityStyles as styles } from '../components/IdentityPresentation';
import {
  DEFAULT_PROFILE,
  contactFields,
  contactVisibilityFields,
  petVisibilityFields,
  VisibilityKey,
} from '../identityFields';
import { useTabContentBottomPadding } from '../../../components/navigation/useTabContentBottomPadding';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';

const BASE = (
  process.env.EXPO_PUBLIC_LOST_PET_BASE_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  ''
).replace(/\/$/, '');

type Props = NativeStackScreenProps<ProfileStackParamList, 'LostPetSettings'>;

export function LostPetSettingsScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const [profile, setProfile] = useState<LostProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [saving, setSaving] = useState(false);
  // 儲存後留在原頁，沒有轉場可以當回饋。
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(null);
  const saveLock = useRef(false);
  const userId = session?.userId;
  const petId = selectedPet?.id;
  const { dirtyRef, markSaved } = useFormUnsavedChangesGuard(
    editableLostProfile(profile),
    (baseline) => setProfile((current) => (baseline ? { ...current, ...baseline } : null)),
    !loading && Boolean(profile),
    saving,
  );

  useFocusEffect(
    useCallback(() => {
      if (dirtyRef.current) return;
      const controller = new AbortController();
      let cancelled = false;
      setLoading(true);
      setError('');
      setProfile(null);
      if (!userId || !petId) {
        setError('請先登入並選擇毛孩');
        setLoading(false);
        return;
      }
      getLostProfile(userId, petId, controller.signal)
        .then((result) => {
          if (!cancelled) {
            setProfile(result.profile);
            markSaved(editableLostProfile(result.profile));
          }
        })
        .catch((caught) => {
          if (!cancelled) setError((caught as Error).message || '無法載入毛孩資訊');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        controller.abort();
        cancelled = true;
      };
      // retryKey intentionally re-runs this focused request after retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petId, retryKey, userId, dirtyRef, markSaved]),
  );

  const data = profile || DEFAULT_PROFILE;
  // 「至少公開一種聯絡方式」是跨欄位規則，錯誤顯示在聯絡公開範圍那一區。
  const { errors, scrollRef, position, showErrors, clearError } = useFormFieldErrors<'contact'>();
  const update = <K extends keyof LostProfile>(key: K, value: LostProfile[K]) => {
    clearError('contact');
    setProfile({ ...data, [key]: value });
  };

  const save = async () => {
    if (!session?.userId || !selectedPet || saveLock.current) return;
    const hasPublicContact =
      (data.showContactPhone && Boolean(data.contactPhone?.trim())) ||
      (data.showAlternatePhone && Boolean(data.alternatePhone?.trim())) ||
      (data.showContactEmail && Boolean(data.contactEmail?.trim()));
    if (
      !showErrors(
        hasPublicContact
          ? {}
          : { contact: '請填寫並公開電話、備用電話或 Email，掃描者才能聯絡到你。' },
        ['contact'],
      )
    )
      return;
    const submitted = { ...data, enabled: true };
    saveLock.current = true;
    setSaving(true);
    try {
      const result = await saveLostProfile(session.userId, selectedPet.id, {
        ...data,
        enabled: true,
      });
      setProfile((current) =>
        JSON.stringify(current) === JSON.stringify(data) ? result.profile : current,
      );
      markSaved(editableLostProfile(submitted));
      setSaveStatus({ tone: 'success', message: '毛孩身分 QR 已更新。' });
    } catch (error) {
      Alert.alert('儲存失敗', (error as Error).message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const toggleOptions = (fields: readonly (readonly [VisibilityKey, string])[]) =>
    fields.map(([key, label], index) => {
      const visible = data[key];
      return (
        <View
          key={key}
          style={[styles.optionRow, index === fields.length - 1 && { borderBottomWidth: 0 }]}
        >
          <View style={styles.optionCopy}>
            <Text style={styles.optionLabel}>{label}</Text>
            <Text style={styles.optionState}>{visible ? '掃描頁會顯示' : '已隱藏，不會公開'}</Text>
          </View>
          <View style={styles.optionControl}>
            <Switch
              accessibilityLabel={`公開${label}`}
              trackColor={{ false: Colors.disabled, true: '#9DCAB4' }}
              ios_backgroundColor={Colors.borderStrong}
              thumbColor={visible ? Colors.success : '#F8F5F0'}
              value={visible}
              onValueChange={(value) => update(key, value)}
            />
          </View>
        </View>
      );
    });

  const previewPetDetails = [
    data.showBreed && selectedPet?.breed ? `品種：${selectedPet.breed}` : '',
    data.showSex && selectedPet?.gender
      ? `性別：${selectedPet.gender === 'male' ? '公' : '母'}`
      : '',
    data.showNeutered && selectedPet ? `結紮：${selectedPet.neutered ? '已結紮' : '未結紮'}` : '',
    data.showCoatColor && selectedPet?.coatColor ? `毛色：${selectedPet.coatColor}` : '',
    data.showDistinctiveFeatures && selectedPet?.distinctiveFeatures
      ? `明顯特徵：${selectedPet.distinctiveFeatures}`
      : '',
  ].filter(Boolean);
  const previewContacts = [
    data.showContactName && data.contactName?.trim()
      ? { icon: 'person-outline' as const, value: data.contactName.trim() }
      : null,
    data.showContactPhone && data.contactPhone?.trim()
      ? { icon: 'call-outline' as const, value: data.contactPhone.trim() }
      : null,
    data.showAlternatePhone && data.alternatePhone?.trim()
      ? { icon: 'call-outline' as const, value: data.alternatePhone.trim() }
      : null,
    data.showContactEmail && data.contactEmail?.trim()
      ? { icon: 'mail-outline' as const, value: data.contactEmail.trim() }
      : null,
    data.showContactMessage && data.contactMessage?.trim()
      ? { icon: 'chatbubble-ellipses-outline' as const, value: data.contactMessage.trim() }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  if (loading)
    return (
      <SettingsPageState page="LostPetSettings">
        <ScreenState loading text="正在載入毛孩資訊…" />
      </SettingsPageState>
    );
  if (error)
    return (
      <SettingsPageState page="LostPetSettings">
        <ScreenState error text={error} action={() => setRetryKey((key) => key + 1)} />
      </SettingsPageState>
    );
  return (
    <ScreenPageFrame>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}
      >
        <SettingsPageHeader page="LostPetSettings" style={{ marginBottom: 0 }} />
        <SaveStatusNotice status={saveStatus} onDismiss={() => setSaveStatus(null)} />
        <View style={styles.petCard}>
          <View style={styles.petAvatar}>
            {selectedPet?.avatarAttachmentId && userId ? (
              <AuthenticatedPetAvatar
                attachmentId={selectedPet.avatarAttachmentId}
                userId={userId}
                style={styles.petAvatarImage}
                fallback={<Ionicons name="paw" size={28} color={Colors.primaryDecoration} />}
              />
            ) : (
              <Ionicons name="paw" size={28} color={Colors.primaryDecoration} />
            )}
          </View>
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{selectedPet?.name || '尚未選擇毛孩'}</Text>
            <Text style={styles.petMeta}>
              {[
                selectedPet?.breed,
                selectedPet?.gender === 'male'
                  ? '公'
                  : selectedPet?.gender === 'female'
                    ? '母'
                    : '',
              ]
                .filter(Boolean)
                .join(' · ') || '補充毛孩基本資料'}
            </Text>
          </View>
        </View>
        <IdentityInfoBox
          icon="shield-checkmark-outline"
          text="QR 只分享你選擇的資料，不會公開帳號、密碼或完整健康紀錄。"
        />
        <Text style={styles.sectionTitle}>飼主聯絡方式</Text>
        <Text style={styles.note}>
          至少填寫並公開一種聯絡方式。其他資料可留空，也能在下方選擇是否顯示。
        </Text>
        <View style={styles.fieldSurface}>
          {contactFields.map(([key, label, hint]) => (
            <View key={key} style={styles.fieldGroup}>
              {key === 'contactMessage' ? (
                <SupplementalNotesField
                  label={label}
                  helperText={hint}
                  value={String(data[key] ?? '')}
                  onChange={(value) => update(key, value)}
                  placeholder="想留給掃描者的訊息"
                />
              ) : (
                <>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldHint}>{hint}</Text>
                  <TextInput
                    accessibilityLabel={label}
                    style={styles.input}
                    placeholder="請輸入"
                    placeholderTextColor={Colors.subtext}
                    value={String(data[key] ?? '')}
                    onChangeText={(value) => update(key, value)}
                  />
                </>
              )}
            </View>
          ))}
        </View>
        <Text style={styles.sectionTitle}>毛孩資料的公開範圍</Text>
        <Text style={styles.note}>
          <Text style={styles.noteLead}>關閉項目不會公開</Text>
          {'\n'}資料仍會保留在 App，只是不會出現在公開掃描頁。
        </Text>
        <View style={styles.optionSurface}>{toggleOptions(petVisibilityFields)}</View>
        <Text style={styles.sectionTitle}>聯絡資料的公開範圍</Text>
        <Text style={styles.note}>
          掃描者只會看到已開啟且已填寫的聯絡方式；至少公開一種，對方才能聯絡你。
        </Text>
        <View onLayout={position('contact')}>
          <View style={styles.optionSurface}>{toggleOptions(contactVisibilityFields)}</View>
          <FieldError message={errors.contact} />
        </View>
        <View style={styles.previewSurface}>
          <Text style={styles.previewHeading}>掃描頁預覽</Text>
          <Text style={styles.previewSubheading}>以下內容會依目前的公開設定即時更新</Text>
          <View style={styles.previewPetRow}>
            <View style={styles.previewAvatar}>
              {data.showAvatar && selectedPet?.avatarAttachmentId && userId ? (
                <AuthenticatedPetAvatar
                  attachmentId={selectedPet.avatarAttachmentId}
                  userId={userId}
                  style={styles.petAvatarImage}
                  fallback={<Text style={styles.previewAvatarLabel}>MEGO</Text>}
                />
              ) : (
                <Text style={styles.previewAvatarLabel}>MEGO</Text>
              )}
            </View>
            <Text style={styles.previewPetName}>{selectedPet?.name || '毛孩'}</Text>
          </View>
          <Text style={styles.previewSectionTitle}>毛孩資料</Text>
          {previewPetDetails.length ? (
            previewPetDetails.map((item) => (
              <Text key={item} style={styles.previewDetail}>
                {item}
              </Text>
            ))
          ) : (
            <Text style={styles.previewEmpty}>目前沒有選擇公開其他毛孩資料</Text>
          )}
          <Text style={styles.previewSectionTitle}>聯絡方式</Text>
          {previewContacts.length ? (
            previewContacts.map((item, index) => (
              <View key={`${item.icon}-${index}`} style={styles.previewContact}>
                <Ionicons name={item.icon} size={18} color={Colors.successDecoration} />
                <Text style={styles.previewContactText}>{item.value}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.previewEmpty}>尚未公開聯絡方式，掃描者將無法聯絡你</Text>
          )}
        </View>
        <AppButton
          title={saving ? '儲存中…' : '儲存公開設定'}
          variant="primary"
          disabled={saving}
          busy={saving}
          style={styles.primary}
          textStyle={styles.primaryText}
          onPress={save}
        />
        {data.enabled ? (
          <AppButton
            variant="secondary"
            style={styles.secondary}
            onPress={() => navigation.navigate('LostPetQr')}
            accessibilityLabel="查看毛孩身分 QR"
          >
            <Ionicons name="qr-code-outline" size={19} color={Colors.successDecoration} />
            <Text style={styles.secondaryText}>查看毛孩身分 QR</Text>
          </AppButton>
        ) : null}
      </KeyboardAwareScrollView>
    </ScreenPageFrame>
  );
}

export function LostPetQrScreen() {
  const bottomContentPadding = useTabContentBottomPadding(24, true);
  const { session } = useAuth();
  const selectedPet = useFormPet();
  const [profile, setProfile] = useState<LostProfile | null>(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const rotateLock = useRef(false);
  const [rotating, setRotating] = useState(false);
  const userId = session?.userId;
  const petId = selectedPet?.id;
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      let cancelled = false;
      setLoading(true);
      setError('');
      setProfile(null);
      setToken('');
      if (!userId || !petId) {
        setError('請先登入並選擇毛孩');
        setLoading(false);
        return;
      }
      getLostProfile(userId, petId, controller.signal)
        .then((result) => {
          if (cancelled) return;
          setProfile(result.profile);
          setToken(result.profile?.publicToken || '');
        })
        .catch((caught) => {
          if (!cancelled) setError((caught as Error).message || '無法載入毛孩身分 QR');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        controller.abort();
        cancelled = true;
      };
      // retryKey intentionally re-runs this focused request after retry.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [petId, retryKey, userId]),
  );
  const url = token && BASE ? `${BASE}/api/public/lost-pets/${token}/page` : '';
  if (loading)
    return (
      <SettingsPageState page="LostPetQr">
        <ScreenState loading text="正在載入毛孩身分 QR…" />
      </SettingsPageState>
    );
  if (error)
    return (
      <SettingsPageState page="LostPetQr">
        <ScreenState error text={error} action={() => setRetryKey((key) => key + 1)} />
      </SettingsPageState>
    );
  if (!profile || !url)
    return (
      <SettingsPageState page="LostPetQr">
        <View style={styles.center}>
          <Text>
            {!profile
              ? '請先儲存公開設定，再查看毛孩身分 QR。'
              : !BASE
                ? '尚未設定公開網址，請確認 PUBLIC URL 設定。'
                : '公開連結尚未準備好，請返回公開設定頁確認。'}
          </Text>
        </View>
      </SettingsPageState>
    );

  const rotate = () =>
    Alert.alert('更新安全連結？', '更新後舊 QR 將立即失效，需要重新分享新的 QR。', [
      { text: '取消' },
      {
        text: '更新',
        onPress: async () => {
          if (!userId || !petId || rotateLock.current) return;
          rotateLock.current = true;
          setRotating(true);
          try {
            const result = await rotateLostToken(userId, petId);
            setToken(result.publicToken);
            Alert.alert('已更新', '新的毛孩身分 QR 已產生');
          } catch (error) {
            Alert.alert('更新失敗', (error as Error).message);
          } finally {
            rotateLock.current = false;
            setRotating(false);
          }
        },
      },
    ]);

  return (
    <ScreenPageFrame>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: bottomContentPadding }]}>
        <SettingsPageHeader page="LostPetQr" style={{ marginBottom: 0 }} />
        <View style={styles.qrCard}>
          <Text style={styles.petName}>{selectedPet?.name || '毛孩'}</Text>
          <View style={styles.qrFrame}>
            <QRCode value={url} size={224} />
          </View>
          <Text style={styles.qrCaption}>掃描即可查看飼主選擇公開的毛孩資料</Text>
        </View>
        <IdentityInfoBox
          icon="lock-closed-outline"
          text="掃描者只會看到你選擇公開的資料。更新內容後不必重新列印 QR。"
        />
        <AppButton
          variant="primary"
          style={styles.primary}
          onPress={() =>
            Share.share({ message: `這是 ${selectedPet?.name} 的毛孩資訊卡：${url}` }).catch(
              (caught) => Alert.alert('分享失敗', (caught as Error).message || '請稍後再試'),
            )
          }
          accessibilityLabel="分享毛孩身分 QR"
        >
          <Ionicons name="share-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.primaryText}>分享毛孩身分 QR</Text>
        </AppButton>
        <AppButton
          variant="secondary"
          style={styles.secondary}
          onPress={rotate}
          disabled={rotating}
          busy={rotating}
          accessibilityLabel="更新安全連結"
        >
          <Ionicons name="refresh-outline" size={19} color={Colors.successDecoration} />
          <Text style={styles.secondaryText}>更新安全連結</Text>
        </AppButton>
      </ScrollView>
    </ScreenPageFrame>
  );
}
