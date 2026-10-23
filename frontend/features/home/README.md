# 首頁模組

入口：`../../screens/HomeScreen.tsx`。首頁負責資料載入、通知同步與導航。

- `homeContent.ts`：固定操作清單與毛孩年齡文案。
- `components/HomePetHeader.tsx`：問候標頭、毛孩摘要與毛孩切換。
- `components/HomeAction.tsx`：日常與健康管理入口。
- `components/HomeTodayOverview.tsx`：今日待辦與健康觀察摘要。
- `components/FirstUseGuide.tsx`、`useFirstUseGuide.ts`：建立／選取照顧中的毛孩後，顯示可關閉的三項使用提示；本機按帳號保存已讀狀態，換毛孩不重複提示，刪除帳號時移除。沒有每日必填或強制教學。

資料來源：`dashboardService.ts`、`reminderService.ts`、`healthTrendEngine.ts`。背景由 `components/home/HomeBackgroundScene.tsx` 管理。

毛孩年齡依台灣日期計算。日常表單樣式拆至 `../daily-logs/dailyLogStyles.ts`，畫面與資料流程仍在 `../../screens/DailyLogScreen.tsx`。

首頁八個功能的目的地頁面統一採 `components/ScreenPageHeader.tsx` 排版 F：左側 44×44 圓角返回鍵、中間大標＋最多兩行說明、右側可選類別圖示。日常、記錄異常、體重及提醒改用頁內標題並關閉原生標題；相關表單、詳細頁及載入／錯誤狀態也沿用同一元件。首頁本身與 AI 對話標頭不變；儲存及未儲存離開確認仍走既有流程。

首頁「體重」實際開啟 `WeightForm`，「提醒」實際開啟 `CreateReminder`，不是紀錄清單。這兩個表單也採排版 F，標題依模式顯示「新增體重／編輯體重」與「新增提醒／編輯提醒」，不套舊標題卡外框；首頁與紀錄 Stack 的新增提醒 route 均關閉原生標題，避免入口不同造成重複標題。
