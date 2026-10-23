import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(__dirname, '../..');
const controls = new Set([
  'TouchableOpacity',
  'Pressable',
  'SoftButton',
  'AppButton',
  'RecordActionButton',
]);
type ModuleInfo = {
  source: ts.SourceFile;
  styles: Map<string, Map<string, Record<string, number>>>;
  imports: Map<string, { file: string; name: string }>;
};
const cache = new Map<string, ModuleInfo>();
function moduleInfo(file: string): ModuleInfo {
  const prior = cache.get(file);
  if (prior) return prior;
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const info: ModuleInfo = { source, styles: new Map(), imports: new Map() };
  cache.set(file, info);
  const visit = (node: ts.Node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      node.initializer.expression.getText(source) === 'StyleSheet.create'
    ) {
      const object = node.initializer.arguments[0];
      const styles = new Map<string, Record<string, number>>();
      if (object && ts.isObjectLiteralExpression(object))
        for (const property of object.properties) {
          if (
            !ts.isPropertyAssignment(property) ||
            !ts.isObjectLiteralExpression(property.initializer)
          )
            continue;
          const values: Record<string, number> = {};
          for (const field of property.initializer.properties)
            if (ts.isPropertyAssignment(field) && ts.isNumericLiteral(field.initializer))
              values[field.name.getText(source)] = Number(field.initializer.text);
          styles.set(property.name.getText(source), values);
        }
      info.styles.set(node.name.text, styles);
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.moduleSpecifier.text.startsWith('.') &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const base = path.resolve(path.dirname(file), node.moduleSpecifier.text);
      const target = [base + '.ts', base + '.tsx'].find((file) => fs.existsSync(file));
      if (target)
        for (const item of node.importClause.namedBindings.elements)
          info.imports.set(item.name.text, {
            file: target,
            name: (item.propertyName ?? item.name).text,
          });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return info;
}
function styleValues(expression: ts.Expression, file: string): Record<string, number> {
  if (ts.isArrayLiteralExpression(expression))
    return Object.assign(
      {},
      ...expression.elements.map((item) => styleValues(item as ts.Expression, file)),
    );
  if (ts.isObjectLiteralExpression(expression))
    return Object.fromEntries(
      expression.properties
        .filter(
          (item): item is ts.PropertyAssignment =>
            ts.isPropertyAssignment(item) && ts.isNumericLiteral(item.initializer),
        )
        .map((item) => [item.name.getText(), Number(item.initializer.getText())]),
    );
  if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.expression)) {
    const info = moduleInfo(file);
    const variable = expression.expression.text;
    const imported = info.imports.get(variable);
    return (
      (imported
        ? moduleInfo(imported.file).styles.get(imported.name)
        : info.styles.get(variable)
      )?.get(expression.name.text) ?? {}
    );
  }
  return {};
}
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory()
      ? entry.name === '__tests__'
        ? []
        : sourceFiles(file)
      : /\.tsx$/.test(file)
        ? [file]
        : [];
  });
}
const files = ['screens', 'features', 'components', 'navigation'].flatMap((dir) =>
  sourceFiles(path.join(root, dir)),
);

test('declared touch-control heights reach 44 or provide sufficient hitSlop', () => {
  const failures: string[] = [];
  for (const file of files) {
    const { source } = moduleInfo(file);
    const visit = (node: ts.Node) => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        controls.has(node.tagName.getText(source))
      ) {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const style = attributes.find((item) => item.name.getText(source) === 'style')?.initializer;
        const values =
          style && ts.isJsxExpression(style) && style.expression
            ? styleValues(style.expression, file)
            : {};
        const height = Math.max(values.height ?? 0, values.minHeight ?? 0);
        const hitSlop = attributes.find(
          (item) => item.name.getText(source) === 'hitSlop',
        )?.initializer;
        let extra = 0;
        if (hitSlop && ts.isJsxExpression(hitSlop) && hitSlop.expression) {
          if (ts.isNumericLiteral(hitSlop.expression)) extra = Number(hitSlop.expression.text) * 2;
          else {
            const insets = styleValues(hitSlop.expression, file);
            extra = (insets.top ?? 0) + (insets.bottom ?? 0);
          }
        }
        if (height > 0 && height + extra < 44)
          failures.push(
            `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} height=${height}`,
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(failures).toEqual([]);
});

test('icon-only touch controls declare a readable accessibility label', () => {
  const failures: string[] = [];
  for (const file of files) {
    const { source } = moduleInfo(file);
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node) && controls.has(node.openingElement.tagName.getText(source))) {
        let icon = false;
        let text = false;
        const inspect = (child: ts.Node) => {
          if (ts.isJsxOpeningElement(child) || ts.isJsxSelfClosingElement(child)) {
            const tag = child.tagName.getText(source);
            if (tag === 'Ionicons') icon = true;
            if (tag === 'Text' || tag === 'Animated.Text') text = true;
          }
          ts.forEachChild(child, inspect);
        };
        node.children.forEach(inspect);
        const label = node.openingElement.attributes.properties.find(
          (attribute) =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'accessibilityLabel',
        );
        if (icon && !text && !label)
          failures.push(
            `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
          );
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  expect(failures).toEqual([]);
});
