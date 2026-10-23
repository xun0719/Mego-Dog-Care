/**
 * 用途：集中觸覺回饋。Apple 人機介面指南建議在動作完成、警告與破壞性確認時
 * 給一次輕微的震動；此處只提供三種語意，呼叫端不直接碰 expo-haptics。
 *
 * 失敗一律吞掉：模擬器、未支援的裝置或系統關閉觸覺時都會丟出，
 * 這只是輔助回饋，不應影響原本的流程。
 */
import * as Haptics from 'expo-haptics';

/** 儲存、送出成功。 */
export function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

/** 失敗或驗證不通過。 */
export function hapticError() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
}

/** 刪除等破壞性操作的確認。 */
export function hapticWarning() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}
