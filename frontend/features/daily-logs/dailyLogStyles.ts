import { CardSurface } from '../../constants/Layout';
import { StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Type } from '../../constants/Typography';
import {
  FORM_FIELD_GAP,
  FORM_ACTION_GAP,
  FORM_PAGE_HORIZONTAL_PADDING,
  FORM_FIELD_LABEL_FONT_SIZE,
  FORM_FIELD_LABEL_FONT_WEIGHT,
  FORM_FIELD_LABEL_MARGIN_TOP,
  FORM_FIELD_LABEL_MARGIN_BOTTOM,
  FORM_BUTTON_HEIGHT,
  FORM_BUTTON_RADIUS,
} from '../../constants/FormTokens';

export const dailyLogStyles = StyleSheet.create({
  page: { paddingHorizontal: FORM_PAGE_HORIZONTAL_PADDING, paddingTop: 18, paddingBottom: 34 },
  pageDecoration: { alignItems: 'flex-end', minHeight: 20, marginBottom: 2 },
  pageArtwork: { width: 76, height: 51 },
  introHint: { color: Colors.subtext, fontSize: Type.caption, marginTop: 2, lineHeight: 17 },
  label: {
    fontSize: FORM_FIELD_LABEL_FONT_SIZE,
    fontWeight: FORM_FIELD_LABEL_FONT_WEIGHT,
    marginTop: FORM_FIELD_LABEL_MARGIN_TOP,
    marginBottom: FORM_FIELD_LABEL_MARGIN_BOTTOM,
    color: Colors.text,
  },
  classifierSection: {
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  classifierHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48 },
  classifierTitle: { color: Colors.text, fontSize: Type.subhead, fontWeight: '800' },
  classifierHint: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 17, marginTop: 5 },
  classifierWaiting: { width: 20, height: 20 },
  classifierActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  classifierButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 46,
    paddingHorizontal: 8,
    flexDirection: 'row',
    gap: 6,
  },
  classifierButtonText: {
    color: Colors.success,
    fontSize: Type.footnote,
    fontWeight: '700',
    flexShrink: 1,
  },
  suggestion: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  suggestionTitle: {
    color: Colors.text,
    fontSize: Type.footnote,
    lineHeight: 19,
    fontWeight: '800',
  },
  suggestionText: { color: Colors.subtext, fontSize: Type.caption, lineHeight: 17, marginTop: 3 },
  suggestionAction: { marginTop: FORM_FIELD_GAP },
  suggestionDisclaimer: {
    color: Colors.subtext,
    fontSize: Type.caption2,
    lineHeight: 16,
    marginTop: 5,
  },
  save: {
    marginTop: FORM_ACTION_GAP,
    backgroundColor: Colors.primary,
    padding: 14,
    minHeight: FORM_BUTTON_HEIGHT,
    borderRadius: FORM_BUTTON_RADIUS,
    alignItems: 'center',
  },
  saveText: { color: Colors.onPrimary, fontWeight: '700' },
  error: { ...CardSurface.hint, color: Colors.danger, marginBottom: 8 },
  deleteAction: {
    alignSelf: 'center',
    marginTop: 8,
  },
});
