import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, fetchHealth, getToken, setToken } from './lib/api';
import { threatOf } from './lib/format';
import { useSentinel } from './lib/useSentinel';
import Header from './components/Header';
import Login from './components/Login';
import SensorPanel from './components/SensorPanel';
import CameraPanel from './components/CameraPanel';
import AlertsPanel from './components/AlertsPanel';
import ControlPanel from './components/ControlPanel';
import EventLog from './components/EventLog';
import IncidentToast from './components/IncidentToast';
import AlertStrip from './components/AlertStrip';

function beep(freq) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // audio not available
  }
}

function Dashboard({ token, role, onLogout }) {
  const [state, actions] = useSentinel(token);
  const [now, setNow] = useState(() => Date.now());
  const [health, setHealth] = useState(null);
  const [selected, setSelected] = useState(null);
  const [sound, setSound] = useState(false);
  const lastIncident = useRef(null);
  const canAct = role === 'operator';

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const poll = () => fetchHealth().then(setHealth);
    poll();
    const t = setInterval(poll, 15_000);
    return () => clearInterval(t);
  }, []);

  const devices = Object.values(state.devices).sort((a, b) => a.device_id.localeCompare(b.device_id));
  const selectedId = selected && state.devices[selected] ? selected : devices[0]?.device_id;
  const device = state.devices[selectedId];

  // Latest stored events of the node, so the log is not empty on load
  const { addHistory } = actions;
  useEffect(() => {
    if (!selectedId) return;
    api(`/devices/${encodeURIComponent(selectedId)}/events?limit=40`).then(addHistory).catch(() => {});
  }, [selectedId, addHistory]);

  useEffect(() => {
    const inc = state.incident;
    if (inc && inc._id !== lastIncident.current) {
      lastIncident.current = inc._id;
      if (sound) beep(inc.level === 'confirmed' ? 950 : 660);
    }
  }, [state.incident, sound]);

  const ack = useCallback(async (alert) => {
    try {
      actions.alertUpdated(await api(`/alerts/${encodeURIComponent(alert._id)}/ack`, { method: 'POST' }));
      actions.dismissIncident();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) onLogout('Session expirée');
    }
  }, [actions, onLogout]);

  const forDevice = (a) => !a.device_id || a.device_id === selectedId;
  const lastPrediction = state.alerts.find((a) => a.source === 'ia-prediction' && forDevice(a));
  const lastVision = state.alerts.find((a) => a.source === 'ia-vision');
  const openAlerts = state.alerts.filter((a) => !a.acked_at).length;
  const confirmedOpen = state.alerts.some((a) => !a.acked_at && a.level === 'confirmed');
  const threat = threatOf({ openAlerts, confirmedOpen, device, now });

  return (
    <div className="shell">
      <Header devices={devices} selectedId={selectedId} onSelect={setSelected} conn={state.conn} health={health}
        threat={threat} now={now} role={role} sound={sound} onSound={() => setSound((s) => !s)} onLogout={() => onLogout()} />

      <main className="deck">
        <AlertStrip alerts={state.alerts} canAct={canAct} now={now} onAck={ack} />

        <div className="deck-grid">
          <div className="col-main">
            <div className="area-sensors">
              <SensorPanel device={device} live={state.live[selectedId]} now={now} lastPrediction={lastPrediction} />
            </div>
            <div className="area-controls">
              <ControlPanel key={selectedId || 'none'} device={device} canAct={canAct} now={now}
                annotations={state.annotations.filter((a) => a.device_id === selectedId)} onAnnotations={actions.setAnnotations} />
            </div>
          </div>
          <div className="col-side">
            <div className="area-alerts">
              <AlertsPanel alerts={state.alerts} canAct={canAct} onUpdated={actions.alertUpdated} />
            </div>
            <div className="area-vision">
              <CameraPanel motion={device?.motion} lastVisionAlert={lastVision} now={now} />
            </div>
          </div>
          <div className="area-log">
            <EventLog log={state.log} />
          </div>
        </div>

        <footer className="page-foot">
          <span>ESP32 → MQTTS → Mosquitto → backend Go → CouchDB · {health ? `backend ${Math.floor(health.uptime_s / 60)} min, ${health.rejected} message(s) rejeté(s)` : 'backend ?'}</span>
          <span>EPSI Workshop National · M1 2026</span>
        </footer>
      </main>

      <IncidentToast incident={state.incident} canAct={canAct} onAck={ack} onClose={actions.dismissIncident} />
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(() => ({ token: getToken(), role: null, reason: null }));

  const logout = useCallback((reason = null) => {
    setToken('');
    setSession({ token: '', role: null, reason });
  }, []);

  // Validate a token restored from sessionStorage
  useEffect(() => {
    if (!session.token || session.role) return;
    api('/session', { token: session.token })
      .then(({ role }) => setSession((s) => ({ ...s, role })))
      .catch(() => logout('Session expirée, reconnectez-vous'));
  }, [session.token, session.role, logout]);

  if (!session.token || !session.role) {
    return session.token ? null : (
      <Login reason={session.reason} onLogin={(token, role) => {
        setToken(token);
        setSession({ token, role, reason: null });
      }} />
    );
  }
  return <Dashboard token={session.token} role={session.role} onLogout={logout} />;
}
