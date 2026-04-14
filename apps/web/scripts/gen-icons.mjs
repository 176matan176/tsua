// Script to generate PWA PNG icons from SVG using sharp (if available) or a canvas fallback
// Run: node scripts/gen-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '../public/icons');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.22; // border radius ratio

  // Background
  ctx.fillStyle = '#080d1a';
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  // Gradient overlay
  const grd = ctx.createLinearGradient(0, 0, size, size);
  grd.addColorStop(0, 'rgba(0,229,176,0.15)');
  grd.addColorStop(1, 'rgba(59,130,246,0.15)');
  ctx.fillStyle = grd;
  roundRect(ctx, 0, 0, size, size, r);
  ctx.fill();

  const pad = size * 0.14;
  const chartW = size - pad * 2;
  const barW = chartW / 5;
  const baseY = size - pad;

  // Bar 1 (short)
  ctx.fillStyle = 'rgba(0,229,176,0.65)';
  const h1 = size * 0.27;
  ctx.fillRect(pad, baseY - h1, barW * 1.1, h1);

  // Bar 2 (medium)
  ctx.fillStyle = 'rgba(0,229,176,0.82)';
  const h2 = size * 0.42;
  ctx.fillRect(pad + barW * 1.5, baseY - h2, barW * 1.1, h2);

  // Bar 3 (tall)
  ctx.fillStyle = '#00e5b0';
  const h3 = size * 0.57;
  ctx.fillRect(pad + barW * 3, baseY - h3, barW * 1.1, h3);

  // Arrow up
  const ax = size * 0.78;
  const ay = size * 0.12;
  const aw = size * 0.14;
  ctx.fillStyle = '#00e5b0';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax - aw / 2, ay + aw * 0.7);
  ctx.lineTo(ax - aw * 0.2, ay + aw * 0.7);
  ctx.lineTo(ax - aw * 0.2, ay + aw * 1.5);
  ctx.lineTo(ax + aw * 0.2, ay + aw * 1.5);
  ctx.lineTo(ax + aw * 0.2, ay + aw * 0.7);
  ctx.lineTo(ax + aw / 2, ay + aw * 0.7);
  ctx.closePath();
  ctx.fill();

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

for (const size of [180, 192, 512]) {
  const buf = drawIcon(size);
  writeFileSync(path.join(OUT, `icon-${size}.png`), buf);
  console.log(`✓ icon-${size}.png`);
}
console.log('Done!');
