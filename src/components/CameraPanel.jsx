import { useState } from 'react';
import { Camera, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { getToken } from '../lib/api';
import { fmtAgo } from '../lib/format';

// MJPEG stream published by IA_Vision on the server (USB webcam), proxied by
// nginx under /vision/. IA_Vision checks the access key passed in ?token=.
const STREAM_URL = import.meta.env.VITE_VISION_STREAM_URL || '';
const RECENT_MS = 30_000;
const SHOW_KEY = 'sentinel.camera.visible';

function loadVisible() {
  try {
    return sessionStorage.getItem(SHOW_KEY) === '1';
  } catch {
    return false;
  }
}

// Compact by default: camera state, PIR and last detection. The live stream is
// only loaded when shown (no bandwidth or JPEG encoding on IA_Vision otherwise).
export default function CameraPanel({ motion, lastVisionAlert, now }) {
  const [visible, setVisible] = useState(loadVisible);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const src = STREAM_URL ? `${STREAM_URL}?token=${encodeURIComponent(getToken())}&r=${attempt}` : '';
  const recent = lastVisionAlert && now - lastVisionAlert.received_at < RECENT_MS && !lastVisionAlert.acked_at;

  const toggle = () => {
    const next = !visible;
    setVisible(next);
    setFailed(false);
    try {
      sessionStorage.setItem(SHOW_KEY, next ? '1' : '0');
    } catch {
      // the choice only lives in memory
    }
  };

  return (
    <section className={`card-surface panel ${recent ? 'is-alert' : ''}`}>
      <div className="panel-head">
        <div className="panel-title">
          <Camera size={18} color="var(--text-secondary)" />
          Vision (YOLOv8n)
        </div>
        <button type="button" className={`interactive-btn ${visible ? 'accent' : ''}`} onClick={toggle} disabled={!STREAM_URL}
          title={STREAM_URL ? '' : 'Flux vidéo non configuré (VITE_VISION_STREAM_URL)'}>
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          {visible ? 'Masquer le flux' : 'Afficher le flux'}
        </button>
      </div>

      <div className="sub-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600,
            color: recent ? 'var(--rose)' : 'var(--text-secondary)' }}>
            <span className="dot" style={{ background: recent ? 'var(--rose)' : 'var(--emerald)' }} />
            {recent
              ? `${lastVisionAlert.category.toUpperCase()}${typeof lastVisionAlert.confidence === 'number' ? ` • ${lastVisionAlert.confidence.toFixed(2)}` : ''}`
              : 'Zone calme'}
          </span>
          <span className="mono-note">
            {lastVisionAlert ? `Dernière détection ${fmtAgo(lastVisionAlert.received_at, now)}` : 'Aucune détection'}
          </span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'var(--font-mono)',
          color: motion ? 'var(--rose)' : 'var(--text-muted)' }}>
          <span className="dot" style={{ background: motion ? 'var(--rose)' : 'var(--text-dim)' }} />
          PIR HC-SR501 : {motion ? 'mouvement détecté' : 'calme'}
        </span>
        <span className="mono-note">CAM01 // USB // 640x480 · les détections arrivent en alertes, flux affiché ou non</span>
      </div>

      {visible && STREAM_URL && (
        <div style={{
          position: 'relative', width: '100%', aspectRatio: '4/3', background: '#040507', borderRadius: '8px',
          overflow: 'hidden', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {!failed ? (
            <img src={src} alt="Flux vidéo de la webcam analysé par IA_Vision" onError={() => setFailed(true)}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)', fontSize: '13px' }}>
                <AlertTriangle size={15} /> Flux vidéo injoignable : IA_Vision est-il lancé sur le serveur ?
              </span>
              <button type="button" className="interactive-btn" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>Réessayer</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
