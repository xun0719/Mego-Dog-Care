import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * 間距與圓角的 token 採用率遠低於色彩與字級（色彩與字級各有測試把關，
 * 這兩項原本沒有）。既有的硬編碼數量先記成基準，這支測試只擋「變多」：
 * 新檔案不得有硬編碼，既有檔案不得超過基準。改寫成 token 後基準會比實際
 * 大，另一支測試會指出可以調降的條目，基準因此只會往下走。
 *
 * 要重新產生基準：UPDATE_LAYOUT_BASELINE=1 npx jest layoutTokenUsage
 */
const BASELINE_FILE = path.join(__dirname, 'layoutTokenBaseline.json');
const SCANNED_DIRS = ['screens', 'features', 'components', 'navigation'];
const SPACING_KEYS = /^(padding|margin|gap|rowGap|columnGap)/;
const RADIUS_KEYS = /^border(.*)Radius$/;

type Counts = { spacing: number; radius: number };

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(file);
    return /\.[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

/** 只數樣式屬性上的數字字面值；token、變數與計算式都不算。 */
export function hardCodedLayoutValues(file: string, text: string): Counts {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const counts: Counts = { spacing: 0, radius: 0 };
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node)) {
      const key = node.name.getText(source).replace(/['"]/g, '');
      const value = node.initializer;
      const literal =
        ts.isNumericLiteral(value) ||
        (ts.isPrefixUnaryExpression(value) &&
          value.operator === ts.SyntaxKind.MinusToken &&
          ts.isNumericLiteral(value.operand));
      if (literal) {
        if (SPACING_KEYS.test(key)) counts.spacing += 1;
        else if (RADIUS_KEYS.test(key)) counts.radius += 1;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return counts;
}

function scanAll(): Record<string, Counts> {
  const frontend = path.resolve(__dirname, '../..');
  const result: Record<string, Counts> = {};
  for (const dir of SCANNED_DIRS) {
    for (const file of sourceFiles(path.join(frontend, dir))) {
      const counts = hardCodedLayoutValues(file, fs.readFileSync(file, 'utf8'));
      if (counts.spacing || counts.radius) {
        result[path.relative(frontend, file).split(path.sep).join('/')] = counts;
      }
    }
  }
  return result;
}

const actual = scanAll();

if (process.env.UPDATE_LAYOUT_BASELINE) {
  const sorted = Object.fromEntries(Object.entries(actual).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(BASELINE_FILE, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

const baseline: Record<string, Counts> = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));

test('no file adds hard-coded spacing or radius beyond its recorded baseline', () => {
  const regressions: string[] = [];
  for (const [file, counts] of Object.entries(actual)) {
    const allowed = baseline[file];
    if (!allowed) {
      regressions.push(
        `${file}: 新檔案不得有硬編碼間距／圓角（spacing ${counts.spacing}、radius ${counts.radius}），請改用 Spacing 與 Radius`,
      );
      continue;
    }
    if (counts.spacing > allowed.spacing)
      regressions.push(
        `${file}: 硬編碼間距由 ${allowed.spacing} 增為 ${counts.spacing}，請改用 Spacing`,
      );
    if (counts.radius > allowed.radius)
      regressions.push(
        `${file}: 硬編碼圓角由 ${allowed.radius} 增為 ${counts.radius}，請改用 Radius`,
      );
  }
  expect(regressions).toEqual([]);
});

test('the baseline does not keep entries that are already cleaned up', () => {
  const stale = Object.keys(baseline)
    .filter((file) => !actual[file])
    .map((file) => `${file}: 已無硬編碼，請從基準移除`);
  expect(stale).toEqual([]);
});

test('the scanner counts style literals and ignores tokens and non-layout keys', () => {
  const input =
    'const s = { a: { padding: 12, margin: Spacing.lg, gap: 5 },' +
    ' b: { borderRadius: 14, borderTopLeftRadius: Radius.md },' +
    ' c: { width: 40, flex: 1, marginTop: -4 } };';
  expect(hardCodedLayoutValues('fixture.tsx', input)).toEqual({ spacing: 3, radius: 1 });
});
