import { Check } from 'lucide-react';
import { fmtAgo, LEVEL } from '../lib/format';

// Most urgent open alert, pinned above the panels until it is acknowledged.
export default function AlertStrip({ alerts, canAct, now, onAck }) {
  const open = alerts.filter((a) => !a.acked_at);
  if (!open.length) return null;
  const top = open.find((a) => a.level === 'confirmed') || open[0];
  const lvl = LEVEL[top.level] || LEVEL.warning;

  return (
    <div className="alert-strip" role="alert" style={{ '--tone': lvl.color, '--tone-subtle': lvl.subtle, '--tone-border': lvl.border }}>
      <span className="alert-strip-level">{lvl.label}</span>
      <span style={{ fontWeight: 700 }}>{top.category}{top.device_id ? ` · ${top.device_id}` : ''}</span>
      <span className="mono-note" style={{ color: 'var(--text-secondary)' }}>
        {top.source}{typeof top.confidence === 'number' ? ` · ${Math.round(top.confidence * 100)} %` : ''} · {fmtAgo(top.received_at, now)}
      </span>
      {open.length > 1 && <span className="badge">+{open.length - 1} autre{open.length > 2 ? 's' : ''}</span>}
      <button type="button" className="interactive-btn" style={{ marginLeft: 'auto', color: lvl.color, borderColor: lvl.border }}
        disabled={!canAct} onClick={() => onAck(top)} title={canAct ? 'Acquitter' : 'Clé opérateur requise'}>
        <Check size={14} /> Acquitter
      </button>
    </div>
  );
}
