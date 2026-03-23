import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import client from '../api/client'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const [stats, setStats] = useState({ docs: 0, chunks: 0 })
  const [sessions, setSessions] = useState([])

  useEffect(() => {
    fetchStats()
    fetchSessions()
  
    const handler = () => fetchSessions()
    window.addEventListener('chat-updated', handler)
    return () => window.removeEventListener('chat-updated', handler)
  }, [location.pathname])

  const fetchStats = async () => {
    try {
      const res = await client.get('/api/v1/documents/')
      const docs = res.data.documents
      setSessions(prev => prev)
      setStats({
        docs: docs.length,
        chunks: docs.reduce((sum, d) => sum + d.chunk_count, 0)
      })
    } catch {}
  }

  const fetchSessions = async () => {
    try {
      const res = await client.get('/api/v1/chats/')
      setSessions(res.data.sessions)
    } catch {}
  }

  const handleNewChat = async () => {
    navigate('/ask')
  }

  const handleDeleteSession = async (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await client.delete(`/api/v1/chats/${id}`)
      setSessions(prev => prev.filter(s => s.id !== id))
      if (sessionId === id) navigate('/ask')
    } catch {}
  }

  const navItems = [
    { to: '/', label: 'Upload', icon: '↑' },
    { to: '/documents', label: 'Documents', icon: '▤' },
  ]

  const isAskPage = location.pathname.startsWith('/ask')

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logoArea}>
        <div style={s.logoIcon}><span style={s.logoSymbol}>✦</span></div>
        <span style={s.logoText}>Resolven AI</span>
      </div>

      {/* New Chat button */}
      <button style={s.newChatBtn} onClick={handleNewChat}>
        <span>+</span> New Chat
      </button>

      {/* Chat history */}
      {sessions.length > 0 && (
        <div style={s.historySection}>
          <p style={s.historyLabel}>Past Chats</p>
          <div style={s.historyList}>
            {sessions.map(session => (
              <Link
                key={session.id}
                to={`/ask/${session.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  ...s.historyItem,
                  ...(sessionId === session.id ? s.historyItemActive : {})
                }}>
                  <div style={s.historyAvatar}>
                    {session.title[0]?.toUpperCase() || 'C'}
                  </div>
                  <div style={s.historyInfo}>
                    <p style={s.historyTitle}>{session.title}</p>
                    <p style={s.historyDate}>
                      {new Date(session.updated_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short'
                      })}
                    </p>
                  </div>
                  <button
                    style={s.deleteBtn}
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    title="Delete chat"
                  >✕</button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={s.nav}>
        {navItems.map(item => {
          const active = location.pathname === item.to
          return (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>{item.icon}</span>
                <span style={{ ...s.navLabel, ...(active ? s.navLabelActive : {}) }}>{item.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Stats */}
      <div style={s.statsBox}>
        <p style={s.statsTitle}>Knowledge Base</p>
        <div style={s.statRow}>
          <span style={s.statLabel}>Documents</span>
          <span style={s.statVal}>{stats.docs}</span>
        </div>
        <div style={s.statRow}>
          <span style={s.statLabel}>Chunks</span>
          <span style={s.statVal}>{stats.chunks}</span>
        </div>
      </div>

      <div style={s.footer}>
        <div style={s.footerBadge}>
          <span style={s.footerDot} />
          <span style={s.footerText}>RAG System v1.0</span>
        </div>
      </div>
    </aside>
  )
}

const s = {
  sidebar: { width: '240px', minWidth: '240px', height: '100vh', background: '#fff', borderRight: '1px solid #e8e4f0', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: '8px', overflow: 'hidden' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px 16px', borderBottom: '1px solid #f0eef5', marginBottom: '4px' },
  logoIcon: { width: '32px', height: '32px', background: 'linear-gradient(135deg, #6d4aff, #a78bfa)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoSymbol: { color: '#fff', fontSize: '14px' },
  logoText: { fontSize: '15px', fontWeight: 700, color: '#1a1525' },
  newChatBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 14px', background: '#ede9ff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#6d4aff', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  historySection: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 },
  historyLabel: { fontSize: '11px', fontWeight: 600, color: '#9b94b0', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '4px 10px 8px' },
  historyList: { overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  historyItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' },
  historyItemActive: { background: '#ede9ff' },
  historyAvatar: { width: '26px', height: '26px', background: '#f0eef5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#6d4aff', flexShrink: 0 },
  historyInfo: { flex: 1, minWidth: 0 },
  historyTitle: { fontSize: '12px', fontWeight: 500, color: '#1a1525', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  historyDate: { fontSize: '11px', color: '#9b94b0', marginTop: '1px' },
  deleteBtn: {background: 'none', border: 'none', color: '#d8d2eb', cursor: 'pointer', fontSize: '11px', padding: '2px 4px', flexShrink: 0  },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', transition: 'all 0.15s', cursor: 'pointer' },
  navActive: { background: '#ede9ff' },
  navIcon: { fontSize: '14px', color: '#9b94b0', width: '16px', textAlign: 'center' },
  navIconActive: { color: '#6d4aff' },
  navLabel: { fontSize: '14px', fontWeight: 500, color: '#6b6480' },
  navLabelActive: { color: '#6d4aff', fontWeight: 600 },
  statsBox: { background: '#f5f4f7', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  statsTitle: { fontSize: '11px', fontWeight: 600, color: '#9b94b0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: '13px', color: '#6b6480' },
  statVal: { fontSize: '13px', fontWeight: 700, color: '#1a1525', fontFamily: 'DM Mono, monospace' },
  footer: { padding: '8px 10px 0' },
  footerBadge: { display: 'flex', alignItems: 'center', gap: '6px' },
  footerDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 },
  footerText: { fontSize: '12px', color: '#9b94b0' }
}