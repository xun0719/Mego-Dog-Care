import type { ComponentProps } from 'react';
import type { ScreenPageHeader } from '../../components/ScreenPageHeader';

/** 設定入口、頁首與狀態畫面共用名稱；內部 route 不變。 */
export const SETTINGS_PAGES = {
  AccountInfo: {
    title: '我的帳號',
    description: '查看登入帳號與管理帳號資料',
    icon: 'person-outline',
  },
  PetManagement: {
    title: '我的毛孩',
    description: '切換毛孩、編輯資料與管理身分 QR',
    icon: 'paw-outline',
  },
  NotificationSettings: {
    title: '手機權限與提醒',
    description: '查看照片、相機、定位與通知權限',
    icon: 'settings-outline',
  },
  HomeTheme: {
    title: '照護小屋風格',
    description: '選擇喜歡的首頁場景，隨時都能更換',
    icon: 'home-outline',
  },
  AIUsage: {
    title: 'AI 使用紀錄',
    description: '查看今天與最近七天使用 MEGO AI 的次數',
    icon: 'sparkles-outline',
  },
  AIDataUseInfo: {
    title: 'AI 資料使用說明',
    description: '了解 AI 問答與毛孩資料的使用方式',
    icon: 'information-circle-outline',
  },
  ExportCenter: {
    title: '匯出照護紀錄',
    description: '將照護資料整理成 PDF，保存或提供獸醫參考',
    icon: 'document-text-outline',
  },
  About: {
    title: '關於 MEGO',
    description: '了解 MEGO、版本與健康資訊聲明',
    icon: 'heart-outline',
  },
  PrivacyPolicy: {
    title: '隱私政策',
    description: '了解個人資料的使用方式',
    icon: 'shield-checkmark-outline',
  },
  TermsOfUse: {
    title: '使用條款',
    description: '了解 MEGO 的服務使用原則',
    icon: 'document-text-outline',
  },
  LostPetSettings: {
    title: '毛孩身分 QR 設定',
    description: '選擇掃描者可以查看的毛孩與聯絡資料',
    icon: 'qr-code-outline',
  },
  LostPetQr: {
    title: '毛孩身分 QR',
    description: '掃描後只顯示你選擇公開的資料',
    icon: 'qr-code-outline',
  },
  PetMemorial: {
    title: '回憶',
    description: '保留毛孩一起生活的紀錄與照片',
    icon: 'flower-outline',
  },
} as const satisfies Record<string, ComponentProps<typeof ScreenPageHeader>>;

export type SettingsPageKey = keyof typeof SETTINGS_PAGES;
