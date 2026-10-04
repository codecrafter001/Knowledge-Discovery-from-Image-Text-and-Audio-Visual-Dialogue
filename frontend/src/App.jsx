import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Layers, 
  Database, 
  Cpu, 
  Search, 
  Sparkles,
  Server
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchApiStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        headers: { 'Accept': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setApiData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to reach backend API:', err);
      setError(err.message || 'Failed to connect to backend');
      setApiData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiStatus();
  }, []);

  const isOk = apiData && apiData.status === 'ok';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '1.25rem 2rem',
        borderBottom: '1px solid var(--border-subtle)',
        backdropFilter: 'blur(12px)',
        background: 'rgba(11, 15, 25, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '0.5rem',
            borderRadius: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Sparkles size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Multimodal Knowledge Discovery
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Core Infrastructure & Health Console
            </p>
          </div>
        </div>

        <button
          onClick={fetchApiStatus}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>{loading ? 'Pinging API...' : 'Ping API'}</span>
        </button>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1000px', width: '100%', margin: '0 auto', padding: '2.5rem 1.5rem', flex: 1 }}>
        
        {/* Status Card Hero */}
        <div style={{
          background: 'var(--bg-card)',
          border: isOk ? '1px solid rgba(16, 185, 129, 0.3)' : error ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-subtle)',
          borderRadius: '1rem',
          padding: '2rem',
          backdropFilter: 'blur(16px)',
          boxShadow: isOk ? '0 10px 30px rgba(16, 185, 129, 0.1)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isOk ? 'rgba(16, 185, 129, 0.15)' : error ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                  color: isOk ? 'var(--accent-emerald)' : error ? 'var(--accent-rose)' : 'var(--accent-primary)',
                  border: isOk ? '1px solid rgba(16, 185, 129, 0.3)' : error ? '1px solid rgba(244, 63, 94, 0.3)' : '1px solid rgba(99, 102, 241, 0.3)'
                }}>
                  {isOk ? <CheckCircle2 size={13} /> : error ? <XCircle size={13} /> : <Activity size={13} />}
                  {isOk ? 'API CONNECTED' : error ? 'OFFLINE' : 'CHECKING...'}
                </span>
                {lastChecked && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Last pinged: {lastChecked}
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {isOk ? 'Backend API is Healthy' : error ? 'Cannot Reach Backend API' : 'Connecting to API...'}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '540px' }}>
                Target endpoint: <code style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{API_BASE_URL}/</code>
              </p>
            </div>

            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              minWidth: '220px'
            }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                API Response Payload
              </div>
              <pre style={{
                color: isOk ? '#34d399' : '#f87171',
                fontSize: '0.875rem',
                margin: 0
              }}>
                {loading ? 'Fetching...' : JSON.stringify(apiData || { error: error || 'No response' }, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Services & Monorepo Architecture Overview */}
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="var(--accent-primary)" />
          <span>Mono-Repo Infrastructure Components</span>
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem'
        }}>
          {/* API Service */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Server size={18} color="var(--accent-primary)" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>FastAPI Backend</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: isOk ? 'var(--accent-emerald)' : 'var(--text-secondary)' }}>
                {isOk ? '● Port 8000' : '○ Port 8000'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              FastAPI async application hosting ingestion pipelines, hybrid retrieval, and health endpoints.
            </p>
          </div>

          {/* Neo4j */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} color="#38bdf8" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Neo4j Graph DB</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                ● Ports 7474 / 7687
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Knowledge graph database mapping cross-modal entities, provenance, and relationships.
            </p>
          </div>

          {/* MongoDB */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} color="#34d399" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>MongoDB Document Store</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                ● Port 27017
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Document database storing raw ingestion artifacts, OCR payloads, and audio transcriptions.
            </p>
          </div>

          {/* Multimodal Extractors & Fusion */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Cpu size={18} color="#fbbf24" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Extractors & Fusion</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                extractors/ & fusion/
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              OCR, CLIP vision, Whisper ASR, and late-fusion multimodal synthesis engines.
            </p>
          </div>

          {/* Self-Healing Repair Agent */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#c084fc" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Self-Healing Agents</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                agents/
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Autonomous repair loops diagnosing pipeline errors and validating graph invariants.
            </p>
          </div>

          {/* Vector Storage */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            backdropFilter: 'blur(12px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={18} color="#a78bfa" />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>FAISS Index Store</h4>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                storage/
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Dense embedding indices for high-dimensional cosine similarity and semantic search.
            </p>
          </div>
        </div>

      </main>

      <footer style={{
        padding: '1rem 2rem',
        borderTop: '1px solid var(--border-subtle)',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>Multimodal Knowledge Discovery System</span>
        <span>FastAPI • Neo4j • MongoDB • FAISS • React Vite</span>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
