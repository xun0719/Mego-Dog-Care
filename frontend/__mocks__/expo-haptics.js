/** 觸覺回饋在測試環境沒有原生模組；保留呼叫記錄，讓測試能斷言有沒有觸發。 */
const { jest } = require('@jest/globals');

module.exports = {
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
};
