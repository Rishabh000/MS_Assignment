import type { ReportType } from '../../src/types/audit'
import { qualityRuleDefinitions } from '../../shared/qualityRules'

export function buildQualityCheckPrompt({
  reportType,
  documentText,
}: {
  reportType: ReportType
  documentText: string
}) {
  const checkIds = qualityRuleDefinitions.map((rule) => rule.id)
  const checkIdUnion = checkIds.join('|')
  const checksList = qualityRuleDefinitions
    .map((rule, index) => {
      const guidanceLines = rule.guidance
        ? rule.guidance.map((line) => `   - ${line}`).join('\n')
        : ''
      const toolingHint = rule.toolingHint
        ? `\n   - Tooling hint: ${rule.toolingHint}`
        : ''

      return `${index + 1}) ${rule.id} - ${rule.label}
   - ${rule.definition}${guidanceLines ? `\n${guidanceLines}` : ''}${toolingHint}`
    })
    .join('\n\n')

  return `
You are an audit report quality reviewer.
Evaluate the report text using ALL configured checks below and return JSON only.

REPORT TYPE: ${reportType}

CHECK DEFINITIONS:
${checksList}

OUTPUT RULES:
- Return strict JSON only. No markdown, no prose outside JSON.
- Use this exact schema:
{
  "overallIssueCount": number,
  "abbreviatedMonthsScore": number,
  "coverage": [
    {
      "checkId": "${checkIdUnion}",
      "status": "found|not_found",
      "reason": string,
      "evidenceCount": integer
    }
  ],
  "checks": [
    {
      "id": "${checkIdUnion}",
      "label": string,
      "issueCount": integer,
      "examples": string[],
      "confidence": number
    }
  ],
  "findings": [
    {
      "id": string,
      "checkId": "${checkIdUnion}",
      "pageNumber": number,
      "section": string,
      "line": number,
      "confidenceScore": number,
      "severity": "High|Medium|Low",
      "originalText": string,
      "recommendedText": string,
      "rationale": string
    }
  ],
  "modelSummary": string
}
- abbreviatedMonthsScore must be in range [0, 100], where higher is better for month abbreviation compliance.
- Include all check ids exactly once in checks: ${checkIds.join(', ')}.
- Include all check ids exactly once in coverage: ${checkIds.join(', ')}.
- issueCount must be an integer >= 0.
- confidence must be in range [0, 1].
- confidenceScore must be in range [0, 1].
- coverage.status must be "found" when at least one issue is identified for that check, otherwise "not_found".
- coverage.reason must explain why issues were or were not identified for each check.
- coverage.evidenceCount must be an integer >= 0 and should align with issue evidence for that check.
- examples should include short concrete findings; empty list allowed for zero issues.
- Every finding must map to one check via checkId.
- The sum of issueCount values across checks should equal findings.length.
- originalText must be an exact verbatim snippet copied from REPORT TEXT TO ANALYZE.
- If you cannot locate an exact snippet in the report text, do not return that finding.
- recommendedText must be concrete replacement text (what should appear in document), not generic advice.
- recommendedText must be a direct replacement snippet that can be pasted into the report.
- Do not output meta-advice (e.g., "rephrase", "improve wording", "clarify").
- Preserve factual content, entities, quantities, and units unless the violated rule explicitly requires changing them.
- Use one best replacement only; do not provide multiple options.
- Do not use placeholders such as "...", "etc.", or "as appropriate".
- For check2 (Observation Title/Body Overlap), when present in configured rules:
  - Preserve observation/section titles (do not rename headings).
  - recommendedText must be rewritten body sentence(s) that include key title words.
  Do not output suggestions like "rephrase this" without actual replacement text.

REPORT TEXT TO ANALYZE:
"""
${documentText}
"""
`
}

type RecommendationRepairInput = {
  id: string
  checkId: string
  originalText: string
  recommendedText: string
  rationale: string
}

export function buildRecommendationRepairPrompt({
  documentText,
  findings,
}: {
  documentText: string
  findings: RecommendationRepairInput[]
}) {
  const serializedFindings = JSON.stringify(findings, null, 2)

  return `
You are improving recommendation quality for already-detected audit findings.
Do not detect new issues. Only repair weak recommendations for the provided finding list.

GOAL:
- For each finding, return concrete replacement text that can be pasted into the report.
- Keep the finding id unchanged.
- Ensure recommendation is specific and actionable, not generic advice.

INPUT FINDINGS TO REPAIR:
${serializedFindings}

OUTPUT RULES:
- Return strict JSON only. No markdown, no prose outside JSON.
- Use this exact schema:
{
  "repairs": [
    {
      "id": string,
      "recommendedText": string,
      "rationale": string
    }
  ]
}
- Return exactly one repair item for each input finding id.
- Do not add, remove, or rename finding ids.
- Do not change checkId or originalText; only improve recommendedText and rationale quality.
- recommendedText must be concrete replacement text, not comments like "rephrase this" or "improve wording".
- recommendedText must itself comply with all configured quality checks.
- Never introduce heavy/jargon phrases such as:
  "on account of the fact that", "in possession of", "a large number of",
  "made a statement saying", "in the vicinity of", "vs", "in order to".
- originalText may contain errors; provide corrected text in recommendedText.
- Keep rationale concise and specific to the finding.
- If unsure, still provide the best specific replacement text rather than generic advice.

REPORT TEXT TO ANALYZE:
"""
${documentText}
"""
`
}

export function buildRecommendationSelfReviewPrompt({
  documentText,
  findings,
}: {
  documentText: string
  findings: RecommendationRepairInput[]
}) {
  const serializedFindings = JSON.stringify(findings, null, 2)

  return `
You are reviewing recommendation quality for audit findings.
Do not detect new findings. Keep ids unchanged and work only with provided items.

GOAL:
- Ensure every recommendation is concrete, specific, and directly pasteable into the report.
- Remove generic advice and replace it with exact replacement text.
- Keep rationale concise and tied to the recommendation.

INPUT FINDINGS TO REVIEW:
${serializedFindings}

OUTPUT RULES:
- Return strict JSON only. No markdown, no prose outside JSON.
- Use this exact schema:
{
  "revisions": [
    {
      "id": string,
      "recommendedText": string,
      "rationale": string
    }
  ]
}
- Return exactly one revision item for each input finding id.
- Do not add, remove, or rename finding ids.
- Do not change checkId or originalText; only revise recommendedText and rationale quality.
- recommendedText must not be meta-advice (for example: "rephrase", "improve wording", "clarify").
- recommendedText must be concrete replacement text.
- recommendedText must itself comply with all configured quality checks.
- Never introduce heavy/jargon phrases such as:
  "on account of the fact that", "in possession of", "a large number of",
  "made a statement saying", "in the vicinity of", "vs", "in order to".
- If the existing recommendation is already high quality, keep it unchanged.

REPORT TEXT TO ANALYZE:
"""
${documentText}
"""
`
}
