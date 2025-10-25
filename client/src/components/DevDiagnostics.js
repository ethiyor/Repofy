import React, { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://repofy-backend.onrender.com'
  : 'http://localhost:4000';

export default function DevDiagnostics() {
  const [config, setConfig] = useState(null);
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          fetch(`${API_BASE_URL}/health/config`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE_URL}/health/db`).then(r => r.json()).catch(() => null),
        ]);
        if (!cancelled) {
          setConfig(cRes);
          setDb(dRes);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dot = (ok) => (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: ok ? '#28a745' : '#dc3545', marginRight: 8
    }} />
  );

  if (loading) return <div className="muted">Checking environment…</div>;

  return (
    <div style={{ marginTop: 16, padding: 12, border: '1px solid #eee', borderRadius: 6 }}>
      <strong>Dev Diagnostics</strong>
      <div className="muted" style={{ marginTop: 8 }}>API: {API_BASE_URL}</div>
      {config && (
        <div style={{ marginTop: 8 }}>
          <div>{dot(config.supabaseUrlPresent)} Supabase URL</div>
          <div>{dot(config.anonKeyPresent)} Anon key</div>
          <div>{dot(config.serviceRolePresent)} Service role key</div>
        </div>
      )}
      {db && (
        <div style={{ marginTop: 8 }}>
          <div>{dot(db.ok)} Database connectivity</div>
          {!db.ok && db.error && (
            <div className="muted" style={{ marginTop: 4 }}>Error: {db.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
