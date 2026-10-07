import { useEffect, useMemo, useState } from 'react';
import { Activity, Droplets, Flame, Thermometer, Wifi } from 'lucide-react';
import { api } from '../lib/api';
import { fmtAgo, fmtNum, GAS_WARN_MV, STALE_MS, TEMP_WARN_C } from '../lib/format';
import Chart from './Chart';
import ExportCsv from './ExportCsv';

const RANGES = [
  { key: '15m', label: '15 min', ms: 15 * 60_000, step: 'raw' },
  { key: '1h', label: '1 h', ms: 3600_000, step: 'raw' },
  { key: '6h', label: '6 h', ms: 6 * 3600_000, step: 'minute' },
  { key: '24h', label: '24 h', ms: 24 * 3600_000, step: 'minute' },
];

const METRICS = [
  { key: 'temp_c', label: 'Température', unit: '°C', color: 'var(--amber)', threshold: TEMP_WARN_C },
  { key: 'hum_pct', label: 'Humidité', unit: '%', color: 'var(--sky)' },
  { key: 'gas_mv', label: 'Gaz MQ-2', unit: 'mV', color: 'var(--emerald)', digits: 0, threshold: GAS_WARN_MV },
];

function MetricCard({ icon, label, value, unit, foot, tone }) {
  return (
    <div className={`sub-card ${tone === 'alert' ? 'is-alert' : tone === 'warning' ? 'is-warning' : ''}`}>
      <div className="metric-label">{icon}<span>{label}</span></div>
      <div className="metric-value tabular" style={{ color: tone === 'alert' ? 'var(--rose)' : undefined }}>
        {value} <span className="metric-unit">{unit}</span>
      </div>
      <div className="metric-foot" style={{ color: tone === 'alert' ? 'var(--rose)' : tone === 'warning' ? 'var(--amber)' : undefined }}>
        {foot}
      </div>
    </div>
  );
}

