# 毛孩身分 QR 模組

- `screens/PetIdentityScreens.tsx`：身分資料設定與身分 QR 顯示，保留既有 `LostPetSettings`、`LostPetQr` route。
- `identityFields.ts`：聯絡欄位、公開開關與預設公開範圍。
- `components/IdentityPresentation.tsx`：身分頁標頭、提示與共用樣式。
- `screens/index.ts`：導航匯出入口。

公開欄位、QR token 更新、分享內容與後端 API 均維持原行為。
頁首與設定子頁共用 `../settings/components/SettingsPageHeader.tsx`；名稱分別固定為「毛孩身分 QR 設定」與「毛孩身分 QR」，載入與錯誤時同名且可返回。QR 卡片內顯示毛孩姓名，避免長姓名擠壓頁首。
設定頁與 QR 頁的讀取失敗顯示錯誤與重試；未建立身分資料、缺少公開網址、缺少 token 分別提示。分享與更新連結失敗會顯示原因。
`navigation/MainTabs.tsx` 直接匯入此模組；無引用的舊 `../../screens/LostPetScreens.tsx` 相容入口已移除。

「至少公開一種聯絡方式」是跨欄位規則，錯誤顯示在聯絡公開範圍那一區下方並捲到該區，不使用對話框。儲存後停留在原頁、沒有轉場可當回饋，因此以 `components/SaveStatusNotice.tsx` 在頁面上顯示訊息，成功數秒後自動收起。
