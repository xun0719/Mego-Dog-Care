import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import { formatTaipeiDate } from '../../../utils/taipeiDate';
import type { CarePhoto } from '../carePhotoContent';
import { styles } from '../carePhotoStyles';
import CarePhotoImage from './CarePhotoImage';

export default function CarePhotoViewer({
  photo,
  userId,
  token,
  onClose,
  onOpenRecord,
}: {
  photo: CarePhoto | null;
  userId: string;
  token: string | null;
  onClose: () => void;
  onOpenRecord: (photo: CarePhoto) => void;
}) {
  // Modal 是獨立原生畫面，以目前視窗安全區同步初始化，避免第一次開啟從 0 跳動。
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={!!photo}
      presentationStyle="fullScreen"
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {!!photo && (
        <SafeAreaProvider initialMetrics={{ frame, insets }} style={styles.page}>
          <PhotoDetails
            photo={photo}
            userId={userId}
            token={token}
            onClose={onClose}
            onOpenRecord={onOpenRecord}
          />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

/** 圖片使用扣除標題與安全區後的 ScrollView 高度，而非整個螢幕高度。 */
export function carePhotoPreviewHeight(availableHeight: number) {
  return availableHeight > 0 ? Math.min(Math.max(availableHeight * 0.55, 160), 480) : 240;
}

function PhotoDetails({
  photo,
  userId,
  token,
  onClose,
  onOpenRecord,
}: {
  photo: CarePhoto;
  userId: string;
  token: string | null;
  onClose: () => void;
  onOpenRecord: (photo: CarePhoto) => void;
}) {
  const [availableHeight, setAvailableHeight] = useState(0);
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
      <View style={styles.viewerHeader}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="關閉照片"
          style={styles.iconButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.petName}>照片詳情</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}
        contentContainerStyle={[styles.viewerBody, { paddingBottom: 24 + insets.bottom }]}
      >
        <CarePhotoImage
          photo={photo}
          userId={userId}
          token={token}
          style={{
            height: carePhotoPreviewHeight(availableHeight),
            aspectRatio: undefined,
          }}
        />
        <Text style={styles.label}>
          {photo.categoryLabel} · {formatTaipeiDate(photo.recordAt)}
        </Text>
        <Text style={styles.detailTitle}>{photo.title}</Text>
        <View style={styles.detailSection}>
          <Text style={styles.label}>補充備註</Text>
          <Text style={styles.body}>{photo.notes || '這筆紀錄沒有補充備註。'}</Text>
        </View>
        {!!photo.createdAt && (
          <Text style={styles.label}>
            上傳日期：{formatTaipeiDate(photo.createdAt)}（與紀錄日期分開）
          </Text>
        )}
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.primary]}
          onPress={() => onOpenRecord(photo)}
        >
          <Text style={[styles.buttonText, styles.primaryText]}>查看原始紀錄</Text>
        </TouchableOpacity>
        <Text style={styles.label}>照片沿用原始紀錄；編輯或刪除請從原始紀錄操作。</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
