# Weights feature

- `weightListContent.ts`: 體重期間篩選、日期與差異文案。
- `components/WeightSummaryCard.tsx`: 最新體重摘要。
- `components/WeightLineChart.tsx`: 純 React Native 折線趨勢圖。
- `weightListStyles.ts`: 體重清單與展示元件共用樣式。
- 查看期間的 `FilterChip` 共用 `SelectionChip`：單選文字置中，以淡底、邊框及加粗文字區分選取狀態，不預留單邊圖示；與照護相簿、就醫前摘要一致，不改變期間計算或紀錄分類色。

`WeightLineChart` 以內層繪圖容器的實際寬度定位圖點，保留邊緣空間避免節點裁切。`WeightListScreen` 的歷史紀錄預設顯示最新 3 筆，可展開全部；篩選仍同時套用趨勢圖及清單。

既有 `WeightListScreen` 保留 navigator route、資料載入、刪除、重新整理與表單導航。

首頁捷徑開啟 `WeightFormScreen`，不是 `WeightListScreen`。表單的「新增體重／編輯體重」使用共用 `ScreenPageHeader` 排版 F；標題列沒有舊卡片外框，與其他快速紀錄頁一致。體重輸入、日期驗證、附件與儲存流程保持原樣。

體重與測量日期的錯誤顯示在欄位下方（`components/FieldError.tsx`），不使用對話框；送出時捲到第一個出錯的欄位並震動一次，修改該欄即清除訊息。
