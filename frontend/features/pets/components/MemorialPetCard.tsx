import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';
import { Colors } from '../../../constants/Colors';
import type { Pet } from '../../../types';
import { companionshipText, memorialPeriodText } from '../memorialContent';
import { memorialStyles as styles } from '../memorialStyles';

export function MemorialPetCard({ pet, userId }: { pet: Pet; userId?: string }) {
  const avatar = (
    <View style={[styles.avatarRing, !pet.memorial && styles.compactAvatar]}>
      {pet.avatarAttachmentId && userId ? (
        <AuthenticatedPetAvatar
          attachmentId={pet.avatarAttachmentId}
          userId={userId}
          style={styles.avatar}
          fallback={<Ionicons name="paw" size={pet.memorial ? 36 : 28} color={Colors.memorial} />}
        />
      ) : (
        <Ionicons name="paw" size={pet.memorial ? 36 : 28} color={Colors.memorial} />
      )}
    </View>
  );
  if (!pet.memorial)
    return (
      <View style={styles.activeCard}>
        {avatar}
        <View style={styles.petCopy}>
          <Text style={styles.petLabel}>這次設定的毛孩</Text>
          <Text style={styles.name}>{pet.name}</Text>
        </View>
      </View>
    );
  const period = memorialPeriodText(pet);
  const together = companionshipText(pet);
  return (
    <View style={styles.memorialCard}>
      {avatar}
      <Text style={[styles.name, styles.memorialName]}>{pet.name}</Text>
      <View style={styles.badge}>
        <Ionicons name="flower-outline" size={14} color={Colors.memorial} />
        <Text style={styles.badgeText}>在回憶中</Text>
      </View>
      {!!period && <Text style={styles.period}>{period}</Text>}
      {!!together && <Text style={styles.together}>{together}</Text>}
      {!!pet.memorialNote && <Text style={styles.note}>{pet.memorialNote}</Text>}
    </View>
  );
}
