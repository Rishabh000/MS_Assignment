import type { QualityCheckResult, ReportType } from '../../../types/audit'

type RunQualityCheckInput = {
  documentText: string
  reportType: ReportType
}

export async function runQualityCheck({
  documentText,
  reportType,
}: RunQualityCheckInput): Promise<QualityCheckResult> {
  const response = await fetch('/api/quality-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentText, reportType }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'Unable to run quality check at this time.'
    throw new Error(message)
  }

  if (
    !payload ||
    !Array.isArray(payload.checks) ||
    !Array.isArray(payload.findings)
  ) {
    throw new Error('Invalid quality check response received.')
  }

  return payload as QualityCheckResult
}
