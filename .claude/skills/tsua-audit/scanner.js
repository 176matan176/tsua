// tsua contrast scanner — paste into preview_eval on any page.
// Walks all text nodes, resolves each element's effective background
// (nearest ancestor with alpha > 0.6), computes WCAG contrast, and
// returns deduped offenders below MIN_RATIO with samples.
(async () => {
  const MIN_RATIO = 2.6;
  await new Promise(r => setTimeout(r, 3500)); // let data/skeletons settle
  const parse = c => { const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const effBg = el => { let n = el; while (n && n !== document.documentElement) { const bg = parse(getComputedStyle(n).backgroundColor); if (bg && bg[3] > 0.6) return bg; n = n.parentElement; } return parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255, 1]; };
  const issues = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node, checked = 0;
  while ((node = walker.nextNode())) {
    const txt = node.textContent.trim(); if (txt.length < 3) continue;
    const el = node.parentElement; if (!el) continue;
    const r = el.getBoundingClientRect(); if (r.width < 5 || r.height < 5) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const col = parse(cs.color); if (!col || col[3] < 0.05) continue;
    const bg = effBg(el);
    const ratio = contrast(col, bg);
    checked++;
    if (ratio < MIN_RATIO) {
      const key = cs.color + '|' + `rgb(${bg[0]},${bg[1]},${bg[2]})`;
      if (!issues.has(key)) issues.set(key, { color: cs.color, bg: `rgb(${bg[0]},${bg[1]},${bg[2]})`, ratio: +ratio.toFixed(2), count: 0, samples: [] });
      const it = issues.get(key); it.count++;
      if (it.samples.length < 2) it.samples.push(txt.slice(0, 30) + ' <' + el.tagName + ' cls=' + el.className.toString().slice(0, 40) + '>');
    }
  }
  return {
    page: location.pathname,
    theme: document.documentElement.getAttribute('data-theme'),
    viewportOk: document.documentElement.clientWidth > 0, // false = geometry is untrustworthy
    textNodesChecked: checked,
    lowContrast: [...issues.values()].sort((a, b) => a.ratio - b.ratio).slice(0, 12),
  };
})()
