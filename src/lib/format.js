export const STALE_MS = 10000;

// Local ceilings of the node's environment LED (firmware include/config.h).
export const TEMP_WARN_C = 40;
export const GAS_WARN_MV = 800;

export function fmtTime(ms, withSeconds = true) {
  if (!ms) return '—';
  return new Date(ms).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    ...(withSeconds ? { second: '2-digit' } : {}),
  });
}

export function fmtDateTime(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function fmtAgo(ms, now) {
  if (!ms) return 'jamais';
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  return `il y a ${Math.floor(s / 3600)} h`;
}

export function fmtNum(v, digits = 1) {
  return typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—';
}

export function fmtDuration(secs) {
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export const LEVEL = {
  warning: { label: 'Avertissement', color: 'var(--warn)', subtle: 'var(--warn-subtle)', border: 'var(--warn-border)' },
  confirmed: { label: 'Confirmée', color: 'var(--danger)', subtle: 'var(--danger-subtle)', border: 'var(--danger-border)' },
};

// Overall state of the table, from the open alerts and the node's link
export function threatOf({ openAlerts, confirmedOpen, device, now }) {
  if (confirmedOpen) return { tone: 'alert', state: 'ALERTE', detail: 'Alerte confirmée en attente d\'acquittement' };
  if (openAlerts) return { tone: 'warning', state: 'VIGILANCE', detail: `${openAlerts} alerte${openAlerts > 1 ? 's' : ''} ouverte${openAlerts > 1 ? 's' : ''}` };
  if (!device) return { tone: 'muted', state: 'EN ATTENTE', detail: 'Aucun nœud n\'a encore publié' };
  if (!device.online || now - (device.last_seen || 0) > STALE_MS) return { tone: 'warning', state: 'DÉGRADÉ', detail: 'Le nœud ne transmet plus' };
  return { tone: 'nominal', state: 'NOMINAL', detail: 'Aucune alerte ouverte' };
}
