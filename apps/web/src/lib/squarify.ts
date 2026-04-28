/**
 * Squarified treemap algorithm (Bruls, Huijsen, van Wijk 2000).
 *
 * Given a list of items with positive `value`s and a target rectangle, returns
 * a tiling of the rectangle where each item gets an area proportional to its
 * value, while keeping aspect ratios as close to 1:1 as possible (so no thin
 * slivers — a key reason Finviz's map is readable).
 *
 * No dependencies; handles empty input, zero values, and degenerate rects.
 */

export interface SquarifyItem<T> {
  value: number;
  data: T;
}

export interface SquarifyRect<T> {
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  data: T;
}

interface Box { x: number; y: number; w: number; h: number; }

/**
 * Worst aspect ratio in a strip — the metric we minimize when deciding
 * whether to add another item to the current row.
 */
function worst(areas: number[], shortSide: number): number {
  if (areas.length === 0) return Infinity;
  const s = areas.reduce((a, b) => a + b, 0);
  if (s === 0 || shortSide === 0) return Infinity;
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const ss = s * s;
  const ws = shortSide * shortSide;
  return Math.max((ws * max) / ss, ss / (ws * min));
}

/**
 * Place a row of items along the shorter side of the remaining box.
 * Returns the placed rects and the leftover sub-box.
 */
function placeRow<T>(
  areas: number[],
  items: SquarifyItem<T>[],
  box: Box,
): { rects: SquarifyRect<T>[]; remaining: Box } {
  const sum = areas.reduce((a, b) => a + b, 0);
  const horizontal = box.w < box.h; // shorter side is width → strip across the top
  const rects: SquarifyRect<T>[] = [];

  if (horizontal) {
    const stripH = sum / box.w;
    let pos = 0;
    items.forEach((item, i) => {
      const w = areas[i] / stripH;
      rects.push({ x: box.x + pos, y: box.y, w, h: stripH, value: item.value, data: item.data });
      pos += w;
    });
    return {
      rects,
      remaining: { x: box.x, y: box.y + stripH, w: box.w, h: box.h - stripH },
    };
  }

  const stripW = sum / box.h;
  let pos = 0;
  items.forEach((item, i) => {
    const h = areas[i] / stripW;
    rects.push({ x: box.x, y: box.y + pos, w: stripW, h, value: item.value, data: item.data });
    pos += h;
  });
  return {
    rects,
    remaining: { x: box.x + stripW, y: box.y, w: box.w - stripW, h: box.h },
  };
}

/**
 * Tile `box` with rectangles, one per item, sized proportionally to `value`.
 * Items with non-positive values are dropped.
 */
export function squarify<T>(items: SquarifyItem<T>[], box: Box): SquarifyRect<T>[] {
  const rects: SquarifyRect<T>[] = [];
  if (box.w <= 0 || box.h <= 0) return rects;

  const filtered = items.filter((i) => i.value > 0);
  if (filtered.length === 0) return rects;

  const totalValue = filtered.reduce((s, i) => s + i.value, 0);
  if (totalValue <= 0) return rects;

  const sorted = [...filtered].sort((a, b) => b.value - a.value);
  const scale = (box.w * box.h) / totalValue;
  const queue = sorted.map((i) => ({ item: i, area: i.value * scale }));

  let remaining: Box = { ...box };
  let rowItems: SquarifyItem<T>[] = [];
  let rowAreas: number[] = [];

  while (queue.length > 0) {
    const next = queue[0];
    const shortSide = Math.min(remaining.w, remaining.h);
    if (shortSide <= 0) break;
    const candidateAreas = [...rowAreas, next.area];
    if (rowItems.length === 0 || worst(candidateAreas, shortSide) <= worst(rowAreas, shortSide)) {
      queue.shift();
      rowItems.push(next.item);
      rowAreas.push(next.area);
    } else {
      const placed = placeRow(rowAreas, rowItems, remaining);
      rects.push(...placed.rects);
      remaining = placed.remaining;
      rowItems = [];
      rowAreas = [];
    }
  }

  if (rowItems.length > 0) {
    const placed = placeRow(rowAreas, rowItems, remaining);
    rects.push(...placed.rects);
  }

  return rects;
}
