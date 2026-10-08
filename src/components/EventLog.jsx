import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'lucide-react';
import { fmtTime } from '../lib/format';

const TABS = ['TOUT', 'CAPTEURS', 'ALERTES', 'SYSTÈME'];
const COLORS = {
  MOUVEMENT: 'var(--danger)', CONFIRMÉE: 'var(--danger)', 'HORS LIGNE': 'var(--danger)',
  AVERTISSEMENT: 'var(--warn)', COMMANDE: 'var(--warn)',
  'EN LIGNE': 'var(--ok)', ACQUITTÉE: 'var(--ok)', ANNOTATION: 'var(--info)',
};

export default function EventLog({ log }) {
  const [tab, setTab] = useState('TOUT');
  const scrollRef = useRef(null);
  const shown = log.filter((l) => tab === 'TOUT' || l.category === tab);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  return (
    <section className="card-surface panel">
      <div className="panel-head">
        <div className="panel-title">
          <Terminal size={18} color="var(--text-secondary)" />
          Journal des événements
        </div>
        <div className="segmented">
          {TABS.map((t) => (
            <button key={t} type="button" className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </div>
      </div>

      <div ref={scrollRef} style={{
        flex: 1, minHeight: '220px', maxHeight: '320px', overflowY: 'auto', background: 'var(--bg-0)',
        border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px 14px',
        fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.7,
      }}>
        {!shown.length && <span style={{ color: 'var(--text-dim)' }}>En attente d'événements…</span>}
        {shown.map((l) => (
          <div key={l.id} style={{ display: 'flex', gap: '10px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>{fmtTime(l.ts)}</span>
            <span style={{ color: COLORS[l.level] || 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>[{l.level}]</span>
            <span style={{ wordBreak: 'break-word' }}>{l.msg}</span>
          </div>
        ))}
      </div>
      <span className="mono-note">Derniers événements enregistrés du nœud, puis temps réel (mouvements, connexions, commandes, alertes, annotations).</span>
    </section>
  );
}
