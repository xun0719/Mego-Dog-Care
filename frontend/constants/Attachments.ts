/**
 * 用途：集中管理三種健康紀錄的附件限制。
 * 張數上限的來源是 backend/app/core/policy_defaults.json（後端同樣讀取該檔），
 * 此處的數值由 utils/__tests__/healthTrendRules.test.ts 比對，改規則請改共用檔。
 */
const uploadMaxMbValue = process.env.EXPO_PUBLIC_MEGO_UPLOAD_MAX_MB?.trim();
const configuredUploadMaxMb = uploadMaxMbValue ? Number(uploadMaxMbValue) : Number.NaN;
export const MEGO_UPLOAD_MAX_MB = Number.isInteger(configuredUploadMaxMb)
  ? Math.min(50, Math.max(1, configuredUploadMaxMb))
  : 10;
export const MEGO_UPLOAD_MAX_BYTES = MEGO_UPLOAD_MAX_MB * 1024 * 1024;
export const ATTACHMENT_MAX_BYTES = MEGO_UPLOAD_MAX_BYTES;
export const ATTACHMENT_LIMITS = {
  weight: 3,
  health_event: 5,
  medical_visit: 10,
} as const;
export const ATTACHMENT_ALLOWED_MIME = ['image/jpeg', 'image/png'] as const;
