import { Router } from 'express'
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { buildQualityCheckPrompt } from '../quality/promptTemplate'
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

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response.')
  }
  return text.slice(start, end + 1)
}

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
    const countsByCheck = normalized.findings.reduce<Record<string, number>>(
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

    const monthAbbreviationIssueCount = countsByCheck.check5 ?? 0
    const abbreviatedMonthsScore =
      normalized.abbreviatedMonthsScore ??
      Math.max(0, 100 - Math.min(100, monthAbbreviationIssueCount * 10))

    res.json({
      ...normalized,
      checks,
      overallIssueCount: normalized.findings.length,
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
