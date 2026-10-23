import { FORM_PAGE_HORIZONTAL_PADDING } from './FormTokens';
import { Spacing } from './Layout';

/** 主分頁留白略寬，功能子頁與日常表單一致；不控制浮動導覽及鍵盤。 */
export const PageLayout = {
  mainHorizontal: Spacing.xl,
  detailHorizontal: FORM_PAGE_HORIZONTAL_PADDING,
  top: FORM_PAGE_HORIZONTAL_PADDING,
} as const;
