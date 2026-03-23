import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import client from '../api/client'

export default function Sidebar() {
  const location = useLocation()
  const [stats, setStats] = useState({ docs: 0, chunks: 0 })

  useEffect(() => {
    client.get('/api/v1/documents/').then(res => {
      const docs = res.data.documents
      const totalChunks = docs.reduce((sum, d) => sum + d.chunk_count, 0)
      setStats({ docs: docs.length, chunks: totalChunks })
    }).catch(() => {})
  }, [location.pathname])

  const navItems = [
    { to: '/', label: 'Upload', icon: '↑' },
    { to: '/ask', label: 'Ask AI', icon: '◈' },
    { to: '/documents', label: 'Documents', icon: '▤' },
  ]

  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logoArea}>
        <div style={s.logoIcon}>
          <span style={s.logoSymbol}>✦</span>
        </div>
        <span style={s.logoText}>Resolven AI</span>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {navItems.map(item => {
          const active = location.pathname === item.to
          return (
            <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
              <div style={{ ...s.navItem, ...(active ? s.navActive : {}) }}>
                <span style={{ ...s.navIcon, ...(active ? s.navIconActive : {}) }}>
                  {item.icon}
                </span>
                <span style={{ ...s.navLabel, ...(active ? s.navLabelActive : {}) }}>
                  {item.label}
                </span>
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

      {/* Footer */}
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
  sidebar: {
    width: '240px',
    minWidth: '240px',
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid #e8e4f0',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 12px',
    gap: '8px'
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px 16px',
    borderBottom: '1px solid #f0eef5',
    marginBottom: '8px'
  },
  logoIcon: {
    width: '32px', height: '32px',
    background: 'linear-gradient(135deg, #6d4aff, #a78bfa)',
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  logoSymbol: { color: '#fff', fontSize: '14px' },
  logoText: { fontSize: '15px', fontWeight: 700, color: '#1a1525' },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '8px',
    transition: 'all 0.15s', cursor: 'pointer'
  },
  navActive: { background: '#ede9ff' },
  navIcon: { fontSize: '14px', color: '#9b94b0', width: '16px', textAlign: 'center' },
  navIconActive: { color: '#6d4aff' },
  navLabel: { fontSize: '14px', fontWeight: 500, color: '#6b6480' },
  navLabelActive: { color: '#6d4aff', fontWeight: 600 },
  statsBox: {
    marginTop: 'auto',
    background: '#f5f4f7',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  statsTitle: { fontSize: '11px', fontWeight: 600, color: '#9b94b0', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' },
  statRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { fontSize: '13px', color: '#6b6480' },
  statVal: { fontSize: '13px', fontWeight: 700, color: '#1a1525', fontFamily: 'DM Mono, monospace' },
  footer: { padding: '8px 10px 0' },
  footerBadge: { display: 'flex', alignItems: 'center', gap: '6px' },
  footerDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', flexShrink: 0 },
  footerText: { fontSize: '12px', color: '#9b94b0' }
}