import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const srcDir = __dirname;
const slices = fs
  .readdirSync(srcDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(fullPath);
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
      ? [fullPath]
      : [];
  });
}

function relativeImports(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const specifiers = source.matchAll(/(?:from|import)\s*\(?\s*'(\.[^']*)'/g);
  return Array.from(specifiers, (match) => match[1]);
}

// Tests may mock another slice's internals, and the root index.ts wires up every slice.
describe('slice boundaries', () => {
  const crossSliceImports = slices.flatMap((slice) =>
    sourceFiles(path.join(srcDir, slice)).flatMap((file) =>
      relativeImports(file)
        .map((specifier) =>
          path.relative(srcDir, path.resolve(path.dirname(file), specifier))
        )
        .filter((target) => target.split(path.sep)[0] !== slice)
        .map((target) => ({ file: path.relative(srcDir, file), target }))
    )
  );

  it('finds cross-slice imports to check', () => {
    expect(crossSliceImports.length).toBeGreaterThan(0);
  });

  it('only imports other slices through their index.ts', () => {
    const violations = crossSliceImports
      .filter(({ target }) => {
        const [targetSlice, ...rest] = target.split(path.sep);
        const viaIndex =
          rest.length === 0 || (rest.length === 1 && rest[0] === 'index');
        return !(slices.includes(targetSlice) && viaIndex);
      })
      .map(({ file, target }) => `${file} imports ${target}`);

    expect(violations).toEqual([]);
  });
});
