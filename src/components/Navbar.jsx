import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const links = [
    { to: '/', label: 'Upload' },
    { to: '/ask', label: 'Ask AI' },
    { to: '/documents', label: 'Documents' }
  ]

  return (
    <nav style={s.nav}>
      <div style={s.left}>
        <div style={s.logo}>
          <span style={s.logoIcon}>◈</span>
          <span style={s.logoText}>Resolven<span style={s.logoAccent}> RAG</span></span>
        </div>
      </div>
      <div style={s.links}>
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            style={{
              ...s.link,
              ...(location.pathname === link.to ? s.active : {})
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

const s = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 40px',
    height: '64px',
    background: 'rgba(10,10,15,0.95)',
    borderBottom: '1px solid #1a1a2e',
    backdropFilter: 'blur(10px)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  },
  left: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { color: '#7c3aed', fontSize: '22px' },
  logoText: { fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' },
  logoAccent: { color: '#7c3aed' },
  links: { display: 'flex', gap: '4px' },
  link: {
    color: '#888',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 16px',
    borderRadius: '8px',
    transition: 'all 0.15s'
  },
  active: { color: '#fff', background: '#7c3aed' }
}