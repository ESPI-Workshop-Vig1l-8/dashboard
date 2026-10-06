import { useState } from 'react';
import { Camera, AlertTriangle } from 'lucide-react';
import { fmtAgo } from '../lib/format';

// MJPEG stream published by IA_Vision on the server (USB webcam), e.g.
// VITE_VISION_STREAM_URL=/vision/stream.mjpg behind the same nginx.
const STREAM_URL = import.meta.env.VITE_VISION_STREAM_URL || '';
const RECENT_MS = 30_000;

export default function CameraPanel({ motion, lastVisionAlert, now }) {
  const [failed, setFailed] = useState(false);
  const recent = lastVisionAlert && now - lastVisionAlert.received_at < RECENT_MS && !lastVisionAlert.acked_at;

  return (
    <section className={`card-surface panel ${recent ? 'is-alert' : ''}`}>
      <div className="panel-head">
        <div className="panel-title">
          <Camera size={18} color="var(--text-secondary)" />
          Vision (YOLOv8n, webcam du serveur)
        </div>
        <span className="mono-note">
          {lastVisionAlert ? `Dernière détection ${fmtAgo(lastVisionAlert.received_at, now)}` : 'Aucune détection'}
        </span>
      </div>

      <div style={{
        position: 'relative', width: '100%', aspectRatio: '4/3', background: '#040507', borderRadius: '8px',
        overflow: 'hidden', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {STREAM_URL && !failed ? (
          <img src={STREAM_URL} alt="Flux vidéo de la webcam analysé par IA_Vision" onError={() => setFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center', maxWidth: '440px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1px solid var(--border-medium)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Camera size={22} />
            </div>
            {STREAM_URL ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)', fontSize: '13px' }}>
                <AlertTriangle size={15} /> Flux vidéo injoignable ({STREAM_URL})
              </span>
            ) : (
              <span className="mono-note">
                Flux vidéo non configuré. IA_Vision doit publier un flux MJPEG, puis définir VITE_VISION_STREAM_URL au build du dashboard.
                Les détections arrivent quand même en alertes.
              </span>
            )}
            {STREAM_URL && (
              <button type="button" className="interactive-btn" onClick={() => setFailed(false)}>Réessayer</button>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute', top: '12px', left: '12px', background: 'rgba(9, 9, 11, 0.8)', backdropFilter: 'blur(8px)',
          padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-mono)',
          fontSize: '11px', color: 'var(--text-secondary)',
        }}>
          CAM01 // USB // 640x480
        </div>

        {recent && (
          <div style={{
            position: 'absolute', top: '12px', right: '12px', background: 'var(--rose)', color: '#fff', fontSize: '12px',
            fontWeight: 700, padding: '4px 10px', borderRadius: '6px', fontFamily: 'var(--font-mono)',
          }}>
            {lastVisionAlert.category.toUpperCase()}
            {typeof lastVisionAlert.confidence === 'number' ? ` • ${lastVisionAlert.confidence.toFixed(2)}` : ''}
          </div>
        )}

        <div style={{
          position: 'absolute', bottom: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(8px)', padding: '5px 12px', borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)', fontSize: '12px', fontFamily: 'var(--font-mono)',
          color: motion ? 'var(--rose)' : 'var(--text-secondary)',
        }}>
          <span className="dot" style={{ background: motion ? 'var(--rose)' : 'var(--emerald)' }} />
          PIR HC-SR501 : {motion ? 'mouvement détecté' : 'calme'}
        </div>
      </div>
    </section>
  );
}
