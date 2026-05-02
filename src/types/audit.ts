import { z } from 'zod'

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

export const qualityCheckDefinitions = [
  {
    id: 'check1',
    label: 'Format & Style - Front Page Title Uppercase',
    description:
      'Confirm that the report title on the front page is written entirely in capital letters.',
  },
  {
    id: 'check2',
    label: 'Content - Observation Title Body Overlap',
    description:
      'At least 50% of words in each observation title should be found in the corresponding observation body.',
  },
  {
    id: 'check3',
    label: 'Content - Heavy Jargon Detection',
    description:
      'Find jargon or heavy language and suggest simpler alternatives such as because, have, many, stated, near, administration, compared to, and to.',
  },
  {
    id: 'check4',
    label: 'Content - Stop and Bad Words Frequency',
    description:
      'Detect frequency of weak words including phrases like a bit, a little, a lot, basically, just, kind of, really, quite, some, numerous, and various.',
  },
  {
    id: 'check5',
    label: 'Format & Style - Month Abbreviations',
    description:
      'Only May, June, and July can remain abbreviated. Jan, Feb, Mar, Apr, Aug, Sept, Oct, Nov, and Dec should use full month names.',
  },
  {
    id: 'check6',
    label: 'Format & Style - UK Number Format',
    description:
      'Check inconsistent UK conventions for number formatting, including separators and rules for values ending with k and m.',
  },
  {
    id: 'check7',
    label: 'Format & Style - Currency Symbol Policy',
    description:
      'Currency symbols $, ₦, £, and Fr. should be replaced by text abbreviations USD, Naira, GBP, and CHF.',
  },
  {
    id: 'check8',
    label: 'Content - UK Spelling Quality',
    description:
      'Detect likely misspellings using UK English while excluding all-caps abbreviations, known domain words, number-unit patterns, and e.g./i.e. patterns.',
  },
  {
    id: 'check9',
    label: 'Content - Double and Triple Spaces',
    description: 'Check for double or triple spaces between words.',
  },
] as const

export type QualityCheckId = (typeof qualityCheckDefinitions)[number]['id']

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
