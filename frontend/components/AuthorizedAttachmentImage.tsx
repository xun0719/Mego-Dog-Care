import React, { useEffect, useRef, useState } from 'react';
import { Image, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { API_BASE_URL, getValidAccessToken } from '../services/api';
import { Colors } from '../constants/Colors';
export default function AuthorizedAttachmentImage({
  id,
  userId,
  thumbnail = false,
  style,
}: {
  id: string;
  userId: string;
  thumbnail?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const reload = async () => {
    const captured = generation.current;
    try {
      const next = await getValidAccessToken();
      if (captured === generation.current) {
        setToken(next);
        setRetry((value) => value + 1);
        setFailed(!next);
      }
    } catch {
      if (captured === generation.current) setFailed(true);
    }
  };
  useEffect(() => {
    generation.current += 1;
    setToken(null);
    setFailed(false);
    void reload();
    return () => {
      generation.current += 1;
    };
  }, [id, userId]);
  return (
    <View style={[{ backgroundColor: Colors.surface, overflow: 'hidden' }, style]}>
      {failed || !token ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="重新載入照片"
          onPress={() => void reload()}
          style={{ flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: Colors.subtext }}>
            {failed ? '照片暫時無法顯示，點選重試' : '照片載入中，點選重試'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Image
          resizeMode={thumbnail ? 'cover' : 'contain'}
          style={{ width: '100%', height: '100%' }}
          source={{
            uri: `${API_BASE_URL}/api/attachments/${encodeURIComponent(id)}/${thumbnail ? 'thumbnail' : 'content'}?userId=${encodeURIComponent(userId)}&retry=${retry}`,
            headers: { Authorization: `Bearer ${token}` },
          }}
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}
