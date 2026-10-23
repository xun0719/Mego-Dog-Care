import { Alert } from 'react-native';
import { hapticSuccess } from './haptics';

export function showQuickRecordFeedback({
  message,
  onDone,
  onAddAnother,
}: {
  message: string;
  onDone: () => void;
  onAddAnother: () => void;
}) {
  hapticSuccess();
  Alert.alert('已記錄', message, [
    { text: '完成', onPress: onDone },
    { text: '再記一筆', onPress: onAddAnother },
  ]);
}
