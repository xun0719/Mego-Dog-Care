# Reminders feature

- `reminderListContent.ts`: 提醒清單的插圖、狀態文案、日期篩選與分組；預設保留未來一年清單，收到 `scheduledDate` 時改篩選所選本地日期的所有狀態。
- `components/ReminderListHeader.tsx`：新增按鈕與清單範圍摘要。
- `components/ReminderListCard.tsx`：單筆提醒展示與操作列。
- `components/ReminderListState.tsx`：空白、錯誤、載入狀態。
- 畫面入口仍在 `../../screens/ReminderListScreen.tsx` 與 `../../screens/CreateReminderScreen.tsx`，維持既有 navigator routes。

`ReminderListScreen` 目前保留既有 navigator route；由時間軸開啟提醒來源會帶入選取日期，直接進入提醒分頁仍顯示全年排程。提醒卡片直接呈現完成／延後；編輯、略過、刪除由「更多」選單提供。操作 handler、通知同步與 API 不變。

首頁捷徑進入的是 `CreateReminderScreen`，表單採共用 `ScreenPageHeader` 排版 F（返回鍵／大標＋兩行內說明／右側提醒圖示）；新增與編輯共用版型，只切換標題。Home、Timeline 的 `CreateReminder` 都使用 `headerShown: false`，不另外顯示原生標題。提醒儲存、通知排程與未儲存離開確認不變。

提醒名稱與時間的錯誤顯示在欄位下方（`components/FieldError.tsx`），不使用對話框；原本名稱檢查夾在提早返回的條件中、其他情況按下按鈕沒有反應，已修正。儲存後若手機通知正常排定就直接返回；只有 MEGO 手機提醒已關閉、通知權限未開啟或時間已過不排程時才說明，權限未開啟可直接前往系統設定。
