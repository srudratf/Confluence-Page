import { useEffect, useState } from 'react'
import {
  deleteArtifactFile,
  downloadArtifactFile,
  getArtifact,
  uploadArtifactFile,
} from '../api/artifacts'
import { ApiError } from '../api/client'
import type { ArtifactDetail } from '../api/types'
import { can } from '../auth/permissions'
import { useAuth } from '../auth/AuthContext'

interface ArtifactPanelProps {
  artifactId: string
  onClose: () => void
  onChanged: () => void
}

export function ArtifactPanel({ artifactId, onClose, onChanged }: ArtifactPanelProps) {
  const { session } = useAuth()
  const [detail, setDetail] = useState<ArtifactDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const canUpload = session ? can(session.user.role, 'uploads:create') : false
  const canManage = session ? can(session.user.role, 'artifacts:manage') : false

  useEffect(() => {
    let cancelled = false
    setError(null)
    getArtifact(artifactId)
      .then((artifact) => {
        if (!cancelled) setDetail(artifact)
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof ApiError ? caught.message : 'Could not load files')
        }
      })
    return () => {
      cancelled = true
    }
  }, [artifactId])

  const refresh = async () => {
    const artifact = await getArtifact(artifactId)
    setDetail(artifact)
    onChanged()
  }

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    setPending(true)
    setError(null)
    try {
      await uploadArtifactFile(artifactId, file)
      await refresh()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Upload failed')
    } finally {
      setPending(false)
    }
  }

  const handleDelete = async (fileId: string) => {
    setPending(true)
    setError(null)
    try {
      await deleteArtifactFile(artifactId, fileId)
      await refresh()
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Delete failed')
    } finally {
      setPending(false)
    }
  }

  const handleDownload = async (fileId: string, filename: string) => {
    try {
      await downloadArtifactFile(artifactId, fileId, filename)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Download failed')
    }
  }

  return (
    <section className="file-panel" aria-label="Artifact files">
      <div className="file-panel-head">
        <div>
          <h2>{detail?.name ?? 'Files'}</h2>
          <p className="card-path">{detail?.path}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>

      {error && (
        <p className="form-error form-error-general" role="alert">
          {error}
        </p>
      )}

      {!detail && !error && <p className="contents-empty">Loading files…</p>}

      {detail && detail.files.length === 0 && (
        <p className="contents-empty">No files yet.</p>
      )}

      {detail && detail.files.length > 0 && (
        <ul className="file-list">
          {detail.files.map((file) => {
            const canDelete = canManage || file.uploadedBy === session?.user.id
            return (
              <li key={file.id} className="file-row">
                <div>
                  <b>{file.originalName}</b>
                  <span className="file-meta">{file.relativePath}</span>
                </div>
                <div className="file-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleDownload(file.id, file.originalName)}
                  >
                    Download
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={pending}
                      onClick={() => void handleDelete(file.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {canUpload && (
        <label className="upload-field">
          <span>{pending ? 'Uploading…' : 'Upload file'}</span>
          <input
            type="file"
            accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.json,.yml,.yaml,.html,.zip"
            aria-describedby="upload-file-hint"
            disabled={pending}
            onChange={(event) => {
              const file = event.target.files?.[0]
              void handleUpload(file)
              event.target.value = ''
            }}
          />
          <span id="upload-file-hint" className="upload-hint">
            Max 10MB. Allowed: .md, .txt, .pdf, .png, .jpg, .jpeg, .json, .yml, .yaml, .html, .zip
          </span>
        </label>
      )}
    </section>
  )
}
