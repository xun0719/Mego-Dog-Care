import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Parse source instead of matching comments, backgrounds, or unrelated strings. */
function rawForegroundColors(file: string, text: string) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const hits: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source).replace(/['"]/g, '') === 'color'
    ) {
      const value = node.initializer;
      if (
        (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) &&
        /^(#|rgba?\(|hsla?\()/i.test(value.text)
      ) {
        const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
        hits.push(`${file}:${line}: ${value.text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return hits;
}

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(file);
    return /\.[jt]sx?$/.test(entry.name) ? [file] : [];
  });
}

test('UI foreground style colors use tokens instead of literal colors', () => {
  const frontend = path.resolve(__dirname, '../..');
  const files = ['screens', 'features', 'components', 'navigation'].flatMap((dir) =>
    sourceFiles(path.join(frontend, dir)),
  );
  const hits = files.flatMap((file) => rawForegroundColors(file, fs.readFileSync(file, 'utf8')));
  expect(hits).toEqual([]);
});

test('the color guard detects hex, RGB and quoted foreground keys while allowing backgrounds', () => {
  const input =
    "const styles = { a: { color: '#B56A3B' }, b: { 'color': 'rgb(1, 2, 3)' }, c: { backgroundColor: '#fff', color: Colors.text } };";
  expect(rawForegroundColors('fixture.tsx', input)).toHaveLength(2);
});

function decorationColorMisuses(file: string, text: string) {
  const invalid: string[] = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(source) === 'Colors' &&
      /^(primary|success|danger)Decoration$/.test(node.name.text)
    ) {
      let ancestor: ts.Node | undefined = node.parent;
      while (ancestor && !ts.isJsxAttribute(ancestor)) ancestor = ancestor.parent;
      const element = ancestor?.parent.parent;
      const tag =
        element && (ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element))
          ? element.tagName.getText(source)
          : '';
      const attribute =
        ancestor && ts.isJsxAttribute(ancestor) ? ancestor.name.getText(source) : '';
      // Header 與狀態頁只將 iconColor 傳給 Ionicons，不可套到內文或背景。
      const isIconColor =
        (tag === 'Ionicons' && attribute === 'color') ||
        (['ScreenPageHeader', 'ScreenPageState'].includes(tag) && attribute === 'iconColor');
      if (!isIconColor) invalid.push(file);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return invalid;
}

test('decoration tokens are restricted to icon colors, not text or background properties', () => {
  const frontend = path.resolve(__dirname, '../..');
  const invalid = ['screens', 'features', 'components', 'navigation']
    .flatMap((dir) => sourceFiles(path.join(frontend, dir)))
    .flatMap((file) => decorationColorMisuses(file, fs.readFileSync(file, 'utf8')));
  expect(invalid).toEqual([]);
});

test.each(['ScreenPageHeader', 'ScreenPageState'])(
  '%s icon colors are allowed but decoration tokens remain forbidden for text and backgrounds',
  (tag) => {
    expect(
      decorationColorMisuses('fixture.tsx', `<${tag} iconColor={Colors.primaryDecoration} />`),
    ).toEqual([]);
    expect(
      decorationColorMisuses('fixture.tsx', '<Text color={Colors.primaryDecoration} />'),
    ).toEqual(['fixture.tsx']);
    expect(
      decorationColorMisuses('fixture.tsx', `<${tag} iconBackground={Colors.successDecoration} />`),
    ).toEqual(['fixture.tsx']);
  },
);
