import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const assetsDir = path.join(__dirname, '..', '..', '..', 'assets');
const stylesheet = fs
  .readFileSync(path.join(assetsDir, 'styles.css'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

function tokensIn(block: string): Map<string, string> {
  return new Map(
    [...block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ])
  );
}

const lightTokens = tokensIn(
  stylesheet.match(/^:root\s*\{([^}]*)\}/m)?.[1] ?? ''
);
const darkTokens = tokensIn(
  stylesheet.match(
    /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/
  )?.[1] ?? ''
);

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

  it('opts in to both color schemes', () => {
    expect(stylesheet).toMatch(/^:root\s*\{[^}]*color-scheme:\s*light dark;/m);
  });

  it('gives every token a dark value, and nothing else', () => {
    expect(lightTokens.size).toBeGreaterThan(0);
    expect([...darkTokens.keys()].sort()).toEqual(
      [...lightTokens.keys()].sort()
    );
  });
});

describe.each([
  ['day pages', path.join(__dirname, 'template.ts')],
  ['404.html', path.join(assetsDir, '404.html')],
])('%s', (_name, file) => {
  const source = fs.readFileSync(file, 'utf8');

  it('link the shared stylesheet and opt in to both color schemes', () => {
    expect(source).toContain('<link rel="stylesheet" href="/styles.css" />');
    expect(source).toContain(
      '<meta name="color-scheme" content="light dark" />'
    );
    expect(source).not.toContain('<style');
  });

  it('allow pinch zoom and extend under a notch', () => {
    const viewport = source.match(/name="viewport"\s+content="([^"]+)"/)?.[1];

    expect(viewport).toBe(
      'width=device-width, initial-scale=1.0, viewport-fit=cover'
    );
  });

  it('set the toolbar color to --surface in each scheme', () => {
    const themeColor = (scheme: string) =>
      source.match(
        new RegExp(
          `name="theme-color"\\s+media="\\(prefers-color-scheme: ${scheme}\\)"\\s+content="([^"]+)"`
        )
      )?.[1];

    expect(themeColor('light')).toBe(lightTokens.get('--surface'));
    expect(themeColor('dark')).toBe(darkTokens.get('--surface'));
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
