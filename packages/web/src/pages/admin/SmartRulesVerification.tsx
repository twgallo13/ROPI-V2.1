import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/apiFetch';

interface VerificationRun {
  runId: string;
  registryVersion?: string | null;
  evalCount: number;
  applyCount: number;
  errors: string[];
  traces?: Array<{ productId: string; applied: number; suggestions: number }>;
  actor: string;
  startedAt?: string | { _seconds: number } | { toMillis(): number };
}

export default function SmartRulesVerification() {
  const [latest, setLatest] = useState<VerificationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLatest();
  }, []);

  const loadLatest = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ latest: VerificationRun }>('/api/smartrules/verification/latest', { skipAuth: true });
      if (res?.latest) setLatest(res.latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRunVerification = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch<{ ok: boolean; summary: VerificationRun }>('/api/smartrules/verification/run', {
        method: 'POST',
        body: JSON.stringify({ productIds: ['prod_sampling'] }),
      });
      if (res?.summary) setLatest(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: any) => {
    if (!ts) return '';
    if (typeof ts === 'string') return new Date(ts).toLocaleString();
    if (ts._seconds) return new Date(ts._seconds * 1000).toLocaleString();
    if (ts.toMillis) return new Date(ts.toMillis()).toLocaleString();
    return '';
  };

  const passFailStatus = latest && latest.applyCount > 0 && latest.errors.length === 0 ? 'PASS' : 'FAIL';
  const statusColor = passFailStatus === 'PASS' ? '#4caf50' : '#f44336';

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>⚡ Smart Rules Verification</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

      {latest ? (
        <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '4px' }}>
          <div style={{ marginBottom: '10px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: statusColor }}>
              Status: {passFailStatus}
            </span>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Run ID:</strong> {latest.runId}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Started:</strong> {formatTimestamp(latest.startedAt)}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Registry Version:</strong> {latest.registryVersion || 'unknown'}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Evaluations:</strong> {latest.evalCount} | <strong>Applied:</strong> {latest.applyCount}
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Actor:</strong> {latest.actor}
          </div>
          {latest.errors && latest.errors.length > 0 && (
            <div style={{ marginBottom: '10px', backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px' }}>
              <strong>Errors ({latest.errors.length}):</strong>
              <ul>{latest.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
          {latest.traces && latest.traces.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <strong>Sample Traces:</strong>
              <ul>
                {latest.traces.map((t, i) => (
                  <li key={i}>
                    {t.productId}: {t.applied} applied, {t.suggestions} suggestions
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : loading ? (
        <p>Loading...</p>
      ) : (
        <p>No verification runs yet.</p>
      )}

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={handleRunVerification}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Running...' : 'Run Verification'}
        </button>
        <button
          onClick={loadLatest}
          disabled={loading}
          style={{
            marginLeft: '10px',
            padding: '10px 20px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
