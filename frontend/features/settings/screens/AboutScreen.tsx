/** 用途：關於 MEGO 頁，顯示版本與健康資訊聲明。 */
import Constants from 'expo-constants';
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import {
  SettingsPage as Page,
  SettingsRow as Row,
  settingsPalette as palette,
} from '../components/SettingsLayout';
import { Colors } from '../../../constants/Colors';
import { Type } from '../../../constants/Typography';

export function AboutScreen() {
  const version = Constants.expoConfig?.version || '尚未確認';
  const build =
    Constants.expoConfig?.android?.versionCode ||
    Constants.expoConfig?.ios?.buildNumber ||
    '開發版本';
  return (
    <Page page="About">
      <Text style={s.aboutParagraph}>
        MEGO 是協助飼主低負擔記錄毛孩健康、提醒、體重與就醫資訊的行動 App。
      </Text>
      <Row title="App 版本" value={version} rowStyle={s.whiteSettingRow} />
      <Row title="建置版本" value={String(build)} rowStyle={s.whiteSettingRow} />
      <Text style={s.heading}>健康資訊聲明</Text>
      <Text style={s.aboutParagraph}>
        MEGO
        是紀錄與資訊整理工具，不提供疾病診斷、獸醫診斷替代、藥物處方或緊急醫療服務。若毛孩出現嚴重或持續惡化症狀，請聯絡合格動物醫院。
      </Text>
      {__DEV__ ? (
        <>
          <Text style={s.heading}>版本資訊</Text>
          <Row
            title="App 開發版本"
            value={String(Constants.expoConfig?.sdkVersion || '尚未確認')}
            rowStyle={s.whiteSettingRow}
          />
          <Row
            title="裝置平台"
            value={Platform.OS === 'ios' ? 'iPhone' : 'Android'}
            rowStyle={s.whiteSettingRow}
          />
          <Row title="服務環境" value="由 App 設定提供" rowStyle={s.whiteSettingRow} />
        </>
      ) : null}
    </Page>
  );
}

const s = StyleSheet.create({
  aboutParagraph: { fontSize: Type.body, lineHeight: 24, color: Colors.text, marginBottom: 12 },
  heading: {
    fontSize: Type.headline,
    fontWeight: '800',
    color: palette.text,
    marginTop: 24,
    marginBottom: 9,
  },
  whiteSettingRow: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 8,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
});
