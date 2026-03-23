import { useState, useRef } from 'react'
import client from '../api/client'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState(null)
  const [polling, setPolling] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  const handleUpload = async () => {
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    try {
      setStatus({ type: 'loading', message: 'Uploading file...' })
      const res = await client.post('/api/v1/ingest/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const id = res.data.job_id
      setStatus({ type: 'progress', message: 'File queued for processing...', step: 'queued' })
      pollStatus(id)
    } catch (err) {
      setStatus({ type: 'error', message: 'Upload failed. Is the backend running?' })
    }
  }

  const pollStatus = (id) => {
    setPolling(true)
    const interval = setInterval(async () => {
      try {
        const res = await client.get(`/api/v1/ingest/status/${id}`)
        const { status: jobStatus, result } = res.data
        if (jobStatus === 'SUCCESS') {
          clearInterval(interval)
          setPolling(false)
          setStatus({
            type: 'success',
            message: `Successfully ingested`,
            detail: `${result.chunks_stored} chunks stored · ${result.department} · ${result.domain}`
          })
          setFile(null)
        } else if (jobStatus === 'FAILURE') {
          clearInterval(interval)
          setPolling(false)
          setStatus({ type: 'error', message: result?.error || 'Processing failed.' })
        } else {
          setStatus({
            type: 'progress',
            message: 'Processing document...',
            step: result?.step || jobStatus
          })
        }
      } catch {
        clearInterval(interval)
        setPolling(false)
        setStatus({ type: 'error', message: 'Lost connection to server.' })
      }
    }, 2000)
  }

  const steps = ['queued', 'extracting chunks', 'classifying', 'embedding', 'saving to database']
  const currentStep = status?.step ? steps.indexOf(status.step) : -1

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Upload Document</h1>
        <p style={s.subtitle}>Upload any file — PDF, DOCX, XLSX, CSV, JSON, images. AI will classify and index it automatically.</p>
      </div>

      <div style={s.card}>
        <div
          style={{ ...s.dropzone, ...(dragOver ? s.dropzoneActive : {}), ...(file ? s.dropzoneHasFile : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => setFile(e.target.files[0])} />
          {file ? (
            <div style={s.fileSelected}>
              <div style={s.fileIcon}>📄</div>
              <div>
                <p style={s.fileName}>{file.name}</p>
                <p style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
          ) : (
            <div style={s.dropContent}>
              <div style={s.uploadIcon}>↑</div>
              <p style={s.dropText}>Drop your file here</p>
              <p style={s.dropSub}>or <span style={s.browse}>browse files</span></p>
              <p style={s.formats}>PDF · DOCX · XLSX · CSV · JSON · PNG · JPG</p>
            </div>
          )}
        </div>

        <button
          style={{ ...s.btn, ...((!file || polling) ? s.btnDisabled : {}) }}
          onClick={handleUpload}
          disabled={!file || polling}
        >
          {polling ? (
            <span style={s.btnInner}><span style={s.spinner}>◌</span> Processing...</span>
          ) : 'Upload & Ingest'}
        </button>

        {status?.type === 'progress' && (
          <div style={s.progressBox}>
            <div style={s.progressSteps}>
              {steps.map((step, i) => (
                <div key={step} style={s.stepRow}>
                  <div style={{
                    ...s.stepDot,
                    ...(i < currentStep ? s.stepDone : {}),
                    ...(i === currentStep ? s.stepActive : {}),
                    ...(i > currentStep ? s.stepPending : {})
                  }}>
                    {i < currentStep ? '✓' : i === currentStep ? '◉' : '○'}
                  </div>
                  <span style={{
                    ...s.stepLabel,
                    ...(i === currentStep ? s.stepLabelActive : {})
                  }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {status?.type === 'success' && (
          <div style={s.successBox}>
            <div style={s.successIcon}>✓</div>
            <div>
              <p style={s.successTitle}>{status.message}</p>
              <p style={s.successDetail}>{status.detail}</p>
            </div>
          </div>
        )}

        {status?.type === 'error' && (
          <div style={s.errorBox}>
            <span style={s.errorIcon}>⚠</span>
            <span>{status.message}</span>
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: '680px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '8px' },
  subtitle: { color: '#666', fontSize: '14px', lineHeight: 1.6 },
  card: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '28px' },
  dropzone: {
    border: '2px dashed #2a2a3e',
    borderRadius: '12px',
    padding: '48px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px',
    background: '#0d0d14'
  },
  dropzoneActive: { border: '2px dashed #7c3aed', background: '#13111e' },
  dropzoneHasFile: { border: '2px dashed #7c3aed', background: '#13111e' },
  dropContent: {},
  uploadIcon: { fontSize: '32px', color: '#7c3aed', marginBottom: '12px', fontWeight: 300 },
  dropText: { color: '#ccc', fontSize: '16px', marginBottom: '6px' },
  dropSub: { color: '#555', fontSize: '14px', marginBottom: '12px' },
  browse: { color: '#7c3aed', cursor: 'pointer' },
  formats: { color: '#444', fontSize: '12px', letterSpacing: '0.5px' },
  fileSelected: { display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' },
  fileIcon: { fontSize: '36px' },
  fileName: { color: '#fff', fontWeight: 600, fontSize: '15px', marginBottom: '4px' },
  fileSize: { color: '#666', fontSize: '13px' },
  btn: {
    width: '100%',
    padding: '14px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  btnDisabled: { background: '#1e1e2e', color: '#444', cursor: 'not-allowed' },
  btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  spinner: { display: 'inline-block', animation: 'spin 1s linear infinite' },
  progressBox: { marginTop: '20px', padding: '16px', background: '#0d0d14', borderRadius: '10px', border: '1px solid #1e1e2e' },
  progressSteps: { display: 'flex', flexDirection: 'column', gap: '10px' },
  stepRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  stepDot: { fontSize: '14px', width: '20px', textAlign: 'center' },
  stepDone: { color: '#22c55e' },
  stepActive: { color: '#7c3aed' },
  stepPending: { color: '#333' },
  stepLabel: { fontSize: '13px', color: '#555', textTransform: 'capitalize' },
  stepLabelActive: { color: '#ccc' },
  successBox: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '16px',
    background: '#0d1f14',
    border: '1px solid #166534',
    borderRadius: '10px'
  },
  successIcon: { fontSize: '20px', color: '#22c55e', fontWeight: 700 },
  successTitle: { color: '#22c55e', fontWeight: 600, fontSize: '14px', marginBottom: '4px' },
  successDetail: { color: '#555', fontSize: '13px' },
  errorBox: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '14px',
    background: '#1a0a0a',
    border: '1px solid #7f1d1d',
    borderRadius: '10px',
    color: '#ef4444',
    fontSize: '14px'
  },
  errorIcon: { fontSize: '16px' }
}