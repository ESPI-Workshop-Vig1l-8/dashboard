import { useState } from 'react';
import { KeyRound } from 'lucide-react';
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
      <form onSubmit={submit} className="card-surface panel" style={{ width: '100%', maxWidth: '420px', gap: '18px', padding: '32px' }}>
        <div className="brand">
          <span className="brand-kicker">AetherCorp · VIG1L-8</span>
          <span className="brand-name" style={{ fontSize: '34px' }}>Sentinel<span>-X</span></span>
        </div>
        <p className="mono-note">Centre de commandement de la table — accès réservé. Saisissez la clé d'accès opérateur.</p>
        <label className="metric-label" htmlFor="access-key" style={{ marginBottom: '-8px' }}>
          <KeyRound size={13} /> Clé d'accès
        </label>
        <input id="access-key" className="field" type="password" autoComplete="current-password" autoFocus
          value={key} onChange={(e) => setKey(e.target.value)} />
        {error && <span className="mono-note" style={{ color: 'var(--danger)' }}>{error}</span>}
        <button type="submit" className="interactive-btn accent" disabled={busy || !key.trim()} style={{ justifyContent: 'center', padding: '11px 16px' }}>
          {busy ? 'Vérification…' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
