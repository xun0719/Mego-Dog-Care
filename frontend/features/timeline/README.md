# Timeline feature

- `timelineContent.ts`: 時間軸篩選、排序、清單分頁大小與篩選文案。
- `components/TimelineHeader.tsx`：毛孩摘要、篩選列與目前清單標題。
- `components/TimelineCard.tsx`：單筆時間軸紀錄。
- `components/TimelineStates.tsx`：切換、錯誤重試、空清單狀態。

既有 `TimelineScreen` 保留 navigator route、載入狀態、分頁、重新整理與來源畫面導航。點選提醒來源時會將目前選取的台灣日期交給提醒清單，以顯示該日提醒；其他來源仍導向原本詳細頁。「照護相簿」由紀錄頁右上角進入，不是獨立底部分頁，也不產生額外時間軸紀錄。

月曆初始月份、今天按鈕、日期標記及 API 的 `timeZone` 固定以 `Asia/Taipei` 為準。月曆格子使用本機 Date 作為年月日容器，查詢時轉成台灣午夜邊界；不能把格子的 Date 當成事件實際發生時間。
