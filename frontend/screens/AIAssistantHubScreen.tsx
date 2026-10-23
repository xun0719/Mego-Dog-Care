import { aiHubStyles as styles } from '../features/ai/aiHubStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：AI 助手入口，集中整理 AI 查詢與健康紀錄入口。 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';

import { Colors } from '../constants/Colors';
import { HomeStackParamList, RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import {
  activateAISession,
  activateEmptyAISession,
  deleteAISession,
  loadAISessions,
  AISessionRecord,
} from '../services/aiSessionService';
import { AIConversationSessionRow } from '../features/ai/components/AIConversationSessionRow';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { acceptAIDataConsent, getAIDataConsent } from '../services/aiDataConsentService';
import AuthenticatedPetAvatar from '../components/AuthenticatedPetAvatar';
import { AI_LOCAL_HISTORY_NOTICE } from '../features/ai/aiResponseContent';

type Props = NativeStackScreenProps<HomeStackParamList, 'HealthOverview'>;

export default function AIAssistantHubScreen({ navigation }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [sessions, setSessions] = useState<AISessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState(false);
  const [openedSessionId, setOpenedSessionId] = useState<string | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const [consentLoaded, setConsentLoaded] = useState(false);
  const [consentOwnerId, setConsentOwnerId] = useState('');
  const openingLock = React.useRef(false);
  const consentLock = React.useRef(false);
  const sessionStartLock = React.useRef(false);
  const pendingAIAction = React.useRef<(() => Promise<void>) | null>(null);
  const loadedOwnerRef = React.useRef('');
  const ownerKey = session?.userId && selectedPet?.id ? `${session.userId}:${selectedPet.id}` : '';
  const rootNavigation = useCallback(
    () =>
      navigation.getParent()?.getParent() as
        | NativeStackNavigationProp<RootStackParamList>
        | undefined,
    [navigation],
  );
  const openChat = useCallback(() => rootNavigation()?.navigate('AIChat'), [rootNavigation]);
  const refreshSessions = useCallback(() => {
    let active = true;
    if (!session?.userId || !selectedPet?.id) {
      setSessionsLoading(false);
      return () => {
        active = false;
      };
    }
    // Keep the current session list visible while the same owner refreshes it.
    // Show the loader only for the first load or when switching account/pet.
    setSessionsLoading(loadedOwnerRef.current !== ownerKey);
    setSessionsError(false);
    loadAISessions(session.userId, selectedPet.id)
      .then((items) => {
        if (!active) return;
        setSessions(items);
        loadedOwnerRef.current = ownerKey;
      })
      .catch(() => {
        if (active) setSessionsError(true);
      })
      .finally(() => {
        if (active) setSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ownerKey, session?.userId, selectedPet?.id]);
  useFocusEffect(refreshSessions);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (session?.userId) {
        getAIDataConsent(session.userId)
          .then((result) => {
            if (!active) return;
            setConsentGranted(result.accepted);
            setConsentLoaded(true);
            setConsentOwnerId(session.userId);
          })
          .catch(() => {
            if (!active) return;
            setConsentGranted(false);
            setConsentLoaded(true);
            setConsentOwnerId(session.userId);
          });
      }
      return () => {
        active = false;
      };
    }, [session?.userId]),
  );
  const withAIConsent = useCallback(
    async (action: () => Promise<void>) => {
      if (!session?.userId || !selectedPet?.id || openingLock.current) return;
      openingLock.current = true;
      try {
        let granted = consentGranted;
        if (!consentLoaded || consentOwnerId !== session.userId) {
          try {
            granted = (await getAIDataConsent(session.userId)).accepted;
            setConsentGranted(granted);
            setConsentLoaded(true);
            setConsentOwnerId(session.userId);
          } catch {
            granted = false;
          }
        }
        if (granted) {
          try {
            await action();
          } catch (error) {
            Alert.alert('無法開啟對話', (error as Error).message || '請重新載入後再試。');
          }
          return;
        }
        pendingAIAction.current = action;
        setConsentVisible(true);
      } finally {
        openingLock.current = false;
      }
    },
    [consentGranted, consentLoaded, consentOwnerId, selectedPet?.id, session?.userId],
  );
  const openAssistant = useCallback(
    () =>
      withAIConsent(async () => {
        if (!session?.userId || !selectedPet?.id) return;
        const begin = async () => {
          if (sessionStartLock.current) return;
          sessionStartLock.current = true;
          try {
            await activateEmptyAISession(session.userId, selectedPet.id);
            openChat();
          } catch (error) {
            Alert.alert('無法建立對話', (error as Error).message || '請重新載入後再試。');
          } finally {
            sessionStartLock.current = false;
          }
        };
        if (sessions.length < 5) return begin();
        const oldest = [...sessions].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
        Alert.alert('對話已達 5 個', `建立新對話會刪除最舊的「${oldest.title}」。`, [
          { text: '取消', style: 'cancel' },
          {
            text: '刪除並建立',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAISession(session.userId, selectedPet.id, oldest.id);
                setSessions((items) => items.filter((item) => item.id !== oldest.id));
                await begin();
              } catch (error) {
                Alert.alert('無法刪除對話', (error as Error).message);
              }
            },
          },
        ]);
      }),
    [openChat, selectedPet?.id, session?.userId, sessions, withAIConsent],
  );
  const confirmAIDataConsent = async () => {
    if (!session?.userId || consentLock.current) return;
    consentLock.current = true;
    setConsentSaving(true);
    try {
      await acceptAIDataConsent(session.userId);
      setConsentGranted(true);
      setConsentLoaded(true);
      setConsentOwnerId(session.userId);
      setConsentVisible(false);
      const action = pendingAIAction.current;
      pendingAIAction.current = null;
      await action?.();
    } catch (error) {
      Alert.alert('暫時無法記錄確認', (error as Error).message || '請確認網路連線後再試。');
    } finally {
      consentLock.current = false;
      setConsentSaving(false);
    }
  };
  const deferAIDataConsent = () => {
    pendingAIAction.current = null;
    setConsentVisible(false);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <View style={styles.petHeader}>
          {selectedPet?.avatarAttachmentId ? (
            <AuthenticatedPetAvatar
              attachmentId={selectedPet.avatarAttachmentId}
              userId={session?.userId || selectedPet.userId}
              style={styles.petAvatar}
              fallback={
                <View style={styles.petAvatarFallback}>
                  <Ionicons name="paw-outline" size={23} color={Colors.primaryDecoration} />
                </View>
              }
            />
          ) : (
            <View style={styles.petAvatarFallback}>
              <Ionicons name="paw-outline" size={23} color={Colors.primaryDecoration} />
            </View>
          )}
          <View style={styles.petHeaderText}>
            <Text style={styles.eyebrow}>MEGO AI 助手</Text>
            <Text style={styles.title}>一起整理照護</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          把 {selectedPet?.name || '毛孩'} 的照護紀錄，整理成容易理解的答案。
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="開始新的 MEGO AI 對話"
          style={styles.hero}
          activeOpacity={0.88}
          onPress={openAssistant}
        >
          <View style={styles.heroIcon}>
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={22}
              color={Colors.primaryDecoration}
            />
          </View>
          <Text style={styles.heroTitle}>有什麼想問的照護問題？</Text>
          <Text style={styles.heroText}>
            查詢{selectedPet?.name || '毛孩'}的紀錄、問照護知識，回答會附上參考來源。
          </Text>
          <View style={styles.heroAction}>
            <Text style={styles.heroActionText}>開始新的對話</Text>
            <Ionicons name="arrow-forward" size={17} color={Colors.primaryDecoration} />
          </View>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, styles.toolsTitle]}>照護工具</Text>
        <View style={styles.tools}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="準備看醫生，整理就醫前摘要"
            style={styles.tool}
            onPress={() => withAIConsent(async () => rootNavigation()?.navigate('VetVisitBrief'))}
          >
            <View style={[styles.toolIcon, styles.toolIconCare]}>
              <Ionicons name="medkit-outline" size={20} color={Colors.successStrong} />
            </View>
            <Text style={styles.toolTitle}>準備看醫生</Text>
            <Text style={styles.toolText}>整理近期紀錄，帶著重點和獸醫溝通</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="開啟就醫地圖，查看夜間與急診動物醫院"
            style={styles.tool}
            onPress={() => navigation.navigate('VetMap')}
          >
            <View style={[styles.toolIcon, styles.toolIconMap]}>
              <Ionicons name="map-outline" size={20} color={Colors.primaryDecoration} />
            </View>
            <Text style={styles.toolTitle}>急診地圖</Text>
            <Text style={styles.toolText}>查看夜間與急診動物醫院</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sectionHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            最近對話
          </Text>
          <View style={styles.sessionLimit}>
            <Text style={styles.sessionLimitText}>最多 5 個</Text>
          </View>
        </View>
        {sessionsLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>正在整理最近對話…</Text>
          </View>
        ) : sessionsError ? (
          <View style={styles.loadError}>
            <Text style={styles.empty}>最近對話暫時載入失敗</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.retryButton}
              onPress={refreshSessions}
            >
              <Text style={styles.retryText}>再試一次</Text>
            </TouchableOpacity>
          </View>
        ) : sessions.length ? (
          sessions.map((item) => (
            <AIConversationSessionRow
              key={item.id}
              item={item}
              openedSessionId={openedSessionId}
              onOpenedChange={setOpenedSessionId}
              onOpen={() =>
                withAIConsent(async () => {
                  if (!session?.userId || !selectedPet?.id) return;
                  await activateAISession(session.userId, selectedPet.id, item);
                  openChat();
                })
              }
              onDelete={() =>
                Alert.alert('刪除對話？', `將刪除「${item.title}」，此動作無法復原。`, [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '刪除',
                    style: 'destructive',
                    onPress: async () => {
                      if (!session?.userId || !selectedPet?.id) return;
                      try {
                        await deleteAISession(session.userId, selectedPet.id, item.id);
                        setSessions((items) => items.filter((entry) => entry.id !== item.id));
                      } catch (error) {
                        Alert.alert('無法刪除對話', (error as Error).message);
                      }
                    },
                  },
                ])
              }
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="paw-outline" size={24} color={Colors.primaryDecoration} />
            </View>
            <Text style={styles.empty}>還沒有對話，從一次照護提問開始吧。</Text>
          </View>
        )}
        <Text style={styles.sessionNotice}>{AI_LOCAL_HISTORY_NOTICE}</Text>
      </ScrollView>
      <Modal
        visible={consentVisible}
        transparent
        animationType="fade"
        onRequestClose={deferAIDataConsent}
      >
        <View style={styles.consentBackdrop}>
          <View style={styles.consentDialog}>
            <ScrollView bounces={false} contentContainerStyle={styles.consentContent}>
              <View style={styles.consentIcon}>
                <Ionicons name="lock-closed-outline" size={23} color={Colors.primaryDecoration} />
              </View>
              <Text style={styles.consentTitle}>開始使用 MEGO AI 前</Text>
              <Text style={styles.consentIntro}>
                你的問題會傳送至 MEGO 設定的 AI 服務，以產生回覆。
              </Text>
              <View style={styles.consentInfoBlock}>
                <Text style={styles.consentInfoHeading}>對話內容</Text>
                <Text style={styles.consentBody}>
                  為延續同一段對話，最近最多 10
                  則訊息可能一併傳送；不同對話不會互相帶入。對話紀錄保存在這台裝置，不會跨裝置同步。
                </Text>
              </View>
              <View style={styles.consentInfoBlock}>
                <Text style={styles.consentInfoHeading}>毛孩資料</Text>
                <Text style={styles.consentBody}>
                  問題需要個人化照護資訊時，才會傳送回答所需的資料，例如基本資料、過敏／慢性病、日常觀察或相關照護紀錄。只會依問題提供必要範圍；一般生活問題不會附帶毛孩紀錄。
                </Text>
              </View>
              <Text style={styles.consentFootnote}>
                AI 回覆可能不完全正確，不能取代獸醫診斷。完整內容可在「設定 → AI 助手 → AI
                資料使用說明」查看。
              </Text>
            </ScrollView>
            <View style={styles.consentActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.consentPrimary, consentSaving && styles.consentDisabled]}
                onPress={() => void confirmAIDataConsent()}
                disabled={consentSaving}
              >
                <Text style={styles.consentPrimaryText}>
                  {consentSaving ? '正在記錄…' : '我了解，繼續使用 MEGO AI'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.consentLater}
                onPress={deferAIDataConsent}
                disabled={consentSaving}
              >
                <Text style={styles.consentLaterText}>稍後再說</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
