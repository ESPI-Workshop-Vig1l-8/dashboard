import { useState } from 'react';
import { KeyRound, Radio } from 'lucide-react';
import { api } from '../lib/api';

// The access key is the backend API token (operator or service). It is kept
// in sessionStorage only: closing the tab logs out.
export default function Login({ onLogin, reason }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState(reason || null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { role } = await api('/session', { token: key.trim() });
      onLogin(key.trim(), role);
    } catch (err) {
      setError(err.status === 401 ? 'Clé d\'accès invalide' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <form onSubmit={submit} className="card-surface panel" style={{ width: '100%', maxWidth: '400px' }}>
        <div className="panel-title" style={{ fontSize: '16px' }}>
          <Radio size={18} color="var(--sky)" /> AetherCorp / Sentinel-X
        </div>
        <p className="mono-note">Centre de commandement tactique — accès réservé. Saisissez la clé d'accès opérateur.</p>
        <label className="metric-label" htmlFor="access-key" style={{ marginBottom: 0 }}>
          <KeyRound size={14} /> Clé d'accès
        </label>
        <input id="access-key" className="field" type="password" autoComplete="current-password" autoFocus
          value={key} onChange={(e) => setKey(e.target.value)} />
        {error && <span className="mono-note" style={{ color: 'var(--rose)' }}>{error}</span>}
        <button type="submit" className="interactive-btn accent" disabled={busy || !key.trim()} style={{ justifyContent: 'center' }}>
          {busy ? 'Vérification…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
