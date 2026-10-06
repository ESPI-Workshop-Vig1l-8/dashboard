import { useId } from 'react';
import { fmtTime } from '../lib/format';

const W = 600;
const H = 120;
const PAD = { left: 44, right: 8, top: 8, bottom: 20 };
const MAX_POINTS = 600;

// Bucket averages so long series stay light to render.
function downsample(points, key) {
  const valid = points.filter((p) => typeof p[key] === 'number');
  if (valid.length <= MAX_POINTS) return points;
  const size = Math.ceil(points.length / MAX_POINTS);
  const out = [];
  for (let i = 0; i < points.length; i += size) {
    const bucket = points.slice(i, i + size).filter((p) => typeof p[key] === 'number');
    if (!bucket.length) {
      out.push({ t: points[i].t, [key]: null });
      continue;
    }
    const avg = bucket.reduce((s, p) => s + p[key], 0) / bucket.length;
    out.push({ t: bucket[Math.floor(bucket.length / 2)].t, [key]: avg });
  }
  return out;
}

// Line chart of one metric. Missing values (null) break the line, so a
// sensor failure or a gap in the data stays visible.
export default function Chart({ points, metric, from, to, color, unit, digits = 1, threshold, maxGapMs = 10000 }) {
  const gradId = useId();
  const data = downsample(points, metric);
  const values = data.map((p) => p[metric]).filter((v) => typeof v === 'number');

  let min = values.length ? Math.min(...values) : 0;
  let max = values.length ? Math.max(...values) : 1;
  if (threshold != null && values.length && max > threshold * 0.85) max = Math.max(max, threshold);
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * 0.1;
  min -= margin;
  max += margin;

  const x = (t) => PAD.left + ((t - from) / (to - from)) * (W - PAD.left - PAD.right);
  const y = (v) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);

  // Split into segments at nulls and at gaps longer than maxGapMs
  const segments = [];
  let current = [];
  let lastT = null;
  for (const p of data) {
    const v = p[metric];
    if (typeof v !== 'number' || p.t < from || (lastT != null && p.t - lastT > maxGapMs)) {
      if (current.length) segments.push(current);
      current = [];
    }
    if (typeof v === 'number' && p.t >= from) current.push([x(p.t), y(v)]);
    lastT = p.t;
  }
  if (current.length) segments.push(current);

  const ticks = [min + margin, (min + max) / 2, max - margin];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '120px', overflow: 'visible' }} role="img" aria-label={`Historique ${metric}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <text x={PAD.left - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="var(--text-dim)" fontFamily="var(--font-mono)">
            {v.toFixed(digits)}
          </text>
        </g>
      ))}

      {threshold != null && threshold >= min && threshold <= max && (
        <g>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(threshold)} y2={y(threshold)} stroke="var(--rose)" strokeOpacity="0.5" strokeDasharray="5 4" />
          <text x={W - PAD.right} y={y(threshold) - 4} textAnchor="end" fontSize="9" fill="var(--rose)" fontFamily="var(--font-mono)">
            plafond local {threshold} {unit}
          </text>
        </g>
      )}

      {segments.map((seg) => {
        const line = seg.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
        const base = H - PAD.bottom;
        return (
          <g key={`${seg[0][0]}-${seg.length}`}>
            {seg.length > 1 && (
              <polygon fill={`url(#${gradId})`} points={`${seg[0][0]},${base} ${line} ${seg[seg.length - 1][0]},${base}`} />
            )}
            <polyline fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" points={line} />
            {seg.length === 1 && <circle cx={seg[0][0]} cy={seg[0][1]} r="2" fill={color} />}
          </g>
        );
      })}

      {[from, (from + to) / 2, to].map((t, i) => (
        <text key={t} x={x(t)} y={H - 4} fontSize="9" fill="var(--text-dim)" fontFamily="var(--font-mono)"
          textAnchor={['start', 'middle', 'end'][i]}>
          {fmtTime(t, to - from <= 3600_000)}
        </text>
      ))}

      {!values.length && (
        <text x={(PAD.left + W) / 2} y={H / 2} textAnchor="middle" fontSize="11" fill="var(--text-muted)" fontFamily="var(--font-mono)">
          Aucune mesure sur la période
        </text>
      )}
    </svg>
  );
}
