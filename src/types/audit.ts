import { z } from 'zod'
import {
  qualityRuleDefinitions,
  type QualityCheckId,
} from '../../shared/qualityRules'
export type { QualityCheckId } from '../../shared/qualityRules'

export const reportTypeOptions = ['Draft', 'Final'] as const

export type ReportType = (typeof reportTypeOptions)[number]

export type StageInfo = {
  current: number
  total: number
  label: string
}

export type AuditMetadata = {
  title: string
  startDate: string
  endDate: string
  auditManager: string
  leadAuditor: string
}

export type AuditSummary = {
  stage: StageInfo
  metadata: AuditMetadata
  completionPercent: number
}

export const maxUploadBytes = 10 * 1024 * 1024

export const acceptedDocumentMimeTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const acceptedDocumentExtensions = ['.docx']

export const qualityCheckDefinitions = qualityRuleDefinitions.map((rule) => ({
  id: rule.id,
  label: rule.label,
  description: rule.definition,
}))

export type QualityCheckItem = {
  id: QualityCheckId
  label: string
  issueCount: number
  examples: string[]
  confidence?: number
}

export const severityOptions = ['High', 'Medium', 'Low'] as const

export type Severity = (typeof severityOptions)[number]

export type QualityFinding = {
  id: string
  checkId: QualityCheckId
  pageNumber: number
  section: string
  line: number
  confidenceScore: number
  severity: Severity
  originalText: string
  recommendedText: string
  rationale: string
}

export type QualityCoverageItem = {
  checkId: QualityCheckId
  status: 'found' | 'not_found'
  reason: string
  evidenceCount: number
}

export type QualityCheckResult = {
  overallIssueCount: number
  abbreviatedMonthsScore: number
  coverage?: QualityCoverageItem[]
  checks: QualityCheckItem[]
  findings: QualityFinding[]
  modelSummary: string
}

export const uploadFormSchema = z.object({
  reportType: z.enum(reportTypeOptions, {
    error: 'Please select a report type.',
  }),
  reportFile: z
    .instanceof(File, { error: 'Please upload an audit report file.' })
    .refine(
      (file) =>
        acceptedDocumentMimeTypes.includes(file.type) ||
        acceptedDocumentExtensions.some((ext) =>
          file.name.toLowerCase().endsWith(ext),
        ),
      'Only DOCX files are allowed for AI quality checks.',
    )
    .refine(
      (file) => file.size <= maxUploadBytes,
      'File size must be 10MB or less.',
    ),
})

export type UploadFormValues = z.infer<typeof uploadFormSchema>
