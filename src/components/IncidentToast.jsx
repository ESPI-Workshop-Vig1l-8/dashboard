import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import { LEVEL } from '../lib/format';

export default function IncidentToast({ incident, canAct, onAck, onClose }) {
  const lvl = incident ? LEVEL[incident.level] || LEVEL.warning : LEVEL.warning;
  return (
    <AnimatePresence>
      {incident && (
        <motion.div key={incident._id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: 0.95 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          role="alert"
          style={{
            position: 'fixed', bottom: '28px', right: '28px', zIndex: 50, maxWidth: '460px', width: 'calc(100% - 56px)',
            background: 'var(--bg-card)', border: `1px solid ${lvl.border}`, borderRadius: '12px', padding: '16px 20px',
            boxShadow: '0 14px 36px -8px rgba(0,0,0,0.7)', display: 'flex', gap: '14px', alignItems: 'flex-start',
          }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: lvl.subtle, border: `1px solid ${lvl.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={18} color={lvl.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '14px', fontWeight: 700 }}>
                {lvl.label} : {incident.category}{incident.device_id ? ` (${incident.device_id})` : ''}
              </span>
              <button type="button" onClick={onClose} aria-label="Fermer" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5, wordBreak: 'break-word' }}>
              {incident.source}{typeof incident.confidence === 'number' ? ` · confiance ${Math.round(incident.confidence * 100)} %` : ''}
              {incident.details ? ` — ${incident.details}` : ''}
            </p>
            <div style={{ marginTop: '10px' }}>
              <button type="button" className="interactive-btn" disabled={!canAct} onClick={() => onAck(incident)}
                style={{ padding: '6px 12px', fontSize: '12px', color: lvl.color, fontWeight: 600 }}>
                Acquitter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
