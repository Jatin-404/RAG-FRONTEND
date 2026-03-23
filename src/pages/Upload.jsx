import { useState, useRef } from 'react'
import client from '../api/client'

const STATUS_STEPS = ['queued', 'extracting chunks', 'classifying', 'embedding', 'saving to database']

function FileRow({ fileJob, onRemove }) {
  const { file, status } = fileJob
  const stepIndex = STATUS_STEPS.indexOf(status?.step)

  const ext = file.name.split('.').pop()?.toLowerCase()
  const icons = { pdf: '📕', docx: '📘', doc: '📘', xlsx: '📗', xls: '📗', csv: '📊', json: '📋', png: '🖼', jpg: '🖼', odt: '📄' }
  const icon = icons[ext] || '📄'

  const statusColor = status?.type === 'success' ? '#16a34a'
    : status?.type === 'error' ? '#dc2626'
    : status?.type === 'progress' ? '#6d4aff'
    : '#9b94b0'

  const statusText = status?.type === 'success'
    ? `Done · ${status.chunks_stored} chunks`
    : status?.type === 'error' ? 'Failed'
    : status?.step || 'Waiting'

  return (
    <div style={s.fileRow}>
      <span style={s.fileRowIcon}>{icon}</span>
      <div style={s.fileRowMid}>
        <p style={s.fileRowName}>{file.name}</p>
        <p style={s.fileRowSize}>{(file.size / 1024).toFixed(1)} KB</p>
        {status?.type === 'progress' && stepIndex >= 0 && (
          <div style={s.progressBar}>
            <div style={{
              ...s.progressFill,
              width: `${((stepIndex + 1) / STATUS_STEPS.length) * 100}%`
            }} />
          </div>
        )}
      </div>
      <div style={{ ...s.fileRowStatus, color: statusColor }}>
        {status?.type === 'success' && <span>✓</span>}
        {status?.type === 'error' && <span>✗</span>}
        {status?.type === 'progress' && <span style={s.spinDot}>◉</span>}
        <span style={s.statusLabel}>{statusText}</span>
      </div>
      {!status && (
        <button style={s.removeBtn} onClick={onRemove}>✕</button>
      )}
    </div>
  )
}

