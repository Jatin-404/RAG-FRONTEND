import { useState, useRef } from 'react'
import client from '../api/client'

const STATUS_STEPS = ['queued', 'extracting chunks', 'classifying', 'embedding', 'saving to database']

function FileRow({ fileJob, onPoll }) {
  const { file, status } = fileJob
  const stepIndex = STATUS_STEPS.indexOf(status?.step)

  const getStatusColor = () => {
    if (status?.type === 'success') return '#22c55e'
    if (status?.type === 'error') return '#ef4444'
    if (status?.type === 'progress') return '#7c3aed'
    return '#555'
  }

  const getStatusIcon = () => {
    if (status?.type === 'success') return '✓'
    if (status?.type === 'error') return '✗'
    if (status?.type === 'progress') return '◉'
    return '○'
  }

  return (
    <div style={s.fileRow}>
      <div style={s.fileRowTop}>
        <span style={s.fileRowIcon}>📄</span>
        <div style={s.fileRowInfo}>
          <p style={s.fileRowName}>{file.name}</p>
          <p style={s.fileRowSize}>{(file.size / 1024).toFixed(1)} KB</p>
        </div>
        <div style={{ ...s.fileRowStatus, color: getStatusColor() }}>
          <span style={s.statusIcon}>{getStatusIcon()}</span>
          <span style={s.statusText}>
            {status?.type === 'success'
              ? `${status.chunks_stored} chunks`
              : status?.type === 'error'
              ? 'Failed'
              : status?.step || 'Waiting'}
          </span>
        </div>
      </div>

      {status?.type === 'progress' && (
        <div style={s.progressBar}>
          <div style={{
            ...s.progressFill,
            width: `${stepIndex >= 0 ? ((stepIndex + 1) / STATUS_STEPS.length) * 100 : 10}%`
          }} />
        </div>
      )}

      {status?.type === 'success' && status.detail && (
        <p style={s.successDetail}>{status.detail}</p>
      )}

      {status?.type === 'error' && status.message && (
        <p style={s.errorDetail}>{status.message}</p>
      )}
    </div>
  )
}

