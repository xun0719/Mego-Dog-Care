import { CardSurface } from '../constants/Layout';
/** 用途：提供相機、相簿、多張預覽、單張刪除與失敗重試的共用附件 UI。 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { RecordActionButton } from './RecordActionButton';
import { Attachment, AttachmentSourceType } from '../types';
import AuthorizedAttachmentImage from './AuthorizedAttachmentImage';
import type { ImagePickerAsset } from 'expo-image-picker';
import {
  uploadAttachmentAssets,
  pickAndUploadAttachments,
  AttachmentPickSource,
} from '../services/attachmentService';
import { Type } from '../constants/Typography';

interface Props {
  userId: string;
  petId: string;
  sourceType: AttachmentSourceType;
  limit: number;
  value: Attachment[];
  onChange: (items: Attachment[]) => void;
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
}
export default function AttachmentPicker({
  userId,
  petId,
  sourceType,
  limit,
  value,
  onChange,
  disabled,
  onBusyChange,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState<AttachmentPickSource | null>(null);
  const [retryAssets, setRetryAssets] = useState<ImagePickerAsset[]>([]);
  const uploadLock = useRef<symbol | null>(null);
  const owner = useRef({ userId, petId, generation: 0 });
  if (owner.current.userId !== userId || owner.current.petId !== petId)
    owner.current = { userId, petId, generation: owner.current.generation + 1 };
  const valueRef = useRef(value);
  valueRef.current = value;
  const callbackRef = useRef(onBusyChange);
  callbackRef.current = onBusyChange;
  useEffect(() => {
    uploadLock.current = null;
    setBusy(false);
    setRetryAssets([]);
    setError('');
    return () => {
      owner.current = { ...owner.current, generation: owner.current.generation + 1 };
      callbackRef.current?.(false);
    };
  }, [userId, petId]);
  const pick = async (source: AttachmentPickSource) => {
    if (uploadLock.current || disabled) return;
    const uploadToken = Symbol('upload');
    uploadLock.current = uploadToken;
    const captured = owner.current;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    setLast(source);
    try {
      const items = retryAssets.length
        ? await uploadAttachmentAssets(
            { userId, petId, sourceType },
            retryAssets.slice(0, limit - valueRef.current.length),
          )
        : await pickAndUploadAttachments({
            source,
            userId,
            petId,
            sourceType,
            remaining: limit - valueRef.current.length,
          });
      if (owner.current !== captured) return;
      onChange([...valueRef.current, ...items].slice(0, limit));
      setRetryAssets(items.failed ?? []);
      if (items.failed?.length)
        setError(
          `${items.length} 張已上傳，${items.failed.length} 張失敗；重試只處理失敗照片。${items.errors?.[0] ?? ''}`,
        );
    } catch (e) {
      if (owner.current === captured) setError((e as Error).message);
    } finally {
      if (uploadLock.current === uploadToken) uploadLock.current = null;
      if (owner.current === captured) {
        setBusy(false);
        onBusyChange?.(false);
      }
    }
  };
  const remove = (item: Attachment) =>
    Alert.alert('刪除照片', '儲存紀錄後才會移除照片；放棄編輯會保留原照片。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => onChange(value.filter((x) => x.id !== item.id)),
      },
    ]);
  return (
    <View style={s.wrap}>
      <Text style={s.title}>
        照片（{value.length}/{limit}）
      </Text>
      {value.length > 0 ? <Text style={s.uploaded}>已上傳照片，可新增或移除</Text> : null}
      <View style={s.actions}>
        <TouchableOpacity
          disabled={busy || disabled || value.length >= limit}
          style={s.button}
          onPress={() => pick('camera')}
        >
          <Ionicons name="camera-outline" size={18} color={Colors.text} />
          <Text style={s.buttonText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={busy || disabled || value.length >= limit}
          style={s.button}
          onPress={() => pick('library')}
        >
          <Ionicons name="images-outline" size={18} color={Colors.text} />
          <Text style={s.buttonText}>從相簿選擇</Text>
        </TouchableOpacity>
      </View>
      {busy && (
        <View style={s.status}>
          <ActivityIndicator />
          <Text>處理照片中…</Text>
        </View>
      )}
      {error ? (
        <View style={s.error}>
          <Text style={s.errorText}>{error}</Text>
          {last && (
            <TouchableOpacity onPress={() => pick(last)}>
              <Text style={s.retry}>重試</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {value.map((item) => (
          <View key={item.id} style={s.photo}>
            <AuthorizedAttachmentImage id={item.id} userId={userId} thumbnail style={s.image} />
            <RecordActionButton
              kind="delete"
              label="移除"
              iconOnly
              accessibilityLabel="移除附件"
              disabled={busy || disabled}
              style={s.remove}
              onPress={() => remove(item)}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { marginTop: 16 },
  title: { fontWeight: '700', color: Colors.text, marginBottom: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  button: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  buttonText: { color: Colors.text, fontWeight: '600', flexShrink: 1 },
  status: { flexDirection: 'row', gap: 8, marginTop: 10 },
  error: { ...CardSurface.hint, marginTop: 10 },
  errorText: { color: Colors.dangerText },
  retry: { color: Colors.primary, fontWeight: '800', marginTop: 4 },
  photo: { width: 120, height: 120, marginTop: 12, marginRight: 10 },
  image: { width: '100%', height: '100%', borderRadius: 12, backgroundColor: Colors.border },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
  },
  uploaded: { color: Colors.subtext, fontSize: Type.footnote, marginBottom: 6 },
  remove: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 12,
  },
});
