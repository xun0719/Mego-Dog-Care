# 疫苗紀錄模組

入口：`screens/VaccinationListScreen.tsx`；表單：`screens/VaccinationFormScreen.tsx`；詳細頁：`screens/VaccinationDetailScreen.tsx`。

資料流：`Screen → services/vaccinationService.ts → /api/vaccinations → backend service → MongoDB`。

`types.ts` 負責日期防呆與表單預設值；`vaccinationStyles.ts` 集中共用樣式。詳細頁頁首展示接種日期，資料區不重複該日期；未填醫院與備註不顯示。編輯／複製按鈕等高。接種日期、下次接種日期、提醒、附件、編輯、複製與刪除行為均保留。

表單最後的儲存按鈕與前方欄位間隔 24（`FORM_ACTION_GAP`），詳細頁刪除按鈕與編輯區間隔 16（`FORM_FIELD_GAP`）；同組選項與提醒開關原有間距保留。

提醒區塊使用共用 `components/ReminderToggleField.tsx`：左側標題與說明可換行，右側 Switch 固定寬度、在框內垂直置中。開啟時淡綠底，未選下次日期時停用並說明原因；日期清除後仍取消提醒。清除日期按鈕位於日期標題右側。

清單支援下拉更新。表單的必填檢查不使用對話框：疫苗名稱、接種日期與下次接種日期的錯誤顯示在各自欄位下方（`components/FieldError.tsx`），送出時自動捲到第一個出錯的欄位並震動一次，開始輸入該欄即清除訊息，狀態由 `hooks/useFormFieldErrors.ts` 管理。儲存成功直接換到詳細頁，不另外提示；只有手機通知沒排成功時才顯示提醒。
