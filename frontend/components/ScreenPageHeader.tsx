import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { Type } from '../constants/Typography';
import { Spacing } from '../constants/Layout';
import { SoftButton } from './SoftMotion';

/** Page-owned heading and back action; navigation guards still handle goBack. */
export function ScreenPageHeader({
  title,
  description,
  icon,
  iconColor,
  iconBackground = Colors.successSoft,
  showBack = true,
  backLabel = '返回上一頁',
  onBack,
  style,
}: {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const navigation = useNavigation();
  return (
    <View style={[style, styles.header]}>
      {showBack && (
        <SoftButton
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          style={styles.back}
          onPress={onBack ?? (() => navigation.goBack())}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </SoftButton>
      )}
      <View style={[styles.copy, showBack && styles.copyWithBack]}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {!!description && <Text style={styles.description}>{description}</Text>}
      </View>
      {!!icon && (
        <View
          style={[styles.icon, { backgroundColor: iconBackground }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Ionicons name={icon} size={23} color={iconColor ?? Colors.successDecoration} />
        </View>
      )}
    </View>
  );
}

/** Screens that previously relied on the native header now own their safe area. */
export function ScreenPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.frame}>
      {children}
    </SafeAreaView>
  );
}

/** Loading, missing-data and error views must retain a visible way back. */
export function ScreenPageState({
  title,
  description,
  icon,
  iconColor,
  iconBackground,
  children,
}: {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBackground?: string;
  children: React.ReactNode;
}) {
  return (
    <ScreenPageFrame>
      <ScreenPageHeader
        title={title}
        description={description}
        icon={icon}
        iconColor={iconColor}
        iconBackground={iconBackground}
        style={styles.stateHeader}
      />
      {children}
    </ScreenPageFrame>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8, paddingBottom: 7, gap: 0 },
  back: {
    width: 44,
    height: 44,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: Colors.surfaceSoft,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0 },
  copyWithBack: { marginLeft: Spacing.sm },
  title: { color: Colors.text, fontSize: Type.title2, fontWeight: '800' },
  description: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 20, marginTop: 2 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stateHeader: { marginHorizontal: 18, marginTop: 18, marginBottom: 12 },
});
