import { useCallback, useEffect, useReducer } from 'react';
import { connectSocket } from './api';

const LIVE_POINTS = 1800; // 1 h at one reading every 2 s
const LOG_SIZE = 200;
const ALERTS_SIZE = 100;

const initialState = {
  conn: 'connecting',
  devices: {},
  alerts: [],
  annotations: [],
  live: {},
  log: [],
  incident: null,
};

function logEntry(ts, category, level, msg) {
  return { id: `${ts}-${Math.random()}`, ts, category, level, msg };
}

function pushLog(state, entry, key) {
  if (!entry) return state.log;
  return [...state.log.slice(-(LOG_SIZE - 1)), key ? { ...entry, key } : entry];
}

function toPoint(doc) {
  return {
    t: doc.received_at,
    temp_c: doc.temp_c,
    hum_pct: doc.hum_pct,
    gas_mv: doc.gas_mv,
    pir: doc.pir,
    env_warn: doc.status?.env_warn,
    gas_warm: doc.status?.gas_warm,
  };
}

function alertText(a) {
  const conf = typeof a.confidence === 'number' ? ` (${Math.round(a.confidence * 100)} %)` : '';
  return `${a.category}${conf} — ${a.source}${a.device_id ? ` sur ${a.device_id}` : ''}${a.details ? ` : ${a.details}` : ''}`;
}

// Log line for a stored event (motion, status, command), live or preloaded
function eventLog(doc) {
  const id = doc.device_id;
  switch (doc.type) {
    case 'motion':
      return logEntry(doc.received_at, 'CAPTEURS', doc.state ? 'MOUVEMENT' : 'INFO',
        `${id} : ${doc.state ? 'mouvement détecté (PIR)' : 'fin de mouvement'}`);
    case 'status':
      return logEntry(doc.received_at, 'SYSTÈME', doc.online ? 'EN LIGNE' : 'HORS LIGNE',
        doc.online ? `${id} connecté (firmware ${doc.fw}, ${doc.ip})` : `${id} déconnecté (LWT)`);
    case 'command':
      return logEntry(doc.received_at, 'SYSTÈME', 'COMMANDE',
        `LED environnement de ${id} ${doc.strobe ? `clignotante ${doc.duration_s} s` : 'arrêtée'} (${doc.source})`);
    default:
      return null;
  }
}

function onSocketMessage(state, { type, ts, data }) {
  switch (type) {
    case 'snapshot': {
      const devices = {};
      for (const d of data.devices || []) devices[d.device_id] = d;
      return { ...state, devices, alerts: data.alerts || [] };
    }
    case 'telemetry': {
      const id = data.device_id;
      const prev = state.devices[id] || { device_id: id };
      const series = state.live[id] || [];
      return {
        ...state,
        devices: { ...state.devices, [id]: { ...prev, online: true, last_seen: data.received_at, telemetry: data, motion: data.pir } },
        live: { ...state.live, [id]: [...series.slice(-(LIVE_POINTS - 1)), toPoint(data)] },
      };
    }
    case 'event': {
      const id = data.device_id;
      const prev = state.devices[id] || { device_id: id };
      return {
        ...state,
        devices: { ...state.devices, [id]: { ...prev, motion: data.state, last_seen: data.received_at } },
        log: pushLog(state, eventLog(data), data._id),
      };
    }
    case 'status': {
      const id = data.device_id;
      const prev = state.devices[id] || { device_id: id };
      return {
        ...state,
        devices: { ...state.devices, [id]: { ...prev, online: data.online, fw: data.fw || prev.fw, ip: data.ip || prev.ip } },
        log: pushLog(state, eventLog(data), data._id),
      };
    }
    case 'command':
      return { ...state, log: pushLog(state, eventLog(data), data._id) };
    case 'alert':
      return {
        ...state,
        alerts: [data, ...state.alerts].slice(0, ALERTS_SIZE),
        incident: data,
        log: pushLog(state, logEntry(data.received_at, 'ALERTES', data.level === 'confirmed' ? 'CONFIRMÉE' : 'AVERTISSEMENT', alertText(data))),
      };
    case 'alert_ack':
      return {
        ...state,
        alerts: state.alerts.map((a) => (a._id === data._id ? data : a)),
        incident: state.incident?._id === data._id ? null : state.incident,
        log: pushLog(state, logEntry(ts, 'ALERTES', 'ACQUITTÉE', alertText(data))),
      };
    case 'annotation':
      return {
        ...state,
        annotations: [data, ...state.annotations.filter((a) => a._id !== data._id)],
        log: pushLog(state, logEntry(ts, 'SYSTÈME', 'ANNOTATION', `Période de test « ${data.label} » enregistrée pour ${data.device_id}`)),
      };
    default:
      return state;
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'ws':
      return onSocketMessage(state, action.msg);
    case 'conn': {
      if (action.status === state.conn) return state;
      const msg = { open: 'Flux temps réel connecté', closed: 'Flux temps réel perdu, reconnexion…' }[action.status];
      return { ...state, conn: action.status, log: msg ? pushLog(state, logEntry(Date.now(), 'SYSTÈME', 'INFO', msg)) : state.log };
    }
    case 'history': {
      // stored events of a node, newest first: merged before the live log
      const known = new Set(state.log.map((l) => l.key).filter(Boolean));
      const older = action.docs.slice().reverse()
        .map((doc) => { const e = eventLog(doc); return e && { ...e, key: doc._id }; })
        .filter((e) => e && !known.has(e.key));
      return { ...state, log: [...older, ...state.log].sort((a, b) => a.ts - b.ts).slice(-LOG_SIZE) };
    }
    case 'annotations':
      return { ...state, annotations: action.list };
    case 'alertUpdated':
      return { ...state, alerts: state.alerts.map((a) => (a._id === action.alert._id ? action.alert : a)) };
    case 'dismissIncident':
      return { ...state, incident: null };
    default:
      return state;
  }
}

export function useSentinel(token) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (!token) return undefined;
    return connectSocket(token, {
      onMessage: (msg) => dispatch({ type: 'ws', msg }),
      onStatus: (status) => dispatch({ type: 'conn', status }),
    });
  }, [token]);

  const actions = {
    setAnnotations: useCallback((list) => dispatch({ type: 'annotations', list }), []),
    addHistory: useCallback((docs) => dispatch({ type: 'history', docs }), []),
    alertUpdated: useCallback((alert) => dispatch({ type: 'alertUpdated', alert }), []),
    dismissIncident: useCallback(() => dispatch({ type: 'dismissIncident' }), []),
  };
  return [state, actions];
}
