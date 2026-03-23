import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../api/client'

const SUGGESTIONS = [
  'What is the leave policy?',
  'What is the salary of Amit Sharma?',
  'What documents are available?',
  'Who works in the Engineering department?'
]

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div style={s.userMsgRow}>
        <div style={s.userMsg}>{msg.content}</div>
      </div>
    )
  }
  return (
    <div style={s.aiMsgRow}>
      <div style={s.aiAvatar}>✦</div>
      <div style={s.aiMsgContent}>
        <p style={s.aiAnswer}>{msg.content}</p>
        {msg.sources?.length > 0 && (
          <div style={s.sourcesWrap}>
            <p style={s.sourcesLabel}>Sources</p>
            <div style={s.sourcesList}>
              {msg.sources.map((src, i) => (
                <div key={i} style={s.sourceChip}>
                  <span>📄 {src.filename}</span>
                  {src.rerank_score > 0 && (
                    <span style={s.sourceScore}>{src.rerank_score?.toFixed(1)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Ask() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const bottomRef = useRef()
  const justCreated = useRef(false)

  useEffect(() => {
    if (sessionId) {
      if (justCreated.current) {
        // We just created this session — messages already in state, don't reload
        justCreated.current = false
        return
      }
      loadMessages(sessionId)
    } else {
      setMessages([])
    }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const loadMessages = async (id) => {
    setLoadingHistory(true)
    try {
      const res = await client.get(`/api/v1/chats/${id}/messages`)
      setMessages(res.data.messages.map(m => ({
        role: m.role, content: m.content, sources: m.sources
      })))
    } catch {
      setMessages([])
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleSend = async (q) => {
    const question = q || input.trim()
    if (!question || loading) return
    setInput('')
  
    let currentSessionId = sessionId
  
    if (!currentSessionId) {
      try {
        const res = await client.post('/api/v1/chats/')
        currentSessionId = res.data.id
        justCreated.current = true
        navigate(`/ask/${currentSessionId}`, { replace: true })
      } catch {
        return
      }
    }
  
    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)
  
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/chats/${currentSessionId}/ask/stream`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, top_k: 5 })
        }
      )
  
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let sources = []
      let streamingMsgAdded = false
  
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
  
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
  
        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''))
  
            // First event — sources
            if (data.type === 'sources') {
              sources = data.sources
              continue
            }
  
            // Token event
            if (!streamingMsgAdded) {
              // Add empty AI message to start streaming into
              setMessages(prev => [...prev, { role: 'ai', content: '', sources }])
              streamingMsgAdded = true
            }
  
            if (data.token) {
              // Append token to last message
              setMessages(prev => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.token
                }
                return updated
              })
            }
          } catch {
            // skip malformed lines
          }
        }
      }
  
      window.dispatchEvent(new Event('chat-updated'))
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai', content: 'Failed to get a response.', sources: []
      }])
    } finally {
      setLoading(false)
    }
  }
  const isEmpty = messages.length === 0

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <span style={s.topBarTitle}>Ask AI</span>
        <div style={s.modelBadge}>
          <span style={s.modelDot} />
          llama3.1:8b
        </div>
      </div>

      <div style={s.messagesArea}>
        {loadingHistory ? (
          <div style={s.centerMsg}><p style={s.loadingText}>Loading conversation...</p></div>
        ) : isEmpty ? (
          <div style={s.welcome}>
            <div style={s.welcomeIcon}><span style={s.welcomeSymbol}>✦</span></div>
            <h2 style={s.welcomeTitle}>Welcome to Resolven AI</h2>
            <p style={s.welcomeSub}>Ask questions about your uploaded documents.<br />Answers are grounded in your knowledge base.</p>
            <div style={s.suggestions}>
              {SUGGESTIONS.map((text, i) => (
                <button className="chip focus-ring" key={i} style={s.suggChip} onClick={() => handleSend(text)}>
                  › {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={s.messagesList}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && messages[messages.length - 1]?.role !== 'ai' && (
              <div style={s.aiMsgRow}>
                <div style={s.aiAvatar}>✦</div>
                <div style={s.thinkingDots}>
                  <span style={{ ...s.dot, animationDelay: '0ms' }} />
                  <span style={{ ...s.dot, animationDelay: '150ms' }} />
                  <span style={{ ...s.dot, animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div style={s.inputArea}>
        <div style={s.inputBox}>
          <input
            className="focus-ring"
            style={s.input}
            placeholder="Ask Resolven AI about your documents..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <button
            className="btn-primary focus-ring"
            style={{ ...s.sendBtn, ...((!input.trim() || loading) ? s.sendBtnDisabled : {}) }}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >↑</button>
        </div>
        <p style={s.inputHint}>Press Enter to send · Answers grounded in uploaded documents</p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

const s = {
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--app-bg)', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', background: 'rgba(255, 255, 255, 0.85)', borderBottom: '1px solid var(--border)', flexShrink: 0, backdropFilter: 'blur(6px)' },
  topBarTitle: { fontSize: '14px', fontWeight: 600, color: 'var(--text)' },
  modelBadge: { display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: 'var(--text-2)', fontWeight: 500 },
  modelDot: { width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' },
  messagesArea: { flex: 1, overflow: 'auto', padding: '0 28px' },
  welcome: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: '16px' },
  welcomeIcon: { width: '64px', height: '64px', background: 'var(--accent-grad)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', boxShadow: 'var(--shadow)' },
  welcomeSymbol: { color: '#fff', fontSize: '28px' },
  welcomeTitle: { fontSize: '22px', fontWeight: 700, color: 'var(--text)' },
  welcomeSub: { fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.7 },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px', maxWidth: '560px' },
  suggChip: { background: 'rgba(255, 255, 255, 0.9)', border: '1px solid var(--border)', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', boxShadow: 'var(--shadow-sm)' },
  messagesList: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px' },
  userMsgRow: { display: 'flex', justifyContent: 'flex-end' },
  userMsg: { background: 'var(--accent)', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', fontSize: '14px', lineHeight: 1.6, maxWidth: '70%', boxShadow: 'var(--shadow-sm)' },
  aiMsgRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  aiAvatar: { width: '32px', height: '32px', flexShrink: 0, background: 'var(--accent-grad)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', boxShadow: 'var(--shadow-sm)' },
  aiMsgContent: { flex: 1, maxWidth: '75%' },
  aiAnswer: { background: 'rgba(255, 255, 255, 0.92)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', fontSize: '14px', lineHeight: 1.7, color: 'var(--text)', boxShadow: 'var(--shadow-sm)' },
  sourcesWrap: { marginTop: '8px' },
  sourcesLabel: { fontSize: '11px', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  sourcesList: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  sourceChip: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: 'var(--text-2)' },
  sourceScore: { color: 'var(--accent)', fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: '11px' },
  thinkingDots: { display: 'flex', gap: '4px', alignItems: 'center', padding: '16px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'bounce 1.2s ease-in-out infinite' },
  inputArea: { padding: '16px 28px 20px', background: 'rgba(255, 255, 255, 0.9)', borderTop: '1px solid var(--border)', flexShrink: 0, backdropFilter: 'blur(6px)' },
  inputBox: { display: 'flex', gap: '8px', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '8px 8px 8px 16px', alignItems: 'center', boxShadow: 'var(--shadow-sm)' },
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: 'var(--text)', fontFamily: 'DM Sans, sans-serif' },
  sendBtn: { width: '36px', height: '36px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)' },
  sendBtnDisabled: { background: 'var(--border)', color: 'var(--text-3)', cursor: 'not-allowed' },
  inputHint: { fontSize: '11px', color: 'var(--text-3)', marginTop: '8px', textAlign: 'center' },
  centerMsg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' },
  loadingText: { color: 'var(--text-3)', fontSize: '14px' }
}

