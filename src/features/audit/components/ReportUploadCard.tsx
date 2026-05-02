import type { ChangeEvent } from 'react'
import { CircleX, FileText, Upload } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { acceptedDocumentExtensions, maxUploadBytes } from '../../../types/audit'
import { formatFileSize } from '../../../utils/file'

type ReportUploadCardProps = {
  file: File | null
  onPickFile: (file: File | null) => void
  error?: string
}

export function ReportUploadCard({ file, onPickFile, error }: ReportUploadCardProps) {
  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    onPickFile(selectedFile)
  }

  return (
    <Card className="p-4">
      <label className="mb-2 block text-sm font-semibold text-slate-700">Upload Report *</label>
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
        {!file ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            <Upload className="h-4 w-4" />
            <span>Choose File</span>
            <input
              type="file"
              className="sr-only"
              accept={acceptedDocumentExtensions.join(',')}
              onChange={onFileChange}
            />
          </label>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Allowed: {acceptedDocumentExtensions.join(', ')} | Max size: {formatFileSize(maxUploadBytes)}
        </p>

        {file ? (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-brand-600">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => onPickFile(null)} aria-label="Remove file">
              <CircleX className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </Card>
  )
}
