import { RoundActionButton } from '@/components/round-action-button';
import { ActionIcons } from '@/constants/icons';

type SendButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function SendButton({ onPress, disabled, loading }: SendButtonProps) {
  return (
    <RoundActionButton
      icon={ActionIcons.send}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      accessibilityLabel="Add task"
    />
  );
}
