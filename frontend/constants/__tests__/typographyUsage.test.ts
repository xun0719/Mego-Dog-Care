import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { Type } from '../Typography';
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const file = path.join(dir, item.name);
    return item.isDirectory()
      ? item.name === '__tests__'
        ? []
        : files(file)
      : /\.[jt]sx?$/.test(file)
        ? [file]
        : [];
  });
}
test('UI font sizes and form font-size constants refer to typography tokens', () => {
  const root = path.resolve(__dirname, '../..');
  const failures: string[] = [];
  for (const file of ['screens', 'features', 'components', 'navigation', 'constants'].flatMap(
    (dir) => files(path.join(root, dir)),
  )) {
    if (file.endsWith('Typography.ts')) continue;
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      const inline =
        ts.isPropertyAssignment(node) &&
        node.name.getText(source).replace(/['"]/g, '') === 'fontSize' &&
        ts.isNumericLiteral(node.initializer);
      const constant =
        ts.isVariableDeclaration(node) &&
        /FONT_SIZE$/.test(node.name.getText(source)) &&
        node.initializer &&
        ts.isNumericLiteral(node.initializer);
      if (inline || constant)
        failures.push(
          `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
        );
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(failures).toEqual([]);
});
test('readable text has an 11-point floor and the expanded scale has thirteen levels', () => {
  expect(Math.min(...Object.values(Type))).toBe(11);
  expect(Object.keys(Type)).toHaveLength(13);
  expect(Type.display2).toBe(30);
  expect(Type.hero).toBe(36);
});
