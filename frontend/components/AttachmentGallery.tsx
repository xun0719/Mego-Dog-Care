/** 用途：詳細頁可水平滑動查看附件，並在載入失敗時提供 placeholder 與重試。 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, LayoutChangeEvent } from 'react-native';
import { Attachment } from '../types';
import AuthorizedAttachmentImage from './AuthorizedAttachmentImage';
import { Colors } from '../constants/Colors';
export default function AttachmentGallery({
  items,
  userId,
}: {
  items: Attachment[];
  userId: string;
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setContainerWidth(event.nativeEvent.layout.width);
  const imageWidth = Math.min(Math.max(containerWidth - 24, 0), 420);
  return (
    <View style={s.container} onLayout={onLayout}>
      {items.length ? <Text style={s.count}>📷 {items.length} 張照片</Text> : null}
      {items.length ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {items.map((x) => (
            <View key={x.id} style={{ width: containerWidth, alignItems: 'center' }}>
              <AuthorizedAttachmentImage
                id={x.id}
                userId={userId}
                style={[s.image, { width: imageWidth }]}
              />
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={s.emptyState}>
          <Text style={s.empty}>目前沒有照片</Text>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  container: { width: '100%', minWidth: 0 },
  count: { fontWeight: '700', color: Colors.text, marginBottom: 8 },
  image: { height: 280, borderRadius: 14, backgroundColor: Colors.surface },
  placeholder: {
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  retry: { color: Colors.primary, fontWeight: '800', marginTop: 8 },
  emptyState: {
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: Colors.surface,
  },
  empty: { color: Colors.subtext },
});
