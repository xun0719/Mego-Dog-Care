import { SafeAreaView } from 'react-native-safe-area-context';
/** 用途：以大型快速選項讓使用者在數秒內選擇異常類型。 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenPageHeader } from '../components/ScreenPageHeader';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Colors } from '../constants/Colors';
import { useTabContentBottomPadding } from '../components/navigation/useTabContentBottomPadding';
import { HomeStackParamList } from '../navigation/types';
import { HealthEventType, ObservationHealthEventType } from '../types';
import { Type } from '../constants/Typography';

type Props = NativeStackScreenProps<HomeStackParamList, 'AbnormalType'>;
const TYPES: Array<[HealthEventType, string, keyof typeof Ionicons.glyphMap]> = [
  ['vomiting', '嘔吐', 'alert-circle-outline'],
  ['abnormal_stool', '排便異常', 'ellipse-outline'],
  ['low_appetite', '食慾下降', 'restaurant-outline'],
  ['abnormal_drinking', '喝水異常', 'water-outline'],
  ['low_energy', '精神下降', 'moon-outline'],
  ['injury', '受傷', 'bandage-outline'],
  ['skin_issue', '皮膚異常', 'search-outline'],
  ['eye_ear_issue', '眼睛／耳朵異常', 'eye-outline'],
  ['possible_ingestion', '疑似誤食', 'warning-outline'],
  ['other', '其他', 'create-outline'],
];

export default function AbnormalRecordTypeScreen({ navigation, route }: Props) {
  const bottomContentPadding = useTabContentBottomPadding();
  const quickEntry = route.params?.quickEntry === true;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomContentPadding }]}>
        <ScreenPageHeader
          style={styles.intro}
          title="記錄異常"
          description="發生什麼狀況？選一種記下"
          icon="alert-circle"
          iconColor={Colors.primaryDecoration}
          iconBackground={Colors.primarySoft}
        />
        {TYPES.map(([type, label, icon]) => (
          <TouchableOpacity
            key={type}
            accessibilityRole="button"
            accessibilityLabel={`新增${label}紀錄`}
            style={styles.item}
            onPress={() =>
              type === 'vomiting'
                ? navigation.navigate('VomitingHealthEvent', { quickEntry })
                : type === 'abnormal_stool'
                  ? navigation.navigate('StoolHealthEvent', { quickEntry })
                  : ['low_appetite', 'low_energy', 'abnormal_drinking'].includes(type)
                    ? navigation.navigate('ObservationHealthEvent', {
                        type: type as ObservationHealthEventType,
                        quickEntry,
                      })
                    : navigation.navigate('CreateHealthEvent', { type, label, quickEntry })
            }
          >
            <View style={styles.icon}>
              <Ionicons name={icon} size={24} color={Colors.primaryDecoration} />
            </View>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 18, paddingBottom: 34 },
  intro: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 20 },
  introIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { flex: 1, minWidth: 0 },
  title: { color: Colors.text, fontSize: Type.title1, fontWeight: '800' },
  subtitle: { color: Colors.subtext, lineHeight: 19, marginTop: 3, fontSize: Type.footnote },
  item: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  label: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: Type.callout },
  arrow: { color: Colors.subtext, fontSize: Type.display },
});
