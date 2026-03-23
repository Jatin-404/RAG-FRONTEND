import { useState, useEffect } from 'react'
import client from '../api/client'

const DEPT_COLORS = {
  hr: '#0ea5e9',
  legal: '#8b5cf6',
  finance: '#10b981',
  engineering: '#f59e0b',
  operations: '#ef4444',
  general: '#6b7280'
}

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      const res = await client.get('/api/v1/search/documents')
      setDocs(res.data.documents)
    } catch {
      setError('Failed to load documents. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase()
    const icons = { pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗', csv: '📊', json: '📋', png: '🖼', jpg: '🖼', odt: '📄' }
    return icons[ext] || '📄'
  }

  const getDeptColor = (dept) => DEPT_COLORS[dept?.toLowerCase()] || DEPT_COLORS.general

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Documents</h1>
          <p style={s.subtitle}>All files ingested into the RAG system</p>
        </div>
        <div style={s.badge}>{docs.length} files</div>
      </div>

      {loading && (
        <div style={s.loadingBox}>
          <p style={s.loadingText}>Loading documents...</p>
        </div>
      )}

      {error && (
        <div style={s.errorBox}><span>⚠</span> {error}</div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div style={s.emptyBox}>
          <p style={s.emptyIcon}>📭</p>
          <p style={s.emptyText}>No documents ingested yet</p>
          <p style={s.emptySubtext}>Upload a file to get started</p>
        </div>
      )}

      {docs.length > 0 && (
        <div style={s.grid}>
          {docs.map((doc, i) => (
            <div key={i} style={s.card}>
              <div style={s.cardTop}>
                <span style={s.fileIcon}>{getFileIcon(doc.filename)}</span>
                <div style={s.cardInfo}>
                  <p style={s.filename}>{doc.filename}</p>
                  <p style={s.date}>{new Date(doc.ingestion_timestamp).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}</p>
                </div>
              </div>
              <div style={s.cardBottom}>
                <span style={{ ...s.deptTag, background: getDeptColor(doc.department) + '22', color: getDeptColor(doc.department) }}>
                  {doc.department}
                </span>
                <span style={s.domainTag}>{doc.domain}</span>
                <span style={s.chunkCount}>{doc.chunk_count} chunks</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: '960px', margin: '0 auto', padding: '48px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' },
  title: { fontSize: '26px', fontWeight: 700, marginBottom: '8px' },
  subtitle: { color: '#666', fontSize: '14px' },
  badge: { background: '#111118', border: '1px solid #1e1e2e', color: '#888', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' },
  loadingBox: { padding: '40px', textAlign: 'center' },
  loadingText: { color: '#555' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px', background: '#1a0a0a', border: '1px solid #7f1d1d',
    borderRadius: '10px', color: '#ef4444', fontSize: '14px'
  },
  emptyBox: { textAlign: 'center', padding: '80px 24px' },
  emptyIcon: { fontSize: '48px', marginBottom: '16px' },
  emptyText: { color: '#ccc', fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  emptySubtext: { color: '#555', fontSize: '14px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  card: {
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: '14px',
    padding: '20px',
    transition: 'border-color 0.15s',
    cursor: 'default'
  },
  cardTop: { display: 'flex', gap: '14px', marginBottom: '16px' },
  fileIcon: { fontSize: '32px', flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0 },
  filename: { color: '#fff', fontWeight: 600, fontSize: '14px', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  date: { color: '#555', fontSize: '12px' },
  cardBottom: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  deptTag: { fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  domainTag: { background: '#1a1a2e', color: '#666', fontSize: '11px', padding: '3px 10px', borderRadius: '20px' },
  chunkCount: { color: '#444', fontSize: '11px', marginLeft: 'auto' }
}