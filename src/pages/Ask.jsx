import { useState } from 'react'
import client from '../api/client'

export default function Ask() {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await client.get('/api/v1/search/ask', { params: { q: question, top_k: 5 } })
      setResult(res.data)
    } catch {
      setError('Failed to get answer. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Ask AI</h1>
        <p style={s.subtitle}>Ask questions about your uploaded documents. Answers are grounded in your data.</p>
      </div>

      <div style={s.inputCard}>
        <input
          style={s.input}
          placeholder="e.g. What is the leave policy? What is Neha's salary?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleAsk()}
        />
        <button
          style={{ ...s.btn, ...(loading ? s.btnDisabled : {}) }}
          onClick={handleAsk}
          disabled={loading}
        >
          {loading ? '...' : 'Ask'}
        </button>
      </div>

      {error && (
        <div style={s.errorBox}>
          <span>⚠</span> {error}
        </div>
      )}

      {loading && (
        <div style={s.loadingBox}>
          <div style={s.loadingDots}>
            <span style={s.dot} />
            <span style={s.dot} />
            <span style={s.dot} />
          </div>
          <p style={s.loadingText}>Searching documents and generating answer...</p>
        </div>
      )}

      {result && (
        <div>
          <div style={s.answerCard}>
            <div style={s.answerHeader}>
              <span style={s.aiLabel}>◈ AI Answer</span>
            </div>
            <p style={s.answer}>{result.answer}</p>
          </div>

          <div style={s.sourcesSection}>
            <p style={s.sourcesTitle}>Sources used ({result.sources.length})</p>
            {result.sources.map((src, i) => (
              <div key={i} style={s.sourceCard}>
                <div style={s.sourceMeta}>
                  <div style={s.sourceLeft}>
                    <span style={s.sourceFile}>📄 {src.filename}</span>
                    {src.custom_fields?.sheet && (
                      <span style={s.sourceSheet}>Sheet: {src.custom_fields.sheet}</span>
                    )}
                    {src.department && src.department !== 'general' && (
                      <span style={s.sourceDept}>{src.department}</span>
                    )}
                  </div>
                  <div style={s.sourceRight}>
                    <span style={s.scoreLabel}>Relevance</span>
                    <span style={{
                      ...s.score,
                      color: src.rerank_score > 0 ? '#22c55e' : '#888'
                    }}>
                      {src.rerank_score?.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p style={s.chunkText}>{src.chunk_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  page: { maxWidth: '820px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '28px' },
  title: { fontSize: '26px', fontWeight: 700, marginBottom: '8px' },
  subtitle: { color: '#666', fontSize: '14px', lineHeight: 1.6 },
  inputCard: {
    display: 'flex',
    gap: '10px',
    background: '#111118',
    border: '1px solid #1e1e2e',
    borderRadius: '14px',
    padding: '8px',
    marginBottom: '20px'
  },
  input: {
    flex: 1,
    padding: '12px 14px',
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    outline: 'none'
  },
  btn: {
    padding: '12px 24px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  btnDisabled: { background: '#1e1e2e', color: '#444', cursor: 'not-allowed' },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '14px',
    background: '#1a0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '14px',
    marginBottom: '20px'
  },
  loadingBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '20px',
    background: '#111118',
    borderRadius: '12px',
    border: '1px solid #1e1e2e',
    marginBottom: '20px'
  },
  loadingDots: { display: 'flex', gap: '4px' },
  dot: {
    width: '6px', height: '6px',
    background: '#7c3aed',
    borderRadius: '50%',
    display: 'inline-block'
  },
  loadingText: { color: '#666', fontSize: '14px' },
  answerCard: {
    background: '#111118',
    border: '1px solid #2a1f4e',
    borderRadius: '14px',
    padding: '24px',
    marginBottom: '20px'
  },
  answerHeader: { marginBottom: '14px' },
  aiLabel: { color: '#7c3aed', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' },
  answer: { color: '#e0e0e0', fontSize: '15px', lineHeight: 1.75 },
  sourcesSection: {},
  sourcesTitle: { color: '#555', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' },
  sourceCard: {
    background: '#0d0d14',
    border: '1px solid #1a1a2e',
    borderRadius: '10px',
    padding: '14px 16px',
    marginBottom: '10px'
  },
  sourceMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  sourceLeft: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' },
  sourceFile: { color: '#ccc', fontSize: '13px', fontWeight: 500 },
  sourceSheet: { background: '#1e1e2e', color: '#888', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' },
  sourceDept: { background: '#13111e', color: '#7c3aed', fontSize: '11px', padding: '2px 8px', borderRadius: '4px' },
  sourceRight: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  scoreLabel: { color: '#444', fontSize: '11px' },
  score: { fontSize: '13px', fontWeight: 600 },
  chunkText: { color: '#666', fontSize: '13px', lineHeight: 1.6, margin: 0 }
}