import { useReducedMotion } from '../hooks/usePressFeedback';
import { aiChatStyles as s } from '../features/ai/aiChatStyles';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  useReanimatedKeyboardAnimation,
} from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../contexts/AuthContext';
import { usePet } from '../contexts/PetContext';
import { sendAIChat, AIUsage } from '../services/aiService';
import {
  activateEmptyAISession,
  captureAISessionGeneration,
  loadAISession,
  saveActiveAISession,
} from '../services/aiSessionService';
import { Colors } from '../constants/Colors';
import AuthenticatedPetAvatar from '../components/AuthenticatedPetAvatar';
import {
  AIChatEmptyConversation,
  AIChatMessage,
  AIChatMessageBubble,
} from '../features/ai/components/AIChatContent';

const CONTEXT_WARNING_TOKENS = 12000;

function KeyboardScrollSpacer() {
  const { height } = useReanimatedKeyboardAnimation();
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.max(0, -height.value) }));
  return <Animated.View style={spacerStyle} />;
}

export default function AIChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const reducedMotion = useReducedMotion();
  const { session } = useAuth();
  const { selectedPet } = usePet();
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [usage, setUsage] = useState<AIUsage | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionLoadError, setSessionLoadError] = useState('');
  const [error, setError] = useState('');
  const sendLock = useRef<symbol | null>(null);
  const listRef = useRef<FlatList<AIChatMessage>>(null);
  const shouldScrollToEndRef = useRef(false);
  const isNearEndRef = useRef(true);
  const sessionRequestId = useRef(0);
  const sessionOwnerKey = useRef('');
  const loadSession = React.useCallback(
    async (isCurrent: () => boolean) => {
      if (!session?.userId || !selectedPet?.id) {
        sessionOwnerKey.current = '';
        setMessages([]);
        setActiveSessionId(undefined);
        setUsage(null);
        setSessionLoading(false);
        setSessionLoadError('');
        return;
      }
      const ownerKey = `${session.userId}:${selectedPet.id}`;
      if (sessionOwnerKey.current !== ownerKey) {
        sessionOwnerKey.current = ownerKey;
        setMessages([]);
        setActiveSessionId(undefined);
        setUsage(null);
      }
      setSessionLoading(true);
      setSessionLoadError('');
      try {
        const saved = await loadAISession(session.userId, selectedPet.id);
        if (!isCurrent()) return;
        if (!saved.sessionId)
          saved.sessionId = await activateEmptyAISession(session.userId, selectedPet.id);
        if (!isCurrent()) return;
        shouldScrollToEndRef.current = true;
        setActiveSessionId(saved.sessionId);
        setMessages(saved.messages || []);
        setUsage(saved.usage ?? null);
      } catch {
        if (isCurrent()) {
          setSessionLoadError('無法讀取這段對話，為避免覆蓋原有內容，請先重新載入。');
        }
      } finally {
        if (isCurrent()) setSessionLoading(false);
      }
    },
    [session?.userId, selectedPet?.id],
  );
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      sendLock.current = null;
      setLoading(false);
      const requestId = ++sessionRequestId.current;
      void loadSession(() => active && requestId === sessionRequestId.current);
      return () => {
        active = false;
        sessionRequestId.current += 1;
      };
    }, [loadSession]),
  );
  const retrySessionLoad = () => {
    const requestId = ++sessionRequestId.current;
    void loadSession(() => requestId === sessionRequestId.current);
  };
  const contextWarningVisible = messages.some(
    (message) =>
      message.role === 'assistant' &&
      (message.contextTokens ?? message.result?.contextTokens ?? 0) >= CONTEXT_WARNING_TOKENS,
  );
  const send = async (value = input) => {
    const text = value.trim();
    if (
      !text ||
      !session?.userId ||
      !selectedPet ||
      sendLock.current ||
      sessionLoading ||
      sessionLoadError ||
      !activeSessionId
    )
      return;
    const sendToken = Symbol('AI request');
    sendLock.current = sendToken;
    const requestGeneration = sessionRequestId.current;
    const requestSessionId = activeSessionId;
    const storageGeneration = captureAISessionGeneration(session.userId);
    const isCurrent = () => requestGeneration === sessionRequestId.current;
    setInput('');
    setError('');
    shouldScrollToEndRef.current = true;
    setMessages((items) => [...items, { role: 'user', text }]);
    setLoading(true);
    try {
      const history = messages.slice(-10).map(({ role, text: content }) => ({ role, content }));
      const result = await sendAIChat(
        session.userId,
        selectedPet.id,
        text,
        30,
        activeSessionId,
        'general',
        history,
      );
      if (result.errorCode) {
        if (!isCurrent()) return;
        setMessages((items) => {
          const last = items[items.length - 1];
          return last?.role === 'user' && last.text === text ? items.slice(0, -1) : items;
        });
        setInput(text);
        if (result.usage) setUsage(result.usage);
        setError(result.errorMessage || result.answer || '目前無法取得回覆，請稍後再試。');
        return;
      }
      const assistantText = result.errorMessage
        ? result.answer + '\n' + result.errorMessage
        : result.answer;
      const nextMessages: AIChatMessage[] = [
        ...messages,
        { role: 'user', text },
        {
          role: 'assistant',
          text: assistantText,
          result,
          sources: result.sources,
          knowledgeSources: result.knowledgeSources,
          contextTokens: result.contextTokens ?? undefined,
          generationMode: result.generationMode,
        },
      ];
      if (isCurrent()) {
        shouldScrollToEndRef.current = isNearEndRef.current;
        setMessages(nextMessages);
        if (result.usage) setUsage(result.usage);
      }
      try {
        await saveActiveAISession(
          session.userId,
          selectedPet.id,
          requestSessionId,
          nextMessages.map(
            ({
              role,
              text: messageText,
              sources,
              knowledgeSources,
              contextTokens,
              generationMode,
            }) => ({
              role,
              text: messageText,
              sources,
              knowledgeSources,
              contextTokens,
              generationMode,
            }),
          ),
          result.usage,
          storageGeneration,
        );
      } catch {
        if (isCurrent()) setError('回覆已收到，但無法儲存到本機對話紀錄。');
      }
    } catch (e) {
      if (!isCurrent()) return;
      setMessages((items) => {
        const last = items[items.length - 1];
        return last?.role === 'user' && last.text === text ? items.slice(0, -1) : items;
      });
      setInput(text);
      setError((e as Error).message || '目前無法取得回覆');
    } finally {
      if (sendLock.current === sendToken) {
        sendLock.current = null;
        setLoading(false);
      }
    }
  };
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={s.safeArea}>
      <KeyboardAvoidingView
        style={s.root}
        contentContainerStyle={s.keyboardContent}
        behavior="position"
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          style={s.list}
          data={messages}
          keyExtractor={(item, index) => `${item.role}-${index}`}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            isNearEndRef.current =
              contentSize.height - (contentOffset.y + layoutMeasurement.height) < 96;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!shouldScrollToEndRef.current) return;
            shouldScrollToEndRef.current = false;
            requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: !reducedMotion }));
          }}
          ListHeaderComponent={
            <View>
              <View style={s.header}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="返回上一頁"
                  style={s.headerAction}
                  onPress={() => {
                    if (navigation.canGoBack()) navigation.goBack();
                    else
                      navigation.navigate('MainTabs', {
                        screen: 'Health',
                        params: { screen: 'HealthOverview' },
                      });
                  }}
                >
                  <Ionicons name="chevron-back" size={22} color={Colors.text} />
                </TouchableOpacity>
                <View style={s.titleBody}>
                  <Text style={s.eyebrow}>MEGO AI</Text>
                  <Text style={s.title}>與 {selectedPet?.name || '毛孩'} 對話</Text>
                </View>
                {selectedPet?.avatarAttachmentId ? (
                  <AuthenticatedPetAvatar
                    attachmentId={selectedPet.avatarAttachmentId}
                    userId={session?.userId || selectedPet.userId}
                    style={s.avatar}
                    fallback={
                      <View style={s.avatarFallback}>
                        <Ionicons name="paw-outline" size={19} color={Colors.primaryDecoration} />
                      </View>
                    }
                  />
                ) : (
                  <View style={s.avatarFallback}>
                    <Ionicons name="paw-outline" size={19} color={Colors.primaryDecoration} />
                  </View>
                )}
              </View>
              {usage && (
                <View style={s.usageBadge}>
                  <Ionicons name="sparkles-outline" size={14} color={Colors.primaryDecoration} />
                  <Text style={s.usage}>
                    {usage.unlimited
                      ? `今日已用 ${usage.used} 次 · 不限次數`
                      : `今日已用 ${usage.used} 次 · 還有 ${usage.remaining} 次`}
                  </Text>
                </View>
              )}
              <Text style={s.subtitle}>查詢照護紀錄，也能整理與毛孩生活相關的問題</Text>
              {sessionLoading && (
                <View style={s.sessionState}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={s.muted}>正在讀取對話紀錄…</Text>
                </View>
              )}
              {!!sessionLoadError && (
                <View style={s.sessionState}>
                  <Text style={s.error}>{sessionLoadError}</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={s.sessionRetry}
                    onPress={retrySessionLoad}
                  >
                    <Text style={s.sessionRetryText}>重新載入</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!sessionLoading && !sessionLoadError && !messages.length && (
                <AIChatEmptyConversation
                  onSend={send}
                  onOpenVetBrief={() => navigation.push('VetVisitBrief')}
                />
              )}
            </View>
          }
          renderItem={({ item }) => <AIChatMessageBubble item={item} />}
          ListFooterComponent={
            <>
              {loading && <Text style={s.muted}>正在整理紀錄…</Text>}
              {!!error && (
                <View style={s.sendError}>
                  <Text style={s.error}>{error}</Text>
                  {!!input.trim() && !loading && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="重試送出問題"
                      style={s.sessionRetry}
                      onPress={() => void send(input)}
                    >
                      <Text style={s.sessionRetryText}>重試送出</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              {contextWarningVisible && (
                <View style={s.contextWarning}>
                  <View style={s.contextWarningHeading}>
                    <Ionicons name="warning-outline" size={19} color={Colors.warningTitle} />
                    <Text style={s.contextWarningTitle}>這段對話的上下文已偏長</Text>
                  </View>
                  <Text style={s.contextWarningText}>
                    本次送出的內容已達約 12,000
                    tokens。為降低後續回覆超出模型可處理範圍的風險，建議返回 MEGO AI
                    主頁並另開新對話；目前對話仍會保留在最近對話中。
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="返回 MEGO AI 主頁，另開新對話"
                    style={s.contextWarningAction}
                    onPress={() => {
                      if (navigation.canGoBack()) navigation.goBack();
                      else
                        navigation.navigate('MainTabs', {
                          screen: 'Health',
                          params: { screen: 'HealthOverview' },
                        });
                    }}
                  >
                    <Text style={s.contextWarningActionText}>返回 AI 主頁另開對話</Text>
                    <Ionicons name="chevron-forward" size={15} color={Colors.primaryDecoration} />
                  </TouchableOpacity>
                </View>
              )}
              <Text style={s.disclaimer}>
                MEGO AI 依 App 中已記錄的資料提供整理與查詢，不提供疾病診斷或藥物處方。
              </Text>
              <KeyboardScrollSpacer />
            </>
          }
        />
        <View style={s.composer}>
          <View style={s.inputShell}>
            <TextInput
              style={s.input}
              value={input}
              onChangeText={setInput}
              placeholder="問問毛孩的照護狀況…"
              placeholderTextColor={Colors.subtext}
              maxLength={1000}
              onSubmitEditing={() => send()}
              returnKeyType="send"
            />
            <TouchableOpacity
              accessibilityLabel="送出問題"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={[s.send, (loading || sessionLoading || !!sessionLoadError) && s.sendDisabled]}
              onPress={() => send()}
              disabled={loading || sessionLoading || !!sessionLoadError}
            >
              <Ionicons name="arrow-up" size={22} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
