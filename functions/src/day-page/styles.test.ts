import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const stylesheet = fs
  .readFileSync(
    path.join(__dirname, '..', '..', '..', 'assets', 'styles.css'),
    'utf8'
  )
  .replace(/\/\*[\s\S]*?\*\//g, '');

const rootBlocks = [...stylesheet.matchAll(/:root\s*\{([^}]*)\}/g)].map(
  (match) => match[1]
);
const outsideRoot = stylesheet.replace(/:root\s*\{[^}]*\}/g, '');
const definedTokens = new Set(
  rootBlocks.flatMap((block) =>
    [...block.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1])
  )
);
const usedTokens = new Set(
  [...stylesheet.matchAll(/var\(\s*(--[\w-]+)/g)].map((match) => match[1])
);

describe('styles.css', () => {
  it('defines tokens in :root', () => {
    expect(definedTokens.size).toBeGreaterThan(0);
  });

  it('writes colors only in token definitions', () => {
    const rawColors = outsideRoot.match(/#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\(/gi);

    expect(rawColors).toBeNull();
  });

  it('only uses tokens that are defined', () => {
    const undefinedTokens = [...usedTokens].filter(
      (token) => !definedTokens.has(token)
    );

    expect(undefinedTokens).toEqual([]);
  });

  it('defines no unused tokens', () => {
    const unusedTokens = [...definedTokens].filter(
      (token) => !usedTokens.has(token)
    );

    expect(unusedTokens).toEqual([]);
  });
});

describe('svg.ts icons', () => {
  const source = fs.readFileSync(path.join(__dirname, 'svg.ts'), 'utf8');

  it('take their color from the surrounding text', () => {
    const icons = source.match(/<svg\b/g) ?? [];
    const fills = source.match(/fill="[^"]*"/g) ?? [];

    expect(icons.length).toBeGreaterThan(0);
    expect(fills).toEqual(icons.map(() => 'fill="currentColor"'));
  });
});
