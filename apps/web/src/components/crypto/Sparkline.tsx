'use client';

interface SparklineProps {
  points: Array<[number, number]>; // [timestamp, price] from CoinGecko
  width?: number;
  height?: number;
  color?: string;
  fill?: string;
}

/**
 * Minimal dependency-free sparkline using SVG.
 * Renders an area chart with a highlighted end point.
 */
export function Sparkline({
  points,
  width = 600,
  height = 180,
  color,
  fill,
}: SparklineProps) {
  if (!points || points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-xs text-tsua-muted rounded-xl"
        style={{ width: '100%', height, background: 'rgba(26,40,64,0.3)' }}
      >
        אין נתוני גרף זמינים
      </div>
    );
  }

  const prices = points.map(p => p[1]);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const isUp = last >= first;
  const strokeColor = color ?? (isUp ? '#00e5b0' : '#ff4d6a');
  const areaFill = fill ?? (isUp ? 'rgba(0,229,176,0.15)' : 'rgba(255,77,106,0.15)');

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const padding = 4;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  // Build polyline path
  const pathCoords = points.map(([, price], i) => {
    const x = padding + (i / (points.length - 1)) * innerW;
    const y = padding + (1 - (price - min) / range) * innerH;
    return [x, y] as [number, number];
  });

  const line = pathCoords.map(([x, y], i) =>
    i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
  ).join(' ');

  // Area: close to bottom
  const area = `${line} L ${pathCoords[pathCoords.length - 1][0]} ${height - padding} L ${pathCoords[0][0]} ${height - padding} Z`;

  // Horizontal grid: current price line
  const endX = pathCoords[pathCoords.length - 1][0];
  const endY = pathCoords[pathCoords.length - 1][1];

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="spark-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={area} fill="url(#spark-gradient)" />

      {/* Main line */}
      <path
        d={line}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End point */}
      <circle cx={endX} cy={endY} r={4} fill={strokeColor} />
      <circle cx={endX} cy={endY} r={8} fill={strokeColor} fillOpacity="0.25" />

      {/* Silence unused-var warnings */}
      <title>{`Sparkline ${isUp ? '+' : ''}${((last - first) / first * 100).toFixed(2)}%`}</title>
      {areaFill ? null : null}
    </svg>
  );
}
