import { useState } from 'react';
import { ShieldAlert, Check } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDateTime, LEVEL } from '../lib/format';

export default function AlertsPanel({ alerts, canAct, onUpdated }) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [error, setError] = useState(null);
  const shown = alerts.filter((a) => !onlyOpen || !a.acked_at);
  const open = alerts.filter((a) => !a.acked_at).length;

  const ack = async (alert) => {
    setError(null);
    try {
      onUpdated(await api(`/alerts/${encodeURIComponent(alert._id)}/ack`, { method: 'POST' }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className={`card-surface panel ${alerts.some((a) => !a.acked_at && a.level === 'confirmed') ? 'is-alert' : ''}`}>
      <div className="panel-head">
        <div className="panel-title">
          <ShieldAlert size={18} color="var(--text-secondary)" />
          Alertes ({open} ouverte{open > 1 ? 's' : ''})
        </div>
        <div className="segmented">
          <button type="button" className={onlyOpen ? 'active' : ''} onClick={() => setOnlyOpen(true)}>OUVERTES</button>
          <button type="button" className={!onlyOpen ? 'active' : ''} onClick={() => setOnlyOpen(false)}>TOUTES</button>
        </div>
      </div>

      <p className="mono-note">
        Avertissement : début d'un motif anormal. Confirmée : le motif se poursuit, la LED environnement du nœud clignote.
      </p>
      {error && <span className="mono-note" style={{ color: 'var(--danger)' }}>{error}</span>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto' }}>
        {!shown.length && <span className="mono-note">Aucune alerte {onlyOpen ? 'ouverte' : 'enregistrée'}.</span>}
        {shown.map((a) => {
          const lvl = LEVEL[a.level] || LEVEL.warning;
          return (
            <div key={a._id} className="sub-card" style={{
              borderColor: a.acked_at ? 'var(--border-subtle)' : lvl.border, opacity: a.acked_at ? 0.6 : 1,
              display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                  <span className="badge" style={{ color: lvl.color, borderColor: lvl.border, background: lvl.subtle }}>{lvl.label}</span>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{a.category}</span>
                  {typeof a.confidence === 'number' && <span className="mono-note">{Math.round(a.confidence * 100)} %</span>}
                </div>
                <div className="mono-note">
                  {fmtDateTime(a.received_at)} · {a.source}{a.device_id ? ` · ${a.device_id}` : ''}
                  {a.acked_at ? ` · acquittée ${fmtDateTime(a.acked_at)}` : ''}
                </div>
                {a.details && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', wordBreak: 'break-word' }}>{a.details}</p>}
              </div>
              {!a.acked_at && (
                <button type="button" className="interactive-btn" disabled={!canAct} onClick={() => ack(a)}
                  title={canAct ? 'Acquitter' : 'Clé opérateur requise'}>
                  <Check size={14} /> Acquitter
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
