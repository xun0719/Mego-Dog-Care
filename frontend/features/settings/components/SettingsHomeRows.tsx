import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/Colors';
import AuthenticatedPetAvatar from '../../../components/AuthenticatedPetAvatar';
import { usePressFeedback } from '../../../hooks/usePressFeedback';
import { Type } from '../../../constants/Typography';

export function SettingsHomeSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.section}>{title}</Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

type RowProps = {
  title: string;
  value?: string;
  description?: string;
  onPress: () => void;
  danger?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  imageAttachmentId?: string;
  imageUserId?: string;
};

export function SettingsHomeRow({
  title,
  value,
  description,
  onPress,
  danger = false,
  icon = 'ellipse-outline',
  imageAttachmentId,
  imageUserId,
}: RowProps) {
  const feedback = usePressFeedback();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={[title, value, description].filter(Boolean).join('，')}
        style={({ pressed }) => [styles.row, feedback(pressed)]}
        onPress={onPress}
      >
        <View style={styles.rowIcon}>
          {imageAttachmentId && imageUserId ? (
            <AuthenticatedPetAvatar
              attachmentId={imageAttachmentId}
              userId={imageUserId}
              style={styles.rowAvatar}
              fallback={
                <Ionicons
                  name={icon}
                  size={19}
                  color={danger ? Colors.dangerDecoration : Colors.successDecoration}
                />
              }
            />
          ) : (
            <Ionicons
              name={icon}
              size={19}
              color={danger ? Colors.dangerDecoration : Colors.successDecoration}
            />
          )}
        </View>
        <View style={styles.copy}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.title, danger && styles.danger]}
          >
            {title}
          </Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        <View style={styles.accessory}>
          {value ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[styles.value, danger && styles.danger]}
            >
              {value}
            </Text>
          ) : null}
          <Text style={[styles.chevron, danger && styles.danger]}>›</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: Type.footnote,
    fontWeight: '800',
    color: Colors.subtext,
    marginTop: 20,
    marginBottom: 7,
    marginLeft: 5,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  rowAvatar: { width: 32, height: 32, borderRadius: 10 },
  copy: { flex: 1, minWidth: 0 },
  description: { color: Colors.subtext, fontSize: Type.footnote, lineHeight: 19, marginTop: 4 },
  title: { fontSize: Type.body, fontWeight: '700', color: Colors.text },
  accessory: { maxWidth: '42%', flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  value: { flexShrink: 1, fontSize: Type.footnote, color: Colors.subtext, textAlign: 'right' },
  chevron: { marginLeft: 8, fontSize: Type.title2, lineHeight: 22, color: Colors.subtext },
  danger: { color: Colors.danger },
});
