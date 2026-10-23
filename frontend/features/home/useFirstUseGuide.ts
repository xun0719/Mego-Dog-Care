/** 首次使用提示僅記在本機，依帳號隔離，不影響紀錄或 AI 同意設定。 */
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firstUseGuideKey = (userId: string) => `mego:first-use:${userId}:v1`;
export const clearFirstUseGuide = (userId: string) =>
  AsyncStorage.removeItem(firstUseGuideKey(userId));

export function useFirstUseGuide(userId?: string, enabled = true) {
  const [visibleOwner, setVisibleOwner] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const owner = useRef(userId);
  owner.current = userId;
  useEffect(() => {
    let active = true;
    setVisibleOwner('');
    setSaving(false);
    setError('');
    if (userId && enabled) {
      void AsyncStorage.getItem(firstUseGuideKey(userId))
        .then((value) => {
          if (active && value !== 'done') setVisibleOwner(userId);
        })
        .catch(() => {
          if (active) setVisibleOwner(userId);
        });
    }
    return () => {
      active = false;
    };
  }, [userId, enabled]);

  const dismiss = async () => {
    if (!userId || saving) return;
    const target = userId;
    setSaving(true);
    setError('');
    try {
      await AsyncStorage.setItem(firstUseGuideKey(target), 'done');
      if (owner.current === target) setVisibleOwner('');
    } catch {
      if (owner.current === target) setError('暫時無法保存提示設定，請再試一次。');
    } finally {
      if (owner.current === target) setSaving(false);
    }
  };
  return { visible: enabled && !!userId && visibleOwner === userId, saving, error, dismiss };
}
