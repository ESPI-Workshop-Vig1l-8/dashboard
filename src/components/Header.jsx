import { motion } from 'motion/react';
import { Lock, LogOut, Volume2, VolumeX } from 'lucide-react';
import { STALE_MS } from '../lib/format';

const TONES = {
  nominal: { tone: 'var(--ok)', subtle: 'var(--ok-subtle)', border: 'var(--ok-border)' },
  warning: { tone: 'var(--warn)', subtle: 'var(--warn-subtle)', border: 'var(--warn-border)' },
  alert: { tone: 'var(--danger)', subtle: 'var(--danger-subtle)', border: 'var(--danger-border)' },
  muted: { tone: 'var(--text-muted)', subtle: 'var(--bg-2)', border: 'var(--border-subtle)' },
};

function toneVars(tone) {
  const t = TONES[tone];
  return { '--tone': t.tone, '--tone-subtle': t.subtle, '--tone-border': t.border };
}

function Status({ label, tone, value }) {
  return (
    <li>
      <span>{label}</span>
      <b style={{ color: TONES[tone].tone }}>
        <span className="dot" style={{ background: TONES[tone].tone }} />
        {value}
      </b>
    </li>
  );
}

// Side rail: identity, overall state, links, clock and session. Stays in view
// while the page scrolls, so the state of the table is always visible.
export default function Header({ devices, selectedId, onSelect, conn, health, threat, now, role, sound, onSound, onLogout }) {
  const device = devices.find((d) => d.device_id === selectedId);
  const nodeTone = !device ? 'muted' : !device.online ? 'alert' : now - (device.last_seen || 0) > STALE_MS ? 'warning' : 'nominal';
  const nodeValue = !device ? 'aucun' : !device.online ? 'hors ligne' : nodeTone === 'warning' ? 'muet' : 'en ligne';

  return (
    <aside className="rail">
      <div className="brand">
        <span className="brand-kicker">AetherCorp · VIG1L-8</span>
        <span className="brand-name">Sentinel<span>-X</span></span>
      </div>

      <div className={`threat ${threat.tone === 'alert' ? 'is-pulsing' : ''}`} style={toneVars(threat.tone)} role="status" aria-live="polite">
        <span className="threat-label">État de la table</span>
        <span className="threat-state"><span className="dot" style={{ background: 'var(--tone)' }} />{threat.state}</span>
        <span className="threat-detail">{threat.detail}</span>
      </div>

      <div className="rail-section">
        <span className="rail-title">Nœud</span>
        {devices.length > 1 ? (
          <select className="field" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}
            value={selectedId || ''} onChange={(e) => onSelect(e.target.value)} aria-label="Nœud affiché">
            {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
          </select>
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px' }}>{selectedId || 'VIG1L-8-NODE04'}</span>
        )}
        <span className="mono-note">
          {device?.ip ? `ESP32 ${device.ip}` : 'IP inconnue'}{device?.fw ? ` · fw ${device.fw}` : ''}
        </span>
      </div>

      <div className="rail-section">
        <span className="rail-title">Liaisons</span>
        <ul className="status-list">
          <Status label="Nœud" tone={nodeTone} value={nodeValue} />
          <Status label="Temps réel" tone={conn === 'open' ? 'nominal' : 'alert'} value={conn === 'open' ? 'actif' : 'coupé'} />
          <Status label="Broker MQTT" tone={!health ? 'muted' : health.mqtt ? 'nominal' : 'alert'} value={!health ? '?' : health.mqtt ? 'ok' : 'erreur'} />
          <Status label="CouchDB" tone={!health ? 'muted' : health.couchdb ? 'nominal' : 'alert'} value={!health ? '?' : health.couchdb ? 'ok' : 'erreur'} />
        </ul>
        <span className="badge" style={{ alignSelf: 'flex-start' }} title="ESP32 → broker : MQTT sur TLS 1.2, CA locale">
          <Lock size={11} color="var(--ok)" /> MQTTS · TLS 1.2+
        </span>
      </div>

      <div className="rail-foot">
        <div>
          <div className="clock">{new Date(now).toLocaleTimeString('fr-FR')}</div>
          <span className="mono-note">{new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge" style={{ color: role === 'operator' ? 'var(--brand)' : 'var(--text-muted)', borderColor: role === 'operator' ? 'var(--brand-border)' : undefined }}>
            {role === 'operator' ? 'OPÉRATEUR' : 'LECTURE SEULE'}
          </span>
          <motion.button whileTap={{ scale: 0.94 }} onClick={onSound} className="interactive-btn" type="button"
            title={sound ? 'Couper le son des alertes' : 'Activer le son des alertes'} aria-pressed={sound} style={{ padding: '7px 10px' }}>
            {sound ? <Volume2 size={15} color="var(--ok)" /> : <VolumeX size={15} />}
          </motion.button>
          <button type="button" className="interactive-btn" onClick={onLogout} title="Se déconnecter" style={{ padding: '7px 10px' }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
