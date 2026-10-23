# 設定模組

設定子頁位於 `screens/`，由 `navigation/MainTabs.tsx` 的 ProfileStack 直接匯入。

## 統一頁首與名稱

所有設定子頁關閉系統導覽列，改用與「日常紀錄」相同的 `ScreenPageHeader`：左側 44 × 44 圓角返回鍵、中間單一標題與可自然換行的說明、右側功能圖示。說明不再以兩行截斷，放大字體時仍保留完整內容。頁首隨內容捲動，左右與頂部的內容留白為 18；載入、錯誤與無資料畫面也保留相同名稱與返回鍵。設定主頁維持入口清單，不新增返回鍵。

`constants/PageLayout.ts` 定義主分頁左右 20、子頁左右 18、頂部 18 的規格。設定主頁與紀錄、MEGO AI 主頁及相簿對齊；設定子頁維持日常同款 18。首頁插畫構圖、底部膠囊與鍵盤避讓規則不因此更動。

- `settingsPages.ts`：設定入口、頁首與狀態畫面的名稱、說明及圖示來源。「我的帳號」不再另稱「使用者資訊／登入帳號」；「AI 資料使用說明」「隱私政策」與入口同名。
- `components/SettingsPageHeader.tsx`：包裝共用頁首及狀態畫面，統一圖示配色與內容間距。
- `components/SettingsLayout.tsx` 的 `SettingsPage` 必須傳入 `page`，自動放入頁首，呼叫頁不再另加大標題或介紹卡。
- 保留 ID 卡、條款章節、用量圖表與匯出選項；只統一頁首，不變更帳號、API、資料庫或操作流程。捲動內容維持底部導覽避讓間距。
- 「編輯毛孩資料」既有共用頁首保留；「回憶」「毛孩身分 QR 設定」「毛孩身分 QR」一併套用。回憶頁在照顧中顯示「移到回憶」，完成設定後顯示「回憶」，首頁與設定入口均不顯示原生標題；詳細紀念頁流程見 `../pets/README.md`。QR 的毛孩姓名放在 QR 卡片內，不再作為變動的頁面主標。
- `__tests__/settingsPageHeader.test.tsx`、`settingsScreens.test.tsx`、`settingsNavigation.test.ts`：檢查單一標題、返回、入口同名、安全區域、底部間距、載入／錯誤／空資料與關閉系統頁首的導航宣告。

- `components/SettingsLayout.tsx`：共用 `SettingsPage`、`SettingsRow`、色彩 token 與文件章節卡／段落元件；AI 資料使用說明、隱私政策與使用條款採同一閱讀層級，舊的文件大標題卡已移除。
- `components/SettingsHomeRows.tsx`：設定首頁分組與可點擊資料列。
- 毛孩身分卡統一使用 `../pets/components/PetIdentityCarousel.tsx`，由設定與首頁選擇器共用同一套卡片、滑動與切換行為。
- `screens/PetManagementScreen.tsx`：毛孩管理與身分 QR 入口。
- `screens/NotificationSettingsScreen.tsx`：手機權限與照護提醒（通知、相簿、相機、定位）。
- `screens/AboutScreen.tsx`：關於 MEGO，版本與健康資訊聲明。
- `screens/PrivacyPolicyScreen.tsx`、`screens/TermsOfUseScreen.tsx`：隱私政策與使用條款內文。
- `screens/AIUsageScreen.tsx`：顯示今天的 AI 使用次數與近 7 天每日用量，由 `getAIUsage`、`getAIUsageHistory` 讀取；僅供查看，不改額度規則。
- `screens/AIDataUseInfoScreen.tsx`：唯讀呈現 MEGO AI 問答及毛孩資料使用方式；同意於首次啟動對話時記錄，不在此頁切換。
- `screens/AccountInfoScreen.tsx`：「我的帳號」，顯示 Email 與帳號刪除操作，沿用既有 `useAuth` Session。
- `screens/index.ts`：導航匯出入口。

設定首頁位於 `../../screens/SettingsHomeScreen.tsx`，只保留設定入口、AI 用量摘要與登出；AI 使用狀況及帳號資訊由 ProfileStack 原本的 `AIUsage`、`AccountInfo` route 開啟。

AI 用量讀取失敗時，首頁顯示「暫時無法取得」，用量頁顯示錯誤與重試；不再把失敗誤顯示為「不限次數」或 0 次。用量頁顯示今天的額度狀態及後端按台灣日期回傳的近 7 天每日次數（包含 0 次日期）。

每個設定頁仍維持原 route 與導航目的地。

定位狀態透過 `getForegroundPermissionsAsync` 唯讀查詢，不索取授權也不讀取座標；重新進入頁面或從手機設定返回後會更新。定位請求僅由就醫地圖的「使用目前位置」觸發，不使用背景定位。權限不可讀時明確顯示「暫時無法讀取」，不假設已允許。
