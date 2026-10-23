import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * LottieArt 是減少動態、背景暫停與無障礙語意的唯一出口。
 * 畫面若直接使用 LottieView，這些政策就會被繞過。
 */
const root = join(__dirname, '..', '..');
const skipped = new Set(['node_modules', '.expo', 'dist', 'assets', '__mocks__']);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    if (skipped.has(entry)) return [];
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

const files = sourceFiles(root).map((path) => ({
  path: path.slice(root.length + 1),
  text: readFileSync(path, 'utf8'),
}));

test('only LottieArt imports the Lottie player', () => {
  const offenders = files
    .filter(({ path, text }) => !path.includes('__tests__') && text.includes('lottie-react-native'))
    .map(({ path }) => path);
  expect(offenders).toEqual(['components/LottieArt.tsx']);
});

test('every Lottie asset is rendered through LottieArt', () => {
  const offenders = files
    .filter(({ path, text }) => {
      if (path === 'components/LottieArt.tsx' || path.includes('__tests__')) return false;
      return /artwork\/[\w-]+\/[\w-]+\.json/.test(text) && !text.includes('LottieArt');
    })
    .map(({ path }) => path);
  expect(offenders).toEqual([]);
});
