# 健康異常表單與共用選項

## 畫面與返回

- `../../screens/StoolHealthEventScreen.tsx`：排便異常新增／編輯。
- `../../screens/VomitingHealthEventScreen.tsx`：嘔吐新增／編輯。
- `../../screens/ObservationHealthEventScreen.tsx`：食慾、精神與喝水異常新增／編輯。
- `../../screens/CreateHealthEventScreen.tsx`：其餘健康事件的新增表單。
- `../../screens/HealthEventEditScreen.tsx`：通用健康事件編輯。

以上表單使用日常同款 `ScreenPageHeader`，標題隨內容捲動，返回仍經過原有未儲存變更檢查。`navigation/SharedHealthScreens.tsx` 與 `navigation/MainTabs.tsx` 關閉對應的原生標題，不再同時呈現兩套頁首。需要讀取紀錄的表單，在載入與失敗時也用 `ScreenPageState` 保留返回入口。

## 選項與間距

- `components/HealthEventOptions.tsx`：排便／嘔吐選項的介接；群組內為單選，獨立狀況開關為複選。
- `components/HealthEventScreenState.tsx`：載入與失敗重試內容，放入有返回入口的頁面狀態框架。
- `createHealthEventContent.ts`：通用新增表單的快速問題與嚴重程度選項。
- `../../components/QuickHealthFields.tsx`：觀察類的單選、複選與安全提醒。
- `components/CreateHealthEventChoices.tsx`：通用事件問題，保留原本的字串值與展開流程。
- 上述元件共用 `components/SelectionChip.tsx` 的 `SelectionGroup` 與 `SelectionChip`；日常、提醒、驅蟲、用藥服用方式及毛孩性別／品種類型也使用同一套視覺規格。表單最小點選高度 48，篩選項維持精簡 44；文字可換行，不縮小字體或強制單行。
- 單選使用 `radio`、複選使用 `checkbox`，皆提供選取狀態；複選保留勾選圖示與左右等寬留位。各群組可提供名稱，避免多個「正常／偏少」無法辨別所屬欄位。
- 表單主要儲存操作使用 `FORM_ACTION_GAP`（24），欄位／獨立操作間使用 `FORM_FIELD_GAP`（16），不將間距直接加到所有共用按鈕。
- 共用頁首說明不再截斷於兩行，提供固定行距與自然換行。就醫開藥說明同樣取消固定 280 寬限制，使用可用欄寬。

本次只統整外觀與無障礙語意，不更改健康資料值、分類色、判斷規則、照片處理、日期模式或儲存／提醒流程。

## 保留的資料與流程

各異常類型的欄位、驗證、安全提醒與 API 仍各自留在對應畫面，不合併不同健康事件的判斷規則。必填錯誤由 `components/FieldError.tsx` 顯示在欄位下方，送出時捲至第一個錯誤並震動一次，修改後清除該欄訊息；儲存成功沿用返回清單／首頁的流程，符合安全提醒條件時仍須確認後才離開。

`HealthEventDetailScreen` 頁首顯示事件摘要、日期與嚴重程度，下方只呈現補充資料；附件由 `components/AttachmentGallery.tsx` 依父容器寬度排版，有照片與空狀態均不依賴整個螢幕寬度。這些詳情與附件規則維持不變。

## 自動檢查與實機驗收

自動測試：`__tests__/healthEventControls.test.tsx`、`screens/__tests__/healthEventHeaders.test.tsx`、`navigation/__tests__/healthHeaders.test.ts`，以及既有必填驗證、未儲存保護與日常資料測試。測試檢查單／複選值、頁首及返回、載入失敗狀態與長文字設定，不代表已驗證手機上的實際排版。

仍需實機驗收（尚未完成）：

- [ ] 小螢幕及放大字體：頁首、長標籤、單／複選均不被截斷。
- [ ] 次數選單：1～6／1～10 次可捲動，選取、取消及再次開啟正常。
- [ ] 多筆開藥卡片：展開／收合及欄位錯誤自動展開後，間距與捲動正常。
- [ ] 返回：從首頁或紀錄進入新增／編輯，均只有一個返回入口，未儲存提示正常。
- [ ] 系統旁白：可分辨單選與複選、選取狀態及群組名稱。
