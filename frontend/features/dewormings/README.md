# 驅蟲紀錄模組

入口：`screens/DewormingListScreen.tsx`。新增／編輯：`screens/DewormingFormScreen.tsx`。詳細頁：`screens/DewormingDetailScreen.tsx`。

資料流：`Screen → services/dewormingService.ts → /api/dewormings → backend service → MongoDB`。

`types.ts` 管理表單預設值、類型文字與日期防呆；`dewormingStyles.ts` 管理共用樣式。詳細頁不重複頁首已展示的使用日期，空白選填劑量／備註不顯示，編輯／複製按鈕等高。既有建立提醒、附件、編輯、複製與刪除 payload 保持不變。

驅蟲類型選項使用共用的表單版 `SelectionChip`，淡底、邊框與字重表示選取，文字置中且可換行；保留原有類型值。

表單最後的儲存按鈕與前方欄位間隔 24（`FORM_ACTION_GAP`），詳細頁刪除按鈕與編輯區間隔 16（`FORM_FIELD_GAP`）；不在共用按鈕一律加邊距，避免影響橫向操作列。

提醒區塊與疫苗、回診共用 `components/ReminderToggleField.tsx`，左側文字可換行，右側 Switch 不受表單標籤邊距影響、在外框中垂直置中。未選下次日期時顯示停用原因，清除日期後仍取消提醒。清除日期按鈕放在日期標題右側，不另占下方一列。

清單支援下拉更新。表單的必填檢查不使用對話框：產品名稱、使用日期與下次驅蟲日期的錯誤顯示在各自欄位下方（`components/FieldError.tsx`），送出時自動捲到第一個出錯的欄位並震動一次，開始輸入該欄即清除訊息，狀態由 `hooks/useFormFieldErrors.ts` 管理。儲存成功直接換到詳細頁，不另外提示；只有手機通知沒排成功時才顯示提醒。
