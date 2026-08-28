import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { FamilyMember } from '@/lib/types';

type MemberPickerProps = {
  members: FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function MemberPicker({ members, selectedId, onSelect }: MemberPickerProps) {
  return (
    <ThemedView style={styles.container}>
      {members.map((member) => {
        const isSelected = member.user_id === selectedId;
        return (
          <Pressable
            key={member.user_id}
            onPress={() => onSelect(member.user_id)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type={isSelected ? 'backgroundSelected' : 'backgroundElement'} style={styles.row}>
              <ThemedText type={isSelected ? 'smallBold' : 'default'}>
                {member.profiles?.display_name || 'Unnamed'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
});
