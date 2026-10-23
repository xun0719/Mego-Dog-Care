import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

test.each([
  ['SharedHealthScreens.tsx', 'VomitingHealthEvent'],
  ['SharedHealthScreens.tsx', 'StoolHealthEvent'],
  ['SharedHealthScreens.tsx', 'ObservationHealthEvent'],
  ['MainTabs.tsx', 'CreateHealthEvent'],
])('%s disables the native heading for the page-owned %s header', (file, route) => {
  const source = ts.createSourceFile(
    file,
    readFileSync(resolve(__dirname, '..', file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let checked = false;
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const attributes = node.attributes.properties;
      const name = attributes.find(
        (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'name',
      );
      if (
        name &&
        ts.isJsxAttribute(name) &&
        name.initializer &&
        ts.isStringLiteral(name.initializer) &&
        name.initializer.text === route
      ) {
        const options = attributes.find(
          (attribute) =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'options',
        );
        if (
          !options ||
          !ts.isJsxAttribute(options) ||
          !options.initializer ||
          !ts.isJsxExpression(options.initializer) ||
          !options.initializer.expression ||
          !ts.isObjectLiteralExpression(options.initializer.expression)
        )
          throw new Error(`Missing ${route} options`);
        const header = options.initializer.expression.properties.find(
          (property) =>
            ts.isPropertyAssignment(property) && property.name.getText(source) === 'headerShown',
        );
        expect(
          header &&
            ts.isPropertyAssignment(header) &&
            header.initializer.kind === ts.SyntaxKind.FalseKeyword,
        ).toBe(true);
        checked = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  expect(checked).toBe(true);
});
