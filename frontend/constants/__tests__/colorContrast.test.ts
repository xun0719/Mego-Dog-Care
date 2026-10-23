import { RECORD_CATEGORY_TEXT_COLORS, RECORD_CATEGORY_SURFACES } from '../RecordCategoryColors';
import { Colors } from '../Colors';
function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const [low, high] = [luminance(a), luminance(b)].sort((a, b) => a - b);
  return (high + 0.05) / (low + 0.05);
}
const surfaces = [
  Colors.surface,
  Colors.background,
  Colors.surfaceSoft,
  Colors.surfaceWarm,
  Colors.primarySoft,
  Colors.successSoft,
  Colors.memorialSoft,
  Colors.peachSoft,
];
test.each([
  'text',
  'subtext',
  'muted',
  'primary',
  'success',
  'successStrong',
  'successText',
  'dangerText',
  'memorial',
] as const)('%s text meets 4.5:1 on supported light surfaces', (role) => {
  for (const surface of surfaces)
    expect(contrast(Colors[role], surface)).toBeGreaterThanOrEqual(4.5);
});
test('primary buttons and AI hero copy meet 4.5:1', () => {
  expect(contrast(Colors.onPrimary, Colors.primary)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(Colors.primarySoft, Colors.primary)).toBeGreaterThanOrEqual(4.5);
});

test('category labels and reminder status labels meet 4.5:1', () => {
  for (const category of Object.keys(RECORD_CATEGORY_TEXT_COLORS) as Array<
    keyof typeof RECORD_CATEGORY_TEXT_COLORS
  >) {
    expect(contrast(RECORD_CATEGORY_TEXT_COLORS[category], Colors.surface)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(
      contrast(RECORD_CATEGORY_TEXT_COLORS[category], RECORD_CATEGORY_SURFACES[category]),
    ).toBeGreaterThanOrEqual(4.5);
  }
  expect(contrast(Colors.warningTitle, Colors.warningSoft)).toBeGreaterThanOrEqual(4.5);
});

test.each(['primaryDecoration', 'successDecoration', 'dangerDecoration'] as const)(
  '%s icons meet 3:1 on supported light surfaces',
  (role) => {
    for (const surface of surfaces)
      expect(contrast(Colors[role], surface)).toBeGreaterThanOrEqual(3);
  },
);

test('weight increase and navigation colors meet 4.5:1 on their surfaces', () => {
  expect(contrast(Colors.warningTitle, Colors.surface)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(Colors.primary, Colors.background)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(Colors.text, Colors.background)).toBeGreaterThanOrEqual(4.5);
});
