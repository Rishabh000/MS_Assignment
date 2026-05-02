import { Router } from 'express'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import {
  buildQualityCheckPrompt,
  buildRecommendationRepairPrompt,
  buildRecommendationSelfReviewPrompt,
} from '../quality/promptTemplate'
import { qualityCheckResponseSchema } from '../quality/resultSchema'

const requestSchema = z.object({
  reportType: z.enum(['Draft', 'Final']),
  documentText: z.string().min(1),
})

const router = Router()

const model = 'gemini-2.5-flash'
const checkIds = [
  'check1',
  'check2',
  'check3',
  'check4',
  'check5',
  'check6',
  'check7',
  'check8',
  'check9',
] as const

function normalizeForGrounding(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function findingIsGrounded(documentText: string, originalText: string): boolean {
  const sourceNormalized = normalizeForGrounding(documentText)
  const findingNormalized = normalizeForGrounding(originalText)
  if (!findingNormalized) return false
  return sourceNormalized.includes(findingNormalized)
}

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response.')
  }
  return text.slice(start, end + 1)
}

const recommendationRepairResponseSchema = z.object({
  repairs: z.array(
    z.object({
      id: z.string().min(1),
      recommendedText: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ),
})

const recommendationSelfReviewResponseSchema = z.object({
  revisions: z.array(
    z.object({
      id: z.string().min(1),
      recommendedText: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ),
})

router.post('/quality-check', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null

    if (!ai) {
      res.status(500).json({
        error:
          'Gemini API key is not configured. Set GEMINI_API_KEY in your environment.',
      })
      return
    }

    const parsedRequest = requestSchema.safeParse(req.body)
    if (!parsedRequest.success) {
      res.status(400).json({ error: 'Invalid quality check request payload.' })
      return
    }

    const prompt = buildQualityCheckPrompt(parsedRequest.data)
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    })

    const responseText = response.text ?? ''
    const jsonText = extractJsonBlock(responseText)
    const modelJson: unknown = JSON.parse(jsonText)
    const parsedResult = qualityCheckResponseSchema.safeParse(modelJson)

    if (!parsedResult.success) {
      res.status(502).json({
        error: 'Unable to parse quality-check response.',
      })
      return
    }

    const normalized = parsedResult.data
    let groundedFindings = normalized.findings.filter((finding) =>
      findingIsGrounded(parsedRequest.data.documentText, finding.originalText),
    )
    let repairedRecommendationCount = 0
    let selfReviewedRecommendationCount = 0

    if (groundedFindings.length > 0) {
      try {
        const repairPrompt = buildRecommendationRepairPrompt({
          documentText: parsedRequest.data.documentText,
          findings: groundedFindings.map((finding) => ({
            id: finding.id,
            checkId: finding.checkId,
            originalText: finding.originalText,
            recommendedText: finding.recommendedText,
            rationale: finding.rationale,
          })),
        })
        const repairResponse = await ai.models.generateContent({
          model,
          contents: repairPrompt,
        })
        const repairText = repairResponse.text ?? ''
        const repairJsonText = extractJsonBlock(repairText)
        const parsedRepairResult = recommendationRepairResponseSchema.safeParse(
          JSON.parse(repairJsonText),
        )

        if (parsedRepairResult.success) {
          const repairsById = new Map(
            parsedRepairResult.data.repairs.map((item) => [item.id, item]),
          )

          groundedFindings = groundedFindings.map((finding) => {
            const repair = repairsById.get(finding.id)
            if (!repair) return finding

            const changed =
              repair.recommendedText !== finding.recommendedText ||
              repair.rationale !== finding.rationale
            if (changed) repairedRecommendationCount += 1
            return {
              ...finding,
              recommendedText: repair.recommendedText,
              rationale: repair.rationale,
            }
          })
        }
      } catch {
        // Keep original findings if recommendation repair call fails.
      }

      try {
        const selfReviewPrompt = buildRecommendationSelfReviewPrompt({
          documentText: parsedRequest.data.documentText,
          findings: groundedFindings.map((finding) => ({
            id: finding.id,
            checkId: finding.checkId,
            originalText: finding.originalText,
            recommendedText: finding.recommendedText,
            rationale: finding.rationale,
          })),
        })
        const selfReviewResponse = await ai.models.generateContent({
          model,
          contents: selfReviewPrompt,
        })
        const selfReviewText = selfReviewResponse.text ?? ''
        const selfReviewJsonText = extractJsonBlock(selfReviewText)
        const parsedSelfReviewResult = recommendationSelfReviewResponseSchema.safeParse(
          JSON.parse(selfReviewJsonText),
        )

        if (parsedSelfReviewResult.success) {
          const revisionsById = new Map(
            parsedSelfReviewResult.data.revisions.map((item) => [item.id, item]),
          )

          groundedFindings = groundedFindings.map((finding) => {
            const revision = revisionsById.get(finding.id)
            if (!revision) return finding

            const changed =
              revision.recommendedText !== finding.recommendedText ||
              revision.rationale !== finding.rationale
            if (changed) selfReviewedRecommendationCount += 1
            return {
              ...finding,
              recommendedText: revision.recommendedText,
              rationale: revision.rationale,
            }
          })
        }
      } catch {
        // Keep latest findings if recommendation self-review call fails.
      }
    }
    const countsByCheck = groundedFindings.reduce<Record<string, number>>(
      (acc, finding) => {
        acc[finding.checkId] = (acc[finding.checkId] ?? 0) + 1
        return acc
      },
      {},
    )

    const checks = normalized.checks.map((check) => ({
      ...check,
      issueCount: countsByCheck[check.id] ?? check.issueCount,
    }))

    // Ensure all checks are present in response even if model misses one.
    for (const id of checkIds) {
      if (!checks.some((item) => item.id === id)) {
        checks.push({
          id,
          label: id,
          issueCount: countsByCheck[id] ?? 0,
          confidence: 0,
          examples: [],
        })
      }
    }

    checks.sort((a, b) => a.id.localeCompare(b.id))

    const modelCoverageByCheck = new Map(
      (normalized.coverage ?? []).map((item) => [item.checkId, item]),
    )
    const coverage = checkIds.map((id) => {
      const fallbackEvidenceCount = countsByCheck[id] ?? 0
      const modelCoverage = modelCoverageByCheck.get(id)

      if (!modelCoverage) {
        return {
          checkId: id,
          status: fallbackEvidenceCount > 0 ? 'found' : 'not_found',
          reason:
            fallbackEvidenceCount > 0
              ? 'Evidence found in grounded findings.'
              : 'No grounded findings detected for this check.',
          evidenceCount: fallbackEvidenceCount,
        }
      }

      return {
        checkId: id,
        status: fallbackEvidenceCount > 0 ? 'found' : 'not_found',
        reason: modelCoverage.reason,
        evidenceCount: fallbackEvidenceCount,
      }
    })

    const monthAbbreviationIssueCount = countsByCheck.check5 ?? 0
    const abbreviatedMonthsScore =
      normalized.abbreviatedMonthsScore ??
      Math.max(0, 100 - Math.min(100, monthAbbreviationIssueCount * 10))

    const droppedUngroundedCount = normalized.findings.length - groundedFindings.length
    const summaryNotes: string[] = []
    if (droppedUngroundedCount > 0) {
      summaryNotes.push(
        `${droppedUngroundedCount} ungrounded finding(s) were excluded because original text was not found in the uploaded document.`,
      )
    }
    if (repairedRecommendationCount > 0) {
      summaryNotes.push(
        `${repairedRecommendationCount} recommendation(s) were repaired with a second prompt pass to improve specificity.`,
      )
    }
    if (selfReviewedRecommendationCount > 0) {
      summaryNotes.push(
        `${selfReviewedRecommendationCount} recommendation(s) were passed through a final self-review prompt for quality consistency.`,
      )
    }
    if (!normalized.coverage) {
      summaryNotes.push(
        'Coverage reporting was generated server-side because the model omitted explicit coverage details.',
      )
    }
    const modelSummary =
      summaryNotes.length > 0
        ? `${normalized.modelSummary} ${summaryNotes.join(' ')}`
        : normalized.modelSummary

    res.json({
      ...normalized,
      modelSummary,
      coverage,
      checks,
      findings: groundedFindings,
      overallIssueCount: groundedFindings.length,
      abbreviatedMonthsScore,
    })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to run quality check.'
    res.status(500).json({ error: message })
  }
})

export { router as qualityCheckRouter }
