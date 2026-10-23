/** 用途：毛孩在回憶中時，首頁以紀念卡片取代新增紀錄的捷徑。 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SoftButton } from '../../../components/SoftMotion';
import { Colors } from '../../../constants/Colors';
import { Radius, Spacing } from '../../../constants/Layout';
import { Type } from '../../../constants/Typography';
import type { Pet } from '../../../types';
import { companionshipText, memorialPeriodText } from '../../pets/memorialContent';

type Props = {
  pet: Pet;
  compact: boolean;
  onOpenRecords: () => void;
  onOpenPhotos: () => void;
  onOpenWeights: () => void;
  onOpenMemorial: () => void;
};

const LINKS = [
  ['journal-outline', '回顧紀錄', 'records'],
  ['images-outline', '照護相簿', 'photos'],
  ['trending-up-outline', '體重曲線', 'weights'],
] as const;

export function HomeMemorialCard({
  pet,
  compact,
  onOpenRecords,
  onOpenPhotos,
  onOpenWeights,
  onOpenMemorial,
}: Props) {
  const period = memorialPeriodText(pet);
  const together = companionshipText(pet);
  const open = { records: onOpenRecords, photos: onOpenPhotos, weights: onOpenWeights };
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.badge}>
        <Ionicons name="flower-outline" size={15} color={Colors.memorial} />
        <Text style={styles.badgeText}>在回憶中</Text>
      </View>
      {period ? <Text style={styles.period}>{period}</Text> : null}
      {together ? <Text style={styles.together}>{together}</Text> : null}
      {pet.memorialNote ? (
        <Text style={styles.note} numberOfLines={compact ? 3 : 5}>
          「{pet.memorialNote}」
        </Text>
      ) : null}
      <View style={styles.links}>
        {LINKS.map(([icon, label, key]) => (
          <SoftButton
            key={key}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={styles.link}
            onPress={open[key]}
          >
            <Ionicons name={icon} size={22} color={Colors.memorial} />
            <Text style={styles.linkText}>{label}</Text>
          </SoftButton>
        ))}
      </View>
      <SoftButton
        accessibilityRole="button"
        accessibilityLabel="查看紀念頁"
        style={styles.memorialLink}
        onPress={onOpenMemorial}
      >
        <Text style={styles.memorialLinkText}>紀念頁</Text>
        <Ionicons name="chevron-forward" size={15} color={Colors.subtext} />
      </SoftButton>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    marginTop: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(239,234,228,0.94)',
  },
  cardCompact: { padding: Spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
  },
  badgeText: { color: Colors.memorial, fontSize: Type.footnote, fontWeight: '800' },
  period: { marginTop: Spacing.md, color: Colors.text, fontSize: Type.callout, fontWeight: '700' },
  together: { marginTop: Spacing.xxs, color: Colors.subtext, fontSize: Type.subhead },
  note: {
    marginTop: Spacing.md,
    color: Colors.text,
    fontSize: Type.body,
    lineHeight: 23,
    textAlign: 'center',
  },
  links: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg, alignSelf: 'stretch' },
  link: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
  },
  linkText: { color: Colors.text, fontSize: Type.footnote, fontWeight: '700' },
  memorialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  memorialLinkText: { color: Colors.subtext, fontSize: Type.footnote, fontWeight: '700' },
});