export default function Upload() {
  const [fileJobs, setFileJobs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const addFiles = (newFiles) => {
    const jobs = newFiles.map(file => ({ file, status: null, jobId: null }))
    setFileJobs(prev => [...prev, ...jobs])
  }

  const updateJob = (index, updates) => {
    setFileJobs(prev => prev.map((job, i) => i === index ? { ...job, ...updates } : job))
  }

  const removeJob = (index) => {
    setFileJobs(prev => prev.filter((_, i) => i !== index))
  }

  const pollStatus = (jobId, index) => {
    const interval = setInterval(async () => {
      try {
        const res = await client.get(`/api/v1/ingest/status/${jobId}`)
        const { status: jobStatus, result } = res.data
        if (jobStatus === 'SUCCESS') {
          clearInterval(interval)
          updateJob(index, { status: { type: 'success', step: 'done', chunks_stored: result.chunks_stored } })
        } else if (jobStatus === 'FAILURE') {
          clearInterval(interval)
          updateJob(index, { status: { type: 'error', message: result?.error || 'Failed' } })
        } else {
          updateJob(index, { status: { type: 'progress', step: result?.step || jobStatus } })
        }
      } catch {
        clearInterval(interval)
        updateJob(index, { status: { type: 'error', message: 'Connection lost' } })
      }
    }, 2000)
  }

  const handleUploadAll = async () => {
    if (!fileJobs.length) return
    setUploading(true)
    for (let i = 0; i < fileJobs.length; i++) {
      const { file, status } = fileJobs[i]
      if (status?.type === 'success') continue
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

  const clearCompleted = () => {
    setFileJobs(prev => prev.filter(j => j.status?.type !== 'success'))
  }

  const successCount = fileJobs.filter(j => j.status?.type === 'success').length
  const allDone = fileJobs.length > 0 && fileJobs.every(j => j.status?.type === 'success' || j.status?.type === 'error')
  const pendingCount = fileJobs.filter(j => !j.status).length

  return (
    <div style={s.page}>
      {/* Top bar */}
      <div style={s.topBar}>
        <span style={s.topBarTitle}>Upload Documents</span>
        {fileJobs.length > 0 && (
          <span style={s.fileCount}>{fileJobs.length} file{fileJobs.length > 1 ? 's' : ''} selected</span>
        )}
      </div>

      <div style={s.content}>
        {/* Drop zone */}
        <div
          style={{ ...s.dropzone, ...(dragOver ? s.dropActive : {}) }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => inputRef.current.click()}
        >
          <input ref={inputRef} type="file" multiple style={{ display: 'none' }}
            onChange={e => addFiles(Array.from(e.target.files))} />
          <div style={s.dropIcon}>↑</div>
          <p style={s.dropText}>Drop files here or <span style={s.dropLink}>browse</span></p>
          <p style={s.dropFormats}>PDF · DOCX · XLSX · CSV · JSON · PNG · JPG · ODT</p>
        </div>

        {/* File list */}
        {fileJobs.length > 0 && (
          <div style={s.fileList}>
            <div style={s.fileListHeader}>
              <span style={s.fileListLabel}>Files</span>
              {allDone && successCount > 0 && (
                <button style={s.clearBtn} onClick={clearCompleted}>Clear completed</button>
              )}
            </div>
            {fileJobs.map((job, i) => (
              <FileRow key={i} fileJob={job} onRemove={() => removeJob(i)} />
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={s.actions}>
          {allDone && (
            <span style={s.doneText}>✓ {successCount}/{fileJobs.length} ingested</span>
          )}
          <button
            style={{
              ...s.uploadBtn,
              ...((fileJobs.length === 0 || uploading) ? s.uploadBtnDisabled : {})
            }}
            onClick={handleUploadAll}
            disabled={fileJobs.length === 0 || uploading}
          >
            {uploading
              ? 'Uploading...'
              : `Upload ${pendingCount > 0 ? pendingCount : fileJobs.length} File${fileJobs.length !== 1 ? 's' : ''}`}
          </button>
        </div>
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
  fileCount: { fontSize: '12px', color: '#6b6480', background: '#f5f4f7', border: '1px solid #e8e4f0', borderRadius: '20px', padding: '4px 12px' },
  content: { flex: 1, overflow: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px', width: '100%', margin: '0 auto' },
  dropzone: {
    background: '#fff', border: '2px dashed #d8d2eb',
    borderRadius: '14px', padding: '40px 24px',
    textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s'
  },
  dropActive: { border: '2px dashed #6d4aff', background: '#faf9ff' },
  dropIcon: { fontSize: '24px', color: '#6d4aff', marginBottom: '10px' },
  dropText: { fontSize: '14px', color: '#6b6480', marginBottom: '6px' },
  dropLink: { color: '#6d4aff', fontWeight: 600 },
  dropFormats: { fontSize: '12px', color: '#9b94b0', letterSpacing: '0.3px' },
  fileList: { background: '#fff', borderRadius: '12px', border: '1px solid #e8e4f0', overflow: 'hidden' },
  fileListHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 16px', borderBottom: '1px solid #f0eef5'
  },
  fileListLabel: { fontSize: '11px', fontWeight: 600, color: '#9b94b0', textTransform: 'uppercase', letterSpacing: '0.5px' },
  clearBtn: { background: 'none', border: 'none', color: '#6d4aff', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', borderBottom: '1px solid #f5f4f7'
  },
  fileRowIcon: { fontSize: '22px', flexShrink: 0 },
  fileRowMid: { flex: 1, minWidth: 0 },
  fileRowName: { fontSize: '13px', fontWeight: 500, color: '#1a1525', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileRowSize: { fontSize: '11px', color: '#9b94b0', marginTop: '2px' },
  progressBar: { height: '3px', background: '#f0eef5', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', background: '#6d4aff', borderRadius: '2px', transition: 'width 0.4s ease' },
  fileRowStatus: { display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, fontSize: '12px', fontWeight: 500 },
  spinDot: { fontSize: '10px' },
  statusLabel: {},
  removeBtn: { background: 'none', border: 'none', color: '#d8d2eb', cursor: 'pointer', fontSize: '13px', padding: '4px', flexShrink: 0 },
  actions: { display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' },
  doneText: { flex: 1, fontSize: '13px', color: '#16a34a', fontWeight: 500 },
  uploadBtn: {
    padding: '11px 24px', background: '#6d4aff', color: '#fff',
    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif'
  },
  uploadBtnDisabled: { background: '#e8e4f0', color: '#9b94b0', cursor: 'not-allowed' }
}