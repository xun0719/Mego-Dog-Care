/** 用途：集中管理首頁居家照護世界的素材與輔助色彩。 */
import { ImageSourcePropType } from 'react-native';
import { HomeThemeId } from './HomeThemeIds';

export { DEFAULT_HOME_THEME, HOME_THEME_IDS, isHomeThemeId } from './HomeThemeIds';

export interface HomeTheme {
  id: HomeThemeId;
  title: string;
  description: string;
  background: ImageSourcePropType;
  canvasWidth: number;
  canvasHeight: number;
  accent: string;
  iconSurface: string;
  iconColor: string;
}

export const HOME_THEMES: Record<HomeThemeId, HomeTheme> = {
  'morning-home': {
    id: 'morning-home',
    title: '晨光小屋',
    description: '窗邊晨光、牽繩與水碗，安靜開始今天的照護。',
    background: require('../assets/artwork/themes/morning-home/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1820,
    accent: '#B7653B',
    iconSurface: 'rgba(243, 237, 220, 0.94)',
    iconColor: '#A9603D',
  },
  'afternoon-living-room': {
    id: 'afternoon-living-room',
    title: '午後客廳',
    description: '暖燈、玩具與水碗，留下一段安心的陪伴時光。',
    background: require('../assets/artwork/themes/afternoon-living-room/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1821,
    accent: '#A96846',
    iconSurface: 'rgba(245, 232, 218, 0.94)',
    iconColor: '#92593C',
  },
  'garden-walk': {
    id: 'garden-walk',
    title: '花園散步',
    description: '綠意、牽繩與石板路，收藏一起出門的好心情。',
    background: require('../assets/artwork/themes/garden-walk/background-v2.webp'),
    canvasWidth: 864,
    canvasHeight: 1820,
    accent: '#64866D',
    iconSurface: 'rgba(230, 241, 231, 0.94)',
    iconColor: '#597A61',
  },
};
export const HOME_THEME_HEALTH_EMPTY_ARTWORK: Record<HomeThemeId, ImageSourcePropType> = {
  'morning-home': require('../assets/artwork/themes/morning-home/page-decorations/health-empty-v1.webp'),
  'afternoon-living-room': require('../assets/artwork/themes/afternoon-living-room/page-decorations/health-empty-v1.webp'),
  'garden-walk': require('../assets/artwork/themes/garden-walk/page-decorations/health-empty-v1.webp'),
};
