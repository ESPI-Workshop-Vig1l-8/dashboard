import { motion } from 'motion/react';
import { Radio, Lock, LogOut, Volume2, VolumeX } from 'lucide-react';
import { STALE_MS } from '../lib/format';

function Pill({ tone, label }) {
  const color = { nominal: 'var(--emerald)', alert: 'var(--rose)', warning: 'var(--amber)', muted: 'var(--text-muted)' }[tone];
  return (
    <div className={`status-pill ${tone}`}>
      <span className="dot" style={{ background: color }} />
      <span style={{ fontWeight: 600 }}>{label}</span>
    </div>
  );
}

export default function Header({ devices, selectedId, onSelect, conn, health, openAlerts, now, role, sound, onSound, onLogout }) {
  const device = devices.find((d) => d.device_id === selectedId);
  const deviceTone = !device ? 'muted' : !device.online ? 'alert' : now - (device.last_seen || 0) > STALE_MS ? 'warning' : 'nominal';
  const deviceLabel = !device ? 'Aucun nœud' : !device.online ? 'Nœud hors ligne' : deviceTone === 'warning' ? 'Nœud muet' : 'Nœud en ligne';

  const services = health && health.mqtt && health.couchdb;
  const serviceTone = conn !== 'open' ? 'alert' : services ? 'nominal' : 'warning';
  const serviceLabel = conn !== 'open' ? 'Temps réel coupé' : !health ? 'Backend ?' : services ? 'Services OK'
    : `${health.mqtt ? '' : 'MQTT ✗ '}${health.couchdb ? '' : 'CouchDB ✗'}`.trim();

  return (
    <header className="card-surface" style={{ padding: '16px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
          <Radio size={18} color="var(--sky)" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px' }}>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>AetherCorp</span>
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>Sentinel-X</span>
          <span style={{ color: 'var(--text-dim)' }}>/</span>
          {devices.length > 1 ? (
            <select className="field" style={{ width: 'auto', padding: '4px 8px', fontFamily: 'var(--font-mono)', color: 'var(--sky)' }}
              value={selectedId || ''} onChange={(e) => onSelect(e.target.value)}>
              {devices.map((d) => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
            </select>
          ) : (
            <span style={{ color: 'var(--sky)', fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600 }}>{selectedId || 'VIG1L-8'}</span>
          )}
        </div>
        {device && (
          <span className="mono-note">
            {device.ip ? `ESP32 ${device.ip}` : 'IP inconnue'}{device.fw ? ` · fw ${device.fw}` : ''}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <Pill tone={openAlerts ? 'alert' : 'nominal'} label={openAlerts ? `${openAlerts} alerte${openAlerts > 1 ? 's' : ''}` : 'Nominal'} />
        <Pill tone={deviceTone} label={deviceLabel} />
        <Pill tone={serviceTone} label={serviceLabel} />
        <div className="badge" style={{ padding: '5px 10px' }} title="ESP32 → broker : MQTT sur TLS 1.2, CA locale">
          <Lock size={12} color="var(--sky)" /> MQTTS
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={onSound} className="interactive-btn" type="button" title="Son des alertes">
          {sound ? <Volume2 size={15} color="var(--emerald)" /> : <VolumeX size={15} />}
        </motion.button>
        <div style={{ paddingLeft: '12px', borderLeft: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'right' }}>
          <div style={{ fontWeight: 600 }} className="tabular">{new Date(now).toLocaleTimeString('fr-FR')}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{role === 'operator' ? 'opérateur' : 'lecture seule'}</div>
        </div>
        <button type="button" className="interactive-btn" onClick={onLogout} title="Se déconnecter">
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}
