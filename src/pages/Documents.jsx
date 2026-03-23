import { useState, useEffect } from 'react'
import client from '../api/client'

const DEPT_COLORS = {
  hr: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  legal: { bg: '#f5f3ff', text: '#6d28d9', dot: '#7c3aed' },
  finance: { bg: '#f0fdf4', text: '#166534', dot: '#16a34a' },
  engineering: { bg: '#fffbeb', text: '#92400e', dot: '#d97706' },
  operations: { bg: '#fef2f2', text: '#991b1b', dot: '#dc2626' },
  general: { bg: '#f9fafb', text: '#374151', dot: '#9ca3af' }
}

function getDeptStyle(dept) {
  return DEPT_COLORS[dept?.toLowerCase()] || DEPT_COLORS.general
}

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  const icons = { pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗', csv: '📊', json: '📋', png: '🖼', jpg: '🖼', jpeg: '🖼', odt: '📄' }
  return icons[ext] || '📄'
}

export default function Documents() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    try {
      const res = await client.get('/api/v1/documents/')
      setDocs(res.data.documents)
    } catch {
      setError('Failed to load documents.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (documentId, filename) => {
    if (!window.confirm(`Delete "${filename}" and all its chunks?`)) return
    setDeleting(documentId)
    try {
      await client.delete(`/api/v1/documents/${documentId}?hard=true`)
      setDocs(prev => prev.filter(d => d.document_id !== documentId))
    } catch {
      alert('Failed to delete document.')
    } finally {
      setDeleting(null)
    }
  }

  const filtered = docs.filter(d =>
    d.filename.toLowerCase().includes(search.toLowerCase()) ||
    d.department?.toLowerCase().includes(search.toLowerCase())
  )

  const totalChunks = docs.reduce((sum, d) => sum + d.chunk_count, 0)

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topBar}>
        <span style={s.topBarTitle}>Documents</span>
        <div style={s.topBarRight}>
          <div style={s.statPill}>
            <span style={s.statPillNum}>{docs.length}</span>
            <span style={s.statPillLabel}>docs</span>
          </div>
          <div style={s.statPill}>
            <span style={s.statPillNum}>{totalChunks}</span>
            <span style={s.statPillLabel}>chunks</span>
          </div>
        </div>
      </div>

      <div style={s.content}>
        {/* Search bar */}
        {docs.length > 0 && (
          <div style={s.searchBar}>
            <span style={s.searchIcon}>⌕</span>
            <input
              style={s.searchInput}
              placeholder="Search by filename or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading && (
          <div style={s.centerMsg}>
            <p style={s.loadingText}>Loading documents...</p>
          </div>
        )}

        {error && (
          <div style={s.errorBox}><span>⚠</span> {error}</div>
        )}

        {!loading && !error && docs.length === 0 && (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📭</div>
            <p style={s.emptyTitle}>No documents yet</p>
            <p style={s.emptySub}>Upload files to build your knowledge base</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div style={s.table}>
            <div style={s.tableHeader}>
              <span style={{ ...s.th, flex: 3 }}>File</span>
              <span style={{ ...s.th, flex: 1.5 }}>Department</span>
              <span style={{ ...s.th, flex: 1 }}>Domain</span>
              <span style={{ ...s.th, flex: 1 }}>Chunks</span>
              <span style={{ ...s.th, flex: 1.2 }}>Ingested</span>
              <span style={{ ...s.th, width: '48px' }}></span>
            </div>
            {filtered.map((doc, i) => {
              const dept = getDeptStyle(doc.department)
              return (
                <div key={i} style={{ ...s.tableRow, ...(i % 2 === 0 ? s.tableRowAlt : {}) }}>
                  <div style={{ ...s.td, flex: 3, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={s.fileIcon}>{getFileIcon(doc.filename)}</span>
                    <span style={s.filename}>{doc.filename}</span>
                  </div>
                  <div style={{ ...s.td, flex: 1.5 }}>
                    <span style={{ ...s.deptBadge, background: dept.bg, color: dept.text }}>
                      <span style={{ ...s.deptDot, background: dept.dot }} />
                      {doc.department}
                    </span>
                  </div>
                  <div style={{ ...s.td, flex: 1 }}>
                    <span style={s.domainText}>{doc.domain}</span>
                  </div>
                  <div style={{ ...s.td, flex: 1 }}>
                    <span style={s.chunkNum}>{doc.chunk_count}</span>
                  </div>
                  <div style={{ ...s.td, flex: 1.2 }}>
                    <span style={s.dateText}>
                      {new Date(doc.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  <div style={{ ...s.td, width: '48px', justifyContent: 'center' }}>
                    <button
                      style={{ ...s.deleteBtn, ...(deleting === doc.document_id ? s.deletingBtn : {}) }}
                      onClick={() => handleDelete(doc.document_id, doc.filename)}
                      disabled={deleting === doc.document_id}
                      title="Delete"
                    >
                      {deleting === doc.document_id ? '…' : '🗑'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && docs.length > 0 && (
          <div style={s.centerMsg}>
            <p style={s.loadingText}>No results for "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f4f7', overflow: 'hidden' },
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 28px', background: '#fff', borderBottom: '1px solid #e8e4f0', flexShrink: 0
  },
  topBarTitle: { fontSize: '14px', fontWeight: 600, color: '#1a1525' },
  topBarRight: { display: 'flex', gap: '8px' },
  statPill: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: '#f5f4f7', border: '1px solid #e8e4f0',
    borderRadius: '20px', padding: '4px 12px'
  },
  statPillNum: { fontSize: '13px', fontWeight: 700, color: '#1a1525', fontFamily: 'DM Mono, monospace' },
  statPillLabel: { fontSize: '12px', color: '#9b94b0' },
  content: { flex: 1, overflow: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '16px' },
  searchBar: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#fff', border: '1px solid #e8e4f0',
    borderRadius: '10px', padding: '10px 14px'
  },
  searchIcon: { color: '#9b94b0', fontSize: '16px' },
  searchInput: {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    fontSize: '13px', color: '#1a1525', fontFamily: 'DM Sans, sans-serif'
  },
  table: {
    background: '#fff', borderRadius: '12px',
    border: '1px solid #e8e4f0', overflow: 'hidden'
  },
  tableHeader: {
    display: 'flex', alignItems: 'center',
    padding: '10px 16px', borderBottom: '1px solid #f0eef5',
    background: '#faf9ff'
  },
  th: { fontSize: '11px', fontWeight: 600, color: '#9b94b0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f9f8fc' },
  tableRowAlt: { background: '#fdfcff' },
  td: { display: 'flex', alignItems: 'center' },
  fileIcon: { fontSize: '18px', flexShrink: 0 },
  filename: { fontSize: '13px', fontWeight: 500, color: '#1a1525', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  deptBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 600
  },
  deptDot: { width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0 },
  domainText: { fontSize: '12px', color: '#6b6480' },
  chunkNum: { fontSize: '13px', fontWeight: 600, color: '#1a1525', fontFamily: 'DM Mono, monospace' },
  dateText: { fontSize: '12px', color: '#9b94b0' },
  deleteBtn: {
    background: 'none', border: '1px solid #f0eef5',
    borderRadius: '6px', padding: '5px 8px',
    cursor: 'pointer', fontSize: '13px',
    transition: 'all 0.15s', color: '#9b94b0'
  },
  deletingBtn: { opacity: 0.4, cursor: 'not-allowed' },
  centerMsg: { display: 'flex', justifyContent: 'center', padding: '40px' },
  loadingText: { color: '#9b94b0', fontSize: '14px' },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '14px', background: '#fef2f2',
    border: '1px solid #fecaca', borderRadius: '10px',
    color: '#dc2626', fontSize: '14px'
  },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 24px', gap: '12px' },
  emptyIcon: { fontSize: '48px' },
  emptyTitle: { fontSize: '16px', fontWeight: 600, color: '#6b6480' },
  emptySub: { fontSize: '13px', color: '#9b94b0' }
}