export default function SensorPanel({ device, live, now, lastPrediction }) {
  const [range, setRange] = useState(RANGES[0]);
  const [history, setHistory] = useState({ points: [], error: null });
  const [refresh, setRefresh] = useState(0);
  const id = device?.device_id;

  // History from CouchDB; aggregated ranges are refreshed every minute
  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    const to = Date.now();
    api(`/devices/${encodeURIComponent(id)}/telemetry?from=${to - range.ms}&to=${to}&step=${range.step}`)
      .then((res) => !cancelled && setHistory({ points: res.points, error: null }))
      .catch((err) => !cancelled && setHistory({ points: [], error: err.message }));
    const timer = range.step === 'raw' ? null : setTimeout(() => setRefresh((n) => n + 1), 60_000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, range, refresh]);

  const from = now - range.ms;
  const points = useMemo(() => {
    if (range.step !== 'raw') return history.points;
    const lastT = history.points.length ? history.points[history.points.length - 1].t : 0;
    return [...history.points, ...(live || []).filter((p) => p.t > lastT)].filter((p) => p.t >= from);
  }, [history.points, live, range.step, from]);

  if (!device) {
    return (
      <section className="card-surface panel">
        <div className="panel-title"><Flame size={18} color="var(--text-secondary)" />Télémétrie environnementale</div>
        <p className="mono-note">Aucun nœud n'a encore envoyé de données. Vérifiez que l'ESP32 est connecté au broker (MQTTS).</p>
      </section>
    );
  }

  const t = device.telemetry || {};
  const status = t.status || {};
  const stale = !device.last_seen || now - device.last_seen > STALE_MS;
  const dhtError = status.dht === 'error';
  const tempHigh = typeof t.temp_c === 'number' && t.temp_c > TEMP_WARN_C;
  const gasHigh = typeof t.gas_mv === 'number' && t.gas_mv > GAS_WARN_MV;
  const prediction = lastPrediction;

  return (
    <section className={`card-surface panel ${status.env_warn ? 'is-alert' : ''}`}>
      <div className="panel-head">
        <div className="panel-title">
          <Flame size={18} color="var(--text-secondary)" />
          Télémétrie environnementale
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {status.env_warn && <span className="badge" style={{ color: 'var(--rose)', borderColor: 'var(--rose-border)' }}>Plafond local dépassé (LED fixe)</span>}
          {status.gas_warm === false && <span className="badge" style={{ color: 'var(--amber)', borderColor: 'var(--amber-border)' }}>MQ-2 en préchauffage</span>}
          <span className="badge" style={{ color: stale ? 'var(--amber)' : 'var(--text-secondary)' }}>
            <Wifi size={11} /> {stale ? 'pas de données ' : ''}{fmtAgo(device.last_seen, now)}
            {typeof status.rssi === 'number' ? ` · ${status.rssi} dBm` : ''}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <MetricCard icon={<Thermometer size={15} color="var(--amber)" />} label="DHT22 température"
          value={dhtError ? 'ERR' : fmtNum(t.temp_c)} unit="°C"
          foot={dhtError ? 'Capteur sans réponse' : tempHigh ? `Au-dessus de ${TEMP_WARN_C} °C` : 'Lecture toutes les 2 s'}
          tone={dhtError ? 'warning' : tempHigh ? 'alert' : null} />
        <MetricCard icon={<Droplets size={15} color="var(--sky)" />} label="Humidité"
          value={dhtError ? 'ERR' : fmtNum(t.hum_pct)} unit="%"
          foot={dhtError ? 'Capteur sans réponse' : 'Humidité relative'}
          tone={dhtError ? 'warning' : null} />
        <MetricCard icon={<Flame size={15} color={gasHigh ? 'var(--rose)' : 'var(--emerald)'} />} label="Gaz MQ-2"
          value={fmtNum(t.gas_mv, 0)} unit="mV"
          foot={status.gas_warm === false ? 'Préchauffage (3 min)' : gasHigh ? `Au-dessus de ${GAS_WARN_MV} mV` : 'Sortie AO, non étalonnée'}
          tone={gasHigh ? 'alert' : status.gas_warm === false ? 'warning' : null} />
        <MetricCard icon={<Activity size={15} color={device.motion ? 'var(--rose)' : 'var(--text-muted)'} />} label="PIR HC-SR501"
          value={device.motion ? 'MOUVEMENT' : 'Calme'} unit=""
          foot={`${t.pir_events ?? 0} détection(s) sur la dernière mesure`}
          tone={device.motion ? 'alert' : null} />
      </div>

      <div className="sub-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="panel-head">
          <span className="mono-note">HISTORIQUE {range.step === 'raw' ? '(MESURES BRUTES + TEMPS RÉEL)' : '(MOYENNES PAR MINUTE)'}</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="segmented">
              {RANGES.map((r) => (
                <button key={r.key} type="button" className={r.key === range.key ? 'active' : ''} onClick={() => setRange(r)}>
                  {r.label}
                </button>
              ))}
            </div>
            <ExportCsv deviceId={id} />
          </div>
        </div>
        {history.error && <span className="mono-note" style={{ color: 'var(--amber)' }}>Historique indisponible : {history.error}</span>}
        <div className="chart-grid">
        {METRICS.map((m) => {
          const last = [...points].reverse().find((p) => typeof p[m.key] === 'number');
          return (
            <div key={m.key} style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: m.color, fontWeight: 600 }}>• {m.label} ({m.unit})</span>
                <span style={{ color: 'var(--text-muted)' }}>{last ? `${fmtNum(last[m.key], m.digits ?? 1)} ${m.unit}` : '—'}</span>
              </div>
              <Chart points={points} metric={m.key} from={from} to={now} color={m.color} unit={m.unit}
                digits={m.digits ?? 1} threshold={m.threshold} maxGapMs={range.step === 'raw' ? 10_000 : 180_000} height={180} />
            </div>
          );
        })}
        </div>
      </div>

      <div className="sub-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Isolation Forest (IA_Predictions)</div>
          <div className="mono-note">Détection d'anomalies sur fenêtres de 2 min (température, humidité, gaz)</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {prediction ? (
            <>
              <div className="tabular" style={{ fontWeight: 700, color: prediction.level === 'confirmed' ? 'var(--rose)' : 'var(--amber)' }}>
                {prediction.level === 'confirmed' ? 'Anomalie confirmée' : 'Début d\'anomalie'}
              </div>
              <div className="mono-note">{fmtAgo(prediction.received_at, now)}{prediction.acked_at ? ' · acquittée' : ''}</div>
            </>
          ) : (
            <>
              <div className="tabular" style={{ fontWeight: 700, color: 'var(--emerald)' }}>Aucune anomalie</div>
              <div className="mono-note">aucune alerte reçue</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
