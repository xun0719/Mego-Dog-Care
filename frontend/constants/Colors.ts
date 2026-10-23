/** 用途：集中定義 MEGO 的暖色照護介面 token；畫面不直接寫色碼，改用這裡的語意名稱。 */
export const Colors = {
  // 主色
  primaryDecoration: '#B7653B', // 插畫與裝飾保留原暖色
  primary: '#984B2C', // 互動／文字用色（白字對比 ≥ 4.5）
  primarySoft: '#F3E1D5',
  onPrimary: '#FFFFFF',

  // 背景與表面
  background: '#F7F4EE',
  surface: '#FFFFFF',
  surfaceSoft: '#FFF9F2',
  surfaceWarm: '#FFF4E8',
  peachSoft: '#F8EBDD',

  // 文字
  text: '#2F2925',
  subtext: '#685F57',
  muted: '#6B6057',
  disabled: '#B8B1AA',

  // 邊框與陰影
  border: '#E4DDD4',
  borderStrong: '#D5CEC6',
  shadow: '#8B684D',
  overlay: 'rgba(47,41,37,0.35)',

  // 狀態：成功／說明
  successDecoration: '#59896B', // 暖綠圖示，淡色底對比 ≥ 3:1
  success: '#3F6F53',
  successStrong: '#356C53',
  successSoft: '#E7F2EA',
  successText: '#4B6558',

  // 狀態：錯誤／刪除
  dangerDecoration: '#C56553', // 暖紅圖示，淡色底對比 ≥ 3:1
  danger: '#B42318',
  dangerText: '#B42318',
  dangerSoft: '#FBE9E5',

  // 狀態：安全提醒
  warningSoft: '#FFF3E4',
  warningBorder: '#F0C58A',
  warningTitle: '#8A5420',
  warningText: '#70451D',

  // 回憶模式（已離開的毛孩）
  memorial: '#6E6258',
  memorialSoft: '#EFEAE4',
};
