import { useState } from 'react';
import { Download } from 'lucide-react';
import { download } from '../lib/api';

const PERIODS = [
  { label: '1 h', ms: 3600_000 },
  { label: '6 h', ms: 6 * 3600_000 },
  { label: '24 h', ms: 24 * 3600_000 },
  { label: '7 jours', ms: 7 * 24 * 3600_000 },
];

// Training CSV for the Isolation Forest (backend GET /devices/{id}/export.csv):
// normal readings only, continuous segments, columns of generer_données.py.
export default function ExportCsv({ deviceId }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(PERIODS[2]);
  const [keepTests, setKeepTests] = useState(false);
  const [state, setState] = useState(null);

  const run = async () => {
    setState({ busy: true });
    const to = Date.now();
    try {
      const headers = await download(
        `/devices/${encodeURIComponent(deviceId)}/export.csv?from=${to - period.ms}&to=${to}${keepTests ? '&annotations=keep' : ''}`,
        `${deviceId}.csv`,
      );
      const kept = Number(headers.get('X-Export-Kept') || 0);
      const read = Number(headers.get('X-Export-Readings') || 0);
      setState({ ok: kept > 0, msg: kept > 0
        ? `${kept} mesures exportées sur ${read} (${read - kept} rejetées : erreurs, préchauffage${keepTests ? '' : ', tests'}, segments trop courts)`
        : `Aucune mesure exploitable sur ${read} lues : il faut au moins 2 min de mesures continues valides` });
    } catch (err) {
      setState({ ok: false, msg: err.message });
    }
  };

  return (
    <>
      <button type="button" className={`interactive-btn ${open ? 'accent' : ''}`} onClick={() => setOpen((o) => !o)} disabled={!deviceId}
        title="Exporter les mesures pour l'entraînement du modèle">
        <Download size={14} /> Exporter CSV
      </button>
      {open && (
        <div className="sub-card" style={{ flexBasis: '100%', display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-app)' }}>
          <span className="mono-note">
            CSV d'entraînement de l'Isolation Forest : mesures normales seulement (sans erreur DHT22, préchauffage ni périodes de test),
            découpées en segments continus. À enregistrer en donnees/normal.csv, puis python entrainement.py.
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="segmented">
              {PERIODS.map((p) => (
                <button key={p.label} type="button" className={p === period ? 'active' : ''} onClick={() => setPeriod(p)}>{p.label}</button>
              ))}
            </div>
            <label className="mono-note" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={keepTests} onChange={(e) => setKeepTests(e.target.checked)} />
              garder les périodes de test (jeu d'évaluation)
            </label>
            <button type="button" className="interactive-btn accent" onClick={run} disabled={state?.busy}>
              <Download size={14} /> {state?.busy ? 'Export…' : 'Télécharger'}
            </button>
          </div>
          {state && !state.busy && (
            <span className="mono-note" style={{ color: state.ok ? 'var(--emerald)' : 'var(--amber)' }}>{state.msg}</span>
          )}
        </div>
      )}
    </>
  );
}
