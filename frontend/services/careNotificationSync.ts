import { Pet } from '../types';
import { reconcileAccountNotifications } from './notificationService';

/**
 * 同步照護提醒的手機通知。失敗時只回傳訊息，由呼叫端決定怎麼顯示；
 * 這裡不自己跳對話框，否則呼叫端再提示一次會連續出現兩個。
 */
export async function syncCareNotifications(userId: string, pets: Pet[]) {
  try {
    await reconcileAccountNotifications(userId, pets);
  } catch {
    return '手機通知同步失敗，回到首頁或重新開啟 App 時會重試。';
  }
}
