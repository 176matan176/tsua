// One-shot migration: rewrite hardcoded dark-palette colors in inline styles
// to theme tokens so they auto-swap with [data-theme]. Alpha is preserved.
// Run: node dark-mode-fix/migrate-colors.mjs
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const SRC = join(ROOT, 'apps', 'web', 'src');

// Files/dirs whose colors are INTENTIONALLY fixed — never touch.
const EXCLUDE = [
  'components/charts/StockChart.tsx',
  'components/charts/TradingViewChart.tsx',
  'components/crypto/Sparkline.tsx',
  'components/stocks/OwnershipPie.tsx',
  'components/markets/SectorTreemap.tsx',
  'components/markets/SectorHeatmap.tsx',
  'app/[locale]/layout.tsx',
  'components/layout/ThemeToggle.tsx',
  'contexts/ThemeContext.tsx',
  'components/layout/TermsConsent.tsx', // already migrated by hand
];
const EXCLUDE_DIR = ['app/api', 'app/embed', 'lib'];

// dark RGB triplet -> rgb-token. Captures + preserves alpha.
const TRIPLETS = [
  [[6, 11, 22], 'bg'], [[5, 9, 18], 'bg'], [[8, 13, 24], 'bg'],
  [[8, 14, 26], 'bg'], [[8, 13, 26], 'bg'],
  [[10, 15, 30], 'bg2'], [[13, 20, 36], 'bg2'], [[12, 18, 32], 'bg2'],
  [[15, 25, 41], 'card'], [[10, 16, 30], 'card'], [[10, 20, 40], 'card'], [[12, 20, 36], 'card'],
  [[20, 31, 48], 'card2'], [[20, 30, 50], 'card2'],
  [[26, 40, 64], 'border'], [[36, 53, 80], 'border2'],
  [[168, 188, 212], 'text2'], [[90, 112, 144], 'muted'],
  [[0, 229, 176], 'accent'], [[59, 130, 246], 'blue'],
  [[255, 77, 106], 'red'], [[245, 185, 66], 'gold'],
];

// dark hex -> var(--token)
const HEX = [
  ['#060b16', 'bg'], ['#0a0f1e', 'bg2'], ['#0d1424', 'card'], ['#101828', 'card2'],
  ['#e8f0ff', 'text'], ['#e8f4ff', 'text'],
  ['#c8ddf4', 'text2'], ['#c8d8f0', 'text2'], ['#b3c2d6', 'text2'],
  ['#cbd6e3', 'text2'], ['#cbd5e1', 'text2'], ['#94a3b8', 'text2'], ['#a8bcd4', 'text2'],
  ['#5a7090', 'muted'],
  ['#00e5b0', 'accent'], ['#00a884', 'accent2'], ['#00c49a', 'accent2'],
  ['#3b82f6', 'blue'], ['#4dabf7', 'blue'],
  ['#ff4d6a', 'red'], ['#ff8080', 'red'],
  ['#f5b942', 'gold'], ['#ffd166', 'gold'],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}

const norm = (p) => relative(SRC, p).replace(/\\/g, '/');
const files = walk(SRC).filter((p) => {
  const r = norm(p);
  if (EXCLUDE.includes(r)) return false;
  if (EXCLUDE_DIR.some((d) => r.startsWith(d + '/'))) return false;
  return true;
});

let totalChanges = 0;
const report = [];
for (const file of files) {
  let src = readFileSync(file, 'utf8');
  const before = src;
  let n = 0;

  for (const [[r, g, b], token] of TRIPLETS) {
    const re = new RegExp(`rgba?\\(\\s*${r}\\s*,\\s*${g}\\s*,\\s*${b}\\s*(?:,\\s*([0-9.]+))?\\s*\\)`, 'g');
    src = src.replace(re, (_m, a) => { n++; return `rgb(var(--rgb-${token}) / ${a ?? '1'})`; });
  }
  for (const [hex, token] of HEX) {
    const re = new RegExp(`${hex}(?![0-9a-fA-F])`, 'gi');
    src = src.replace(re, () => { n++; return `var(--${token})`; });
  }

  if (src !== before) {
    writeFileSync(file, src);
    totalChanges += n;
    report.push(`${n.toString().padStart(4)}  ${norm(file)}`);
  }
}

report.sort((a, b) => parseInt(b) - parseInt(a));
console.log(report.join('\n'));
console.log(`\nFiles changed: ${report.length}  |  Total replacements: ${totalChanges}`);
