import { useEffect, useState } from 'react';
import { Lightbulb, FlaskConical, Play, Square, Sliders } from 'lucide-react';
import { api } from '../lib/api';
import { fmtDateTime, fmtDuration } from '../lib/format';

const LABELS = [
  { value: 'gas_test', label: 'Test gaz (briquet non allumé)' },
  { value: 'heat_test', label: 'Test chaleur (DHT22)' },
  { value: 'motion_test', label: 'Test mouvement (PIR)' },
  { value: 'maintenance', label: 'Maintenance / câblage' },
  { value: 'other', label: 'Autre' },
];

const pendingKey = (id) => `sentinel.test.${id}`;

function loadPending(id) {
  try {
    return JSON.parse(sessionStorage.getItem(pendingKey(id)) || 'null');
  } catch {
    return null;
  }
}

function savePending(id, value) {
  try {
    if (value) sessionStorage.setItem(pendingKey(id), JSON.stringify(value));
    else sessionStorage.removeItem(pendingKey(id));
  } catch {
    // ignore: the test period only lives in memory
  }
}

export default function ControlPanel({ device, canAct, now, annotations, onAnnotations }) {
  const id = device?.device_id;
  const [duration, setDuration] = useState(15);
  const [feedback, setFeedback] = useState(null);
  // remounted per device (key in App), so the pending test is read once here
  const [pending, setPending] = useState(() => (id ? loadPending(id) : null));
  const [label, setLabel] = useState(LABELS[0].value);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!id) return;
    api(`/annotations?device=${encodeURIComponent(id)}`).then(onAnnotations).catch(() => {});
  }, [id, onAnnotations]);

  const sendCommand = async (strobe) => {
    setFeedback(null);
    try {
      await api(`/devices/${encodeURIComponent(id)}/command`, { method: 'POST', body: { strobe, duration_s: duration } });
      setFeedback({ ok: true, msg: strobe ? `LED environnement clignotante pendant ${duration} s` : 'LED environnement arrêtée' });
    } catch (err) {
      setFeedback({ ok: false, msg: err.message });
    }
  };

  const startTest = () => {
    const p = { start: Date.now(), label, note };
    savePending(id, p);
    setPending(p);
  };

  const stopTest = async (save) => {
    if (save) {
      try {
        await api('/annotations', { method: 'POST', body: { device_id: id, start: pending.start, end: Date.now(), label: pending.label, note: pending.note } });
        setFeedback({ ok: true, msg: 'Période de test enregistrée (exclue de l\'entraînement)' });
      } catch (err) {
        setFeedback({ ok: false, msg: err.message });
        return;
      }
    }
    savePending(id, null);
    setPending(null);
    setNote('');
  };

  const disabled = !canAct || !device;
  const offline = device && !device.online;

  return (
    <section className="card-surface panel">
      <div className="panel-head">
        <div className="panel-title">
          <Sliders size={18} color="var(--text-secondary)" />
          Commandes du nœud
        </div>
        <span className="mono-note">{canAct ? (id || 'aucun nœud') : 'lecture seule (clé service)'}</span>
      </div>

      <div className="sub-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
          <Lightbulb size={16} color="var(--danger)" /> LED environnement (GPIO 26)
        </div>
        <p className="mono-note">
          Fixe : plafond local gaz/température dépassé sur le nœud. Clignotante : alerte confirmée ou commande opérateur (MQTT vigil8/{id || '…'}/cmd).
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="field" style={{ width: 'auto' }} value={duration} onChange={(e) => setDuration(Number(e.target.value))} disabled={disabled}>
            {[5, 15, 30, 60].map((s) => <option key={s} value={s}>{s} s</option>)}
          </select>
          <button type="button" className="interactive-btn danger" disabled={disabled || offline} onClick={() => sendCommand(true)}>
            <Play size={14} /> Faire clignoter
          </button>
          <button type="button" className="interactive-btn" disabled={disabled || offline} onClick={() => sendCommand(false)}>
            <Square size={14} /> Arrêter
          </button>
          {offline && <span className="mono-note" style={{ color: 'var(--warn)' }}>nœud hors ligne</span>}
        </div>
      </div>

      <div className="sub-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px' }}>
          <FlaskConical size={16} color="var(--info)" /> Période de test (annotation)
        </div>
        <p className="mono-note">
          Marquez vos tests (briquet, souffle chaud…) : ils sont exclus des données d'entraînement de l'Isolation Forest et servent à l'évaluer.
        </p>
        {pending ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge" style={{ color: 'var(--info)', borderColor: 'var(--info-border)' }}>
              {LABELS.find((l) => l.value === pending.label)?.label || pending.label} · {fmtDuration(Math.floor((now - pending.start) / 1000))}
            </span>
            <button type="button" className="interactive-btn accent" disabled={disabled} onClick={() => stopTest(true)}>
              <Square size={14} /> Terminer et enregistrer
            </button>
            <button type="button" className="interactive-btn" onClick={() => stopTest(false)}>Annuler</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
            <select className="field" value={label} onChange={(e) => setLabel(e.target.value)} disabled={disabled}>
              {LABELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            <input className="field" placeholder="Note (optionnelle)" maxLength={300} value={note}
              onChange={(e) => setNote(e.target.value)} disabled={disabled} />
            <button type="button" className="interactive-btn accent" disabled={disabled} onClick={startTest}>
              <Play size={14} /> Démarrer
            </button>
          </div>
        )}
        {annotations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {annotations.slice(0, 3).map((a) => (
              <span key={a._id} className="mono-note">
                {fmtDateTime(a.start)} → {fmtDateTime(a.end)} · {a.label}{a.note ? ` · ${a.note}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {feedback && (
        <span className="mono-note" style={{ color: feedback.ok ? 'var(--ok)' : 'var(--danger)' }}>{feedback.msg}</span>
      )}
    </section>
  );
}
