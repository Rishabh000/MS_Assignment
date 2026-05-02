import { z } from 'zod'

const checkIdSchema = z.enum([
  'check1',
  'check2',
  'check3',
  'check4',
  'check5',
  'check6',
  'check7',
  'check8',
  'check9',
])

const checkItemSchema = z.object({
  id: checkIdSchema,
  label: z.string().min(1),
  issueCount: z.number().int().min(0),
  examples: z.array(z.string()),
  confidence: z.number().min(0).max(1).optional(),
})

const findingSchema = z.object({
  id: z.string().min(1),
  checkId: checkIdSchema,
  pageNumber: z.number().int().min(1),
  section: z.string().min(1),
  line: z.number().int().min(1),
  confidenceScore: z.number().min(0).max(1),
  severity: z.enum(['High', 'Medium', 'Low']),
  originalText: z.string().min(1),
  recommendedText: z.string().min(1),
  rationale: z.string().min(1),
})

const coverageItemSchema = z.object({
  checkId: checkIdSchema,
  status: z.enum(['found', 'not_found']),
  reason: z.string().min(1),
  evidenceCount: z.number().int().min(0),
})

export const qualityCheckResponseSchema = z
  .object({
    overallIssueCount: z.number().int().min(0),
    abbreviatedMonthsScore: z.number().min(0).max(100).optional(),
    coverage: z.array(coverageItemSchema).length(9).optional(),
    checks: z.array(checkItemSchema).length(9),
    findings: z.array(findingSchema),
    modelSummary: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    const ids = value.checks.map((item) => item.id)
    const idSet = new Set(ids)
    if (idSet.size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each quality check id must be unique.',
      })
    }

    if (value.coverage) {
      const coverageIds = value.coverage.map((item) => item.checkId)
      const coverageSet = new Set(coverageIds)
      if (coverageSet.size !== coverageIds.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Each coverage checkId must be unique.',
        })
      }
    }
  })

export type QualityCheckResponse = z.infer<typeof qualityCheckResponseSchema>
