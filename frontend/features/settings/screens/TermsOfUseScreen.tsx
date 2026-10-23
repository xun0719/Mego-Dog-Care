/** 用途：使用條款內文頁。 */
import React from 'react';
import {
  SettingsDocumentParagraph,
  SettingsDocumentSection,
  SettingsPage as Page,
} from '../components/SettingsLayout';

export function TermsOfUseScreen() {
  return (
    <Page page="TermsOfUse">
      <SettingsDocumentSection title="帳號與 App 使用" index={1} icon="phone-portrait-outline">
        <SettingsDocumentParagraph>
          使用 MEGO 即表示你同意使用本 App
          建立與管理毛孩資料、健康紀錄、提醒、匯出及相關功能。你應提供真實且不侵害他人權利的內容，並妥善保管帳號登入資訊。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="健康資訊限制" index={2} icon="medkit-outline">
        <SettingsDocumentParagraph label="服務範圍">
          MEGO 是照護紀錄與整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="照護資訊請自行確認">
          用藥、疫苗、驅蟲與提醒內容請由飼主確認；毛孩出現嚴重或持續惡化症狀時，應立即聯絡合格動物醫院。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="AI 助手與資料" index={3} icon="sparkles-outline">
        <SettingsDocumentParagraph label="資料如何使用">
          首次使用生成式 AI，或 AI 資料使用說明更新時，須先確認該版本的說明。你輸入的問題會傳送至
          MEGO 設定的 AI 服務；同一對話最近最多 10
          則訊息可能一併傳送以延續脈絡，不同對話不會互相帶入。只有問題需要個人化照護資訊時，系統才會選取必要的毛孩資料或相關紀錄。選擇稍後或關閉確認視窗，不會開始該次
          AI 對話。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph label="回覆的使用限制" emphasis>
          AI 內容可能不完整或不準確，不能取代獸醫專業判斷；請勿將 AI 回覆視為診斷或治療指示。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
      <SettingsDocumentSection title="內容與服務" index={4} icon="construct-outline">
        <SettingsDocumentParagraph>
          你對自己上傳的資料負責。不得利用本 App
          從事違法、侵害他人權利或干擾服務的行為。功能可能因維護、版本更新或第三方服務狀態而調整。
        </SettingsDocumentParagraph>
        <SettingsDocumentParagraph emphasis>
          如不同意本條款，請停止使用 MEGO。
        </SettingsDocumentParagraph>
      </SettingsDocumentSection>
    </Page>
  );
}
