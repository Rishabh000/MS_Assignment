import type { ReportType } from '../../src/types/audit'

export function buildQualityCheckPrompt({
  reportType,
  documentText,
}: {
  reportType: ReportType
  documentText: string
}) {
  return `
You are an audit report quality reviewer.
Evaluate the report text using ALL nine checks below and return JSON only.

REPORT TYPE: ${reportType}

CHECK DEFINITIONS:
1) check1 - Format & Style - Front Page Title Uppercase
   - Confirm that the report title on the front page is written entirely in capital letters.

2) check2 - Content - Observation Title/Body Overlap
   - Check whether at least 50% of words from a section title appear in that section body/content.

3) check3 - Content - Heavy Jargon
   - Detect heavy/jargon language and suggest simpler alternatives.
   - Preferred simplifications include:
     "on account of the fact that" -> "because"
     "In possession of" -> "Have"
     "A large number of" -> "Many"
     "made a statement saying" -> "stated"
     "In the vicinity of" -> "Near"
     "admin" -> "administration"
     "vs" -> "compared to"
     "in order to" -> "to"

4) check4 - Content - Stop/Bad Words Frequency
   - Detect weak words from this set:
     [a bit, a little, a lot, almost, arguably, barely, basically, close to, exactly, fairly, ideate, just, kind of, like, literally, most, nearly, occasionally, often, ponder, practically, quite, really, several, severely, slightly, some, somewhat, sort of, study, surely, think about, think through, truly, usually, few, divers, certain, considerable, handful, numerous, rare, various, countless, crowded, myriad, populous]

5) check5 - Format & Style - Month Abbreviations
   - Allowed short forms: May, June, July.
   - Other month abbreviations should be expanded:
     Jan, Feb, Mar, Apr, Aug, Sept, Oct, Nov, Dec.

6) check6 - Format & Style - UK Number Formatting
   - Evaluate consistency with UK English number conventions:
     - Comma for thousands.
     - Decimal point for decimals.
     - For numbers ending with k, do not allow decimals in very large grouped values.
     - For numbers ending with m, comma is allowed as a thousands separator.
     - For numbers ending with m, allow decimal point only when no thousands comma is present.
     - No spaces inside numbers.
   - Examples:
     - Valid: 1,234 ; 5.34m ; 25m ; 250k
     - Invalid: 1 234 ; 1.234 (as thousands) ; 1,2m ; 250.5k (when grouped with comma)

7) check7 - Format & Style - Currency Symbol Policy
   - Currency symbols $, ₦, £, Fr. should be written as:
     USD, Naira, GBP, CHF.

8) check8 - Content - UK Spelling
   - Check spelling of words in section content using UK English and the enchant library.
   - Exclude:
     - Words consisting only of capital letters (likely abbreviations).
     - Words consisting only of capital letters ending with 's' (case-insensitive), e.g., SKUs, CDEs.
     - Numbers followed by 'k' or 'm' (case-insensitive), including decimals, because they are checked by number-formatting rules.
     - Text chunks containing two valid words separated by '/'.
     - Potential names and surnames (heuristic exclusion).
     - Numbers followed by measurement units, e.g., 100ml, 1kg.
     - 'e.g.' and 'i.e.' patterns, as they are checked by dedicated rules.
   - Treat these as valid dictionary additions:
     - Pepsi-Co
     - reputational
     - kCal
     - megajoule

9) check9 - Content - Double/Triple Spaces
   - Detect double or triple spaces between words.

OUTPUT RULES:
- Return strict JSON only. No markdown, no prose outside JSON.
- Use this exact schema:
{
  "overallIssueCount": number,
  "abbreviatedMonthsScore": number,
  "coverage": [
    {
      "checkId": "check1|check2|...|check9",
      "status": "found|not_found",
      "reason": string,
      "evidenceCount": integer
    }
  ],
  "checks": [
    {
      "id": "check1|check2|...|check9",
      "label": string,
      "issueCount": integer,
      "examples": string[],
      "confidence": number
    }
  ],
  "findings": [
    {
      "id": string,
      "checkId": "check1|check2|...|check9",
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
- Include all checks from check1 to check9 exactly once.
- Include coverage entries for check1 through check9 exactly once.
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
- For check2 (Observation Title/Body Overlap), recommendedText must be either:
  - a rewritten observation title, or
  - rewritten body sentence(s) that include title keywords.
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
- recommendedText must itself comply with all nine quality checks.
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
- recommendedText must itself comply with all nine quality checks.
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
