/** 用途：統一間距、圓角與卡片陰影，新畫面與重新設計的畫面使用這些 token。 */
import { Colors } from './Colors';

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const CardShadow = {
  shadowColor: Colors.shadow,
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;

export const CardSurface = {
  summary: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.xl,
    borderWidth: 0,
    padding: Spacing.xl,
    ...CardShadow,
  },
  record: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    shadowOpacity: 0,
    elevation: 0,
  },
  hint: {
    backgroundColor: Colors.surfaceSoft,
    borderRadius: Radius.sm,
    borderWidth: 0,
    padding: Spacing.md,
    shadowOpacity: 0,
    elevation: 0,
  },
} as const;
