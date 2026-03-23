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

    // Create new session if none
    if (!currentSessionId) {
      try {
        const res = await client.post('/api/v1/chats/')
        currentSessionId = res.data.id
        justCreated.current = true  // prevent useEffect from wiping messages
        navigate(`/ask/${currentSessionId}`, { replace: true })
      } catch {
        return
      }
    }

    // Add user message immediately so user sees it right away
    setMessages(prev => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await client.post(`/api/v1/chats/${currentSessionId}/ask`, {
        question, top_k: 5
      })
      setMessages(prev => [...prev, {
        role: 'ai', content: res.data.answer, sources: res.data.sources
      }])
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
                <button key={i} style={s.suggChip} onClick={() => handleSend(text)}>
                  › {text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={s.messagesList}>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
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
            style={s.input}
            placeholder="Ask Resolven AI about your documents..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={loading}
          />
          <button
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
  page: { display: 'flex', flexDirection: 'column', height: '100vh', background: '#f5f4f7', overflow: 'hidden' },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', background: '#fff', borderBottom: '1px solid #e8e4f0', flexShrink: 0 },
  topBarTitle: { fontSize: '14px', fontWeight: 600, color: '#1a1525' },
  modelBadge: { display: 'flex', alignItems: 'center', gap: '6px', background: '#f5f4f7', border: '1px solid #e8e4f0', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', color: '#6b6480', fontWeight: 500 },
  modelDot: { width: '6px', height: '6px', borderRadius: '50%', background: '#6d4aff' },
  messagesArea: { flex: 1, overflow: 'auto', padding: '0 28px' },
  welcome: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: '16px' },
  welcomeIcon: { width: '64px', height: '64px', background: 'linear-gradient(135deg, #6d4aff, #a78bfa)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' },
  welcomeSymbol: { color: '#fff', fontSize: '28px' },
  welcomeTitle: { fontSize: '22px', fontWeight: 700, color: '#1a1525' },
  welcomeSub: { fontSize: '14px', color: '#6b6480', lineHeight: 1.7 },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '8px', maxWidth: '560px' },
  suggChip: { background: '#fff', border: '1px solid #e8e4f0', borderRadius: '20px', padding: '8px 16px', fontSize: '13px', color: '#6b6480', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  messagesList: { padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '20px' },
  userMsgRow: { display: 'flex', justifyContent: 'flex-end' },
  userMsg: { background: '#6d4aff', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', fontSize: '14px', lineHeight: 1.6, maxWidth: '70%' },
  aiMsgRow: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  aiAvatar: { width: '32px', height: '32px', flexShrink: 0, background: 'linear-gradient(135deg, #6d4aff, #a78bfa)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px' },
  aiMsgContent: { flex: 1, maxWidth: '75%' },
  aiAnswer: { background: '#fff', border: '1px solid #e8e4f0', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', fontSize: '14px', lineHeight: 1.7, color: '#1a1525' },
  sourcesWrap: { marginTop: '8px' },
  sourcesLabel: { fontSize: '11px', color: '#9b94b0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' },
  sourcesList: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  sourceChip: { display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', border: '1px solid #e8e4f0', borderRadius: '20px', padding: '4px 10px', fontSize: '12px', color: '#6b6480' },
  sourceScore: { color: '#6d4aff', fontWeight: 600, fontFamily: 'DM Mono, monospace', fontSize: '11px' },
  thinkingDots: { display: 'flex', gap: '4px', alignItems: 'center', padding: '16px' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', background: '#6d4aff', display: 'inline-block', animation: 'bounce 1.2s ease-in-out infinite' },
  inputArea: { padding: '16px 28px 20px', background: '#fff', borderTop: '1px solid #e8e4f0', flexShrink: 0 },
  inputBox: { display: 'flex', gap: '8px', background: '#f5f4f7', border: '1.5px solid #e8e4f0', borderRadius: '14px', padding: '8px 8px 8px 16px', alignItems: 'center' },
  input: { flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '14px', color: '#1a1525', fontFamily: 'DM Sans, sans-serif' },
  sendBtn: { width: '36px', height: '36px', background: '#6d4aff', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { background: '#e8e4f0', color: '#9b94b0', cursor: 'not-allowed' },
  inputHint: { fontSize: '11px', color: '#9b94b0', marginTop: '8px', textAlign: 'center' },
  centerMsg: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' },
  loadingText: { color: '#9b94b0', fontSize: '14px' }
}