export default function Upload() {
  const [fileJobs, setFileJobs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    addFiles(dropped)
  }

  const addFiles = (newFiles) => {
    const jobs = newFiles.map(file => ({ file, status: null, jobId: null }))
    setFileJobs(prev => [...prev, ...jobs])
  }

  const updateJob = (index, updates) => {
    setFileJobs(prev => prev.map((job, i) => i === index ? { ...job, ...updates } : job))
  }

  const pollStatus = (jobId, index) => {
    const interval = setInterval(async () => {
      try {
        const res = await client.get(`/api/v1/ingest/status/${jobId}`)
        const { status: jobStatus, result } = res.data

        if (jobStatus === 'SUCCESS') {
          clearInterval(interval)
          updateJob(index, {
            status: {
              type: 'success',
              step: 'done',
              chunks_stored: result.chunks_stored,
              detail: `${result.department} · ${result.domain}`
            }
          })
        } else if (jobStatus === 'FAILURE') {
          clearInterval(interval)
          updateJob(index, {
            status: { type: 'error', message: result?.error || 'Processing failed' }
          })
        } else {
          updateJob(index, {
            status: { type: 'progress', step: result?.step || jobStatus }
          })
        }
      } catch {
        clearInterval(interval)
        updateJob(index, {
          status: { type: 'error', message: 'Lost connection to server' }
        })
      }
    }, 2000)
  }

  const handleUploadAll = async () => {
    if (fileJobs.length === 0) return
    setUploading(true)

    for (let i = 0; i < fileJobs.length; i++) {
      const { file, status } = fileJobs[i]
      if (status?.type === 'success') continue // skip already done

      const formData = new FormData()
      formData.append('file', file)

      try {
        updateJob(i, { status: { type: 'progress', step: 'queued' } })
        const res = await client.post('/api/v1/ingest/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        const jobId = res.data.job_id
        updateJob(i, { jobId, status: { type: 'progress', step: 'queued' } })
        pollStatus(jobId, i)
      } catch {
        updateJob(i, { status: { type: 'error', message: 'Upload failed' } })
      }
    }

    setUploading(false)
  }

  const removeFile = (index) => {
    setFileJobs(prev => prev.filter((_, i) => i !== index))
  }

  const clearCompleted = () => {
    setFileJobs(prev => prev.filter(j => j.status?.type !== 'success'))
  }

  const allDone = fileJobs.length > 0 && fileJobs.every(j => j.status?.type === 'success' || j.status?.type === 'error')
  const successCount = fileJobs.filter(j => j.status?.type === 'success').length

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Upload Documents</h1>
        <p style={s.subtitle}>Upload multiple files at once — PDF, DOCX, XLSX, CSV, JSON, images. AI classifies and indexes each automatically.</p>
      </div>

      <div style={s.card}>
        {/* Drop zone */}
        <div
          style={{ ...s.dropzone, ...(dragOver ? s.dropzoneActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => addFiles(Array.from(e.target.files))}
          />
          <div style={s.uploadIcon}>↑</div>
          <p style={s.dropText}>Drop files here or <span style={s.browse}>browse</span></p>
          <p style={s.formats}>PDF · DOCX · XLSX · CSV · JSON · PNG · JPG · ODT</p>
        </div>

        {/* File list */}
        {fileJobs.length > 0 && (
          <div style={s.fileList}>
            <div style={s.fileListHeader}>
              <span style={s.fileListTitle}>{fileJobs.length} file{fileJobs.length > 1 ? 's' : ''} selected</span>
              {allDone && successCount > 0 && (
                <button style={s.clearBtn} onClick={clearCompleted}>Clear completed</button>
              )}
            </div>

            {fileJobs.map((job, i) => (
              <div key={i} style={s.fileRowWrapper}>
                <FileRow fileJob={job} />
                {!job.status && (
                  <button style={s.removeBtn} onClick={() => removeFile(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={s.actions}>
          {allDone && (
            <div style={s.summary}>
              ✓ {successCount}/{fileJobs.length} files ingested successfully
            </div>
          )}
          <button
            style={{
              ...s.btn,
              ...((fileJobs.length === 0 || uploading) ? s.btnDisabled : {})
            }}
            onClick={handleUploadAll}
            disabled={fileJobs.length === 0 || uploading}
          >
            {uploading ? 'Uploading...' : `Upload ${fileJobs.length > 0 ? fileJobs.length : ''} File${fileJobs.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '32px' },
  title: { fontSize: '26px', fontWeight: 700, marginBottom: '8px' },
  subtitle: { color: '#666', fontSize: '14px', lineHeight: 1.6 },
  card: { background: '#111118', border: '1px solid #1e1e2e', borderRadius: '16px', padding: '28px' },
  dropzone: {
    border: '2px dashed #2a2a3e',
    borderRadius: '12px',
    padding: '36px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: '#0d0d14',
    transition: 'all 0.2s',
    marginBottom: '20px'
  },
  dropzoneActive: { border: '2px dashed #7c3aed', background: '#13111e' },
  uploadIcon: { fontSize: '28px', color: '#7c3aed', marginBottom: '10px' },
  dropText: { color: '#ccc', fontSize: '15px', marginBottom: '6px' },
  browse: { color: '#7c3aed', cursor: 'pointer' },
  formats: { color: '#444', fontSize: '12px', letterSpacing: '0.5px' },
  fileList: {
    background: '#0d0d14',
    borderRadius: '10px',
    border: '1px solid #1a1a2e',
    marginBottom: '16px',
    overflow: 'hidden'
  },
  fileListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1a1a2e'
  },
  fileListTitle: { color: '#666', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  clearBtn: { background: 'transparent', border: 'none', color: '#7c3aed', fontSize: '12px', cursor: 'pointer' },
  fileRowWrapper: { display: 'flex', alignItems: 'center', borderBottom: '1px solid #111' },
  fileRow: { flex: 1, padding: '12px 16px' },
  fileRowTop: { display: 'flex', alignItems: 'center', gap: '12px' },
  fileRowIcon: { fontSize: '20px', flexShrink: 0 },
  fileRowInfo: { flex: 1, minWidth: 0 },
  fileRowName: { color: '#ccc', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileRowSize: { color: '#555', fontSize: '11px', marginTop: '2px' },
  fileRowStatus: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  statusIcon: { fontSize: '13px' },
  statusText: { fontSize: '12px', fontWeight: 500 },
  progressBar: { height: '2px', background: '#1a1a2e', borderRadius: '1px', marginTop: '8px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#7c3aed', borderRadius: '1px', transition: 'width 0.4s ease' },
  successDetail: { color: '#555', fontSize: '11px', marginTop: '4px' },
  errorDetail: { color: '#ef4444', fontSize: '11px', marginTop: '4px' },
  removeBtn: { background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', padding: '0 16px', fontSize: '14px', flexShrink: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: '12px' },
  summary: { flex: 1, color: '#22c55e', fontSize: '13px' },
  btn: {
    padding: '13px 28px',
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  btnDisabled: { background: '#1e1e2e', color: '#444', cursor: 'not-allowed' }
}