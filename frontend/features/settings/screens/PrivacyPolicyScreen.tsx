/** 用途：隱私政策內文頁。 */
import React from 'react';
import {
  SettingsDocumentParagraph,
  SettingsDocumentSection,
  SettingsPage as Page,
} from '../components/SettingsLayout';

export function PrivacyPolicyScreen() {
  return (
    <Page page="PrivacyPolicy">
      <SettingsDocumentSection title="資料與用途" index={1} icon="folder-open-outline">
        <SettingsDocumentParagraph label="處理的資料">
          MEGO
          會依本政策處理你為照護毛孩而提供的資料，包括帳號資訊、毛孩基本資料、健康事件、體重、用藥、疫苗、驅蟲、就醫紀錄、提醒、附件與照片。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="使用目的">
          這些資料只用於建立時間軸、提供提醒、產生匯出報告，以及在你主動使用 AI
          助手時整理照護資訊。AI 回覆僅供紀錄整理與一般資訊參考，不代表醫療診斷。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="MEGO AI 資料使用" index={2} icon="sparkles-outline">
        <SettingsDocumentParagraph label="對話資料">
          首次開始 MEGO AI 對話前，App 會請你確認資料使用說明。使用生成式 AI
          回答時，你輸入的問題與同一對話最近最多 10 則訊息會傳送至 MEGO 設定的 AI
          服務，以延續對話脈絡；不同對話不會互相帶入。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照護紀錄的選取">
          若問題需要個人化照護資訊，系統會依問題選取必要的毛孩基本資料或相關照護紀錄，例如過敏、慢性病、日常觀察、就醫或用藥紀錄，不會一併傳送所有紀錄。一般生活問題不會附帶毛孩紀錄。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="服務處理與選擇">
          選擇稍後或關閉確認視窗時，不會開始該次 AI 對話或送出問題。AI 服務由 MEGO
          設定的服務提供者處理，資料的處理與保存方式可能依實際服務及部署設定而異；本政策不承諾服務提供者的特定保存期限或使用方式。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph>
          你可以在「設定 → AI 助手 → AI
          資料使用說明」查看資料使用內容。請避免在問題或紀錄中提供完成照護整理不需要的敏感資訊。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="資料分享與安全" index={3} icon="lock-closed-outline">
        <SettingsDocumentParagraph>
          MEGO
          不會將你的資料用於廣告販售。使用同步或匯出功能時，必要資料可能傳送至提供該功能的服務；我們會依部署環境採取適當的存取控制與傳輸保護。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照片與附件">
          當你主動上傳毛孩頭像或照護紀錄照片時，照片檔案會傳送並保存在 MEGO
          後端設定的檔案儲存區；MongoDB
          保存照片的索引與所屬毛孩／紀錄等中繼資料，不直接保存照片檔案本身。刪除照片、相關毛孩或照護紀錄，或刪除帳號時，系統會一併清除對應照片檔案及中繼資料。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="你的權利" index={4} icon="person-circle-outline">
        <SettingsDocumentParagraph>
          你可以在 App 中查看、編輯、匯出或刪除自己建立的毛孩與照護紀錄；永久刪除帳號可前往「設定 →
          我的帳號」。如有隱私問題，請透過產品提供的聯絡方式與我們聯繫。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph emphasis>
          本政策會在資料處理方式或服務功能重大變更時更新。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
    </Page>
  );
}
