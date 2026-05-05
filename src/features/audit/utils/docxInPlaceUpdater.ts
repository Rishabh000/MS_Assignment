import JSZip from 'jszip'
import type { QualityFinding } from '../../../types/audit'

const editableDocxXmlPattern =
  /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildFlexiblePatterns(originalText: string): RegExp[] {
  const normalizedOriginal = originalText.trim()
  const escaped = escapeRegex(normalizedOriginal)
  const whitespaceFlexible = escaped.replace(/\s+/g, '[\\s\\u00A0]+')
  const apostropheFlexible = whitespaceFlexible.replace(/'/g, "['’]")
  const quoteFlexible = apostropheFlexible.replace(/"/g, '["“”]')
  const dashFlexible = quoteFlexible.replace(/-/g, '[-–—]')

  const tokenPattern = buildTokenSequencePattern(originalText)
  const normalizedWhitespace = normalizedOriginal.replace(/\s+/g, ' ').trim()
  const normalizedWhitespacePattern = escapeRegex(normalizedWhitespace).replace(
    /\s+/g,
    '[\\s\\u00A0]+',
  )
  const simpleWordMatch = normalizedOriginal.match(/^[A-Za-z]{2,20}\.?$/)
  const wholeWordPattern = simpleWordMatch
    ? new RegExp(`\\b${escapeRegex(simpleWordMatch[0].replace(/\.$/, ''))}\\b\\.?`)
    : null

  return [
    new RegExp(escapeRegex(originalText), ''),
    ...(wholeWordPattern ? [wholeWordPattern] : []),
    new RegExp(whitespaceFlexible, ''),
    new RegExp(apostropheFlexible, ''),
    new RegExp(quoteFlexible, ''),
    new RegExp(dashFlexible, ''),
    new RegExp(normalizedWhitespacePattern, ''),
    ...(tokenPattern ? [tokenPattern] : []),
    ...(wholeWordPattern ? [new RegExp(wholeWordPattern.source, 'i')] : []),
    new RegExp(whitespaceFlexible, 'i'),
    new RegExp(apostropheFlexible, 'i'),
    new RegExp(quoteFlexible, 'i'),
    new RegExp(dashFlexible, 'i'),
    new RegExp(normalizedWhitespacePattern, 'i'),
    ...(tokenPattern ? [new RegExp(tokenPattern.source, 'i')] : []),
  ]
}

function buildTokenSequencePattern(originalText: string): RegExp | null {
  const tokens = originalText
    .split(/[^A-Za-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)

  if (tokens.length < 2) return null

  const escapedTokens = tokens.map((token) => escapeRegex(token))
  const maxGap = '[\\s\\S]{0,24}?'
  const sequence = escapedTokens.join(maxGap)
  return new RegExp(sequence, '')
}

function normalizeForOverlap(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function severityRank(value: QualityFinding['severity']): number {
  if (value === 'High') return 3
  if (value === 'Medium') return 2
  return 1
}

function compareByPriority(a: QualityFinding, b: QualityFinding): number {
  const byLength = b.originalText.length - a.originalText.length
  if (byLength !== 0) return byLength

  const byConfidence = b.confidenceScore - a.confidenceScore
  if (byConfidence !== 0) return byConfidence

  const bySeverity = severityRank(b.severity) - severityRank(a.severity)
  if (bySeverity !== 0) return bySeverity

  return a.id.localeCompare(b.id)
}

function dedupeAndPrioritizeFindings(findings: QualityFinding[]): {
  findings: QualityFinding[]
  skippedOverlaps: number
} {
  const ordered = [...findings].sort(compareByPriority)
  const keptKeys = new Set<string>()
  const deduped: QualityFinding[] = []
  let skippedOverlaps = 0

  for (const finding of ordered) {
    const locationKey = `${finding.pageNumber}|${finding.section.toLowerCase()}|${finding.line}`
    const normalizedOriginal = normalizeForOverlap(finding.originalText)
    if (!normalizedOriginal) {
      deduped.push(finding)
      continue
    }

    // Only remove exact duplicate recommendations. Allow overlapping text edits
    // so a broad rewrite and a spelling correction can both be applied.
    const uniqueKey = `${locationKey}|${finding.checkId}|${normalizedOriginal}`
    if (keptKeys.has(uniqueKey)) {
      skippedOverlaps += 1
      continue
    }

    keptKeys.add(uniqueKey)
    deduped.push(finding)
  }

  return { findings: deduped, skippedOverlaps }
}

function replaceFirstFlexible(
  sourceText: string,
  originalText: string,
  recommendedText: string,
): { updatedText: string; replaced: boolean } {
  for (const pattern of buildFlexiblePatterns(originalText)) {
    if (!pattern.test(sourceText)) continue
    const updatedText = sourceText.replace(pattern, recommendedText)
    if (updatedText !== sourceText) {
      return { updatedText, replaced: true }
    }
  }

  return { updatedText: sourceText, replaced: false }
}

type MatchRange = { start: number; end: number }

type TextNodeSegment = {
  node: Element
  start: number
  end: number
  text: string
}

function setNodeTextPreservingWhitespace(node: Element, value: string): void {
  node.textContent = value
  if (/^\s|\s$/.test(value)) {
    node.setAttribute('xml:space', 'preserve')
    return
  }
  node.removeAttribute('xml:space')
}

function splitTextByWeights(text: string, weights: number[]): string[] {
  if (weights.length === 0) return []
  const totalWeight = weights.reduce((sum, value) => sum + Math.max(0, value), 0)
  if (totalWeight === 0) {
    const chunks = new Array<string>(weights.length).fill('')
    chunks[0] = text
    return chunks
  }

  const chunks: string[] = []
  let consumed = 0
  let accumulatedWeight = 0

  for (let index = 0; index < weights.length; index += 1) {
    if (index === weights.length - 1) {
      chunks.push(text.slice(consumed))
      break
    }
    accumulatedWeight += Math.max(0, weights[index])
    const target = Math.round((accumulatedWeight / totalWeight) * text.length)
    chunks.push(text.slice(consumed, target))
    consumed = target
  }

  return chunks
}

function findFirstFlexibleMatchRange(
  sourceText: string,
  originalText: string,
): MatchRange | null {
  for (const pattern of buildFlexiblePatterns(originalText)) {
    const match = pattern.exec(sourceText)
    if (!match || typeof match.index !== 'number') continue
    const matchedValue = match[0] ?? ''
    if (!matchedValue) continue
    return { start: match.index, end: match.index + matchedValue.length }
  }

  return null
}

function replaceRangeInParagraphRuns(
  segments: TextNodeSegment[],
  matchRange: MatchRange,
  recommendedText: string,
): boolean {
  const firstIndex = segments.findIndex(
    (segment) => matchRange.start >= segment.start && matchRange.start < segment.end,
  )
  const lastIndex = segments.findIndex(
    (segment) => matchRange.end > segment.start && matchRange.end <= segment.end,
  )
  if (firstIndex === -1 || lastIndex === -1) return false

  const first = segments[firstIndex]
  const last = segments[lastIndex]
  const prefix = first.text.slice(0, matchRange.start - first.start)
  const suffix = last.text.slice(matchRange.end - last.start)

  const matchedSegments = segments.slice(firstIndex, lastIndex + 1)
  const matchedLengths = matchedSegments.map((segment) => {
    const startInSegment = Math.max(0, matchRange.start - segment.start)
    const endInSegment = Math.min(segment.text.length, matchRange.end - segment.start)
    return Math.max(0, endInSegment - startInSegment)
  })
  const replacementChunks = splitTextByWeights(recommendedText, matchedLengths)

  for (let offset = 0; offset < matchedSegments.length; offset += 1) {
    const segment = matchedSegments[offset]
    const replacementChunk = replacementChunks[offset] ?? ''
    const isFirst = offset === 0
    const isLast = offset === matchedSegments.length - 1
    const nextText = `${isFirst ? prefix : ''}${replacementChunk}${isLast ? suffix : ''}`
    setNodeTextPreservingWhitespace(segment.node, nextText)
  }

  return true
}

function replaceFirstInParagraphRuns(
  parsed: XMLDocument,
  originalText: string,
  recommendedText: string,
): boolean {
  const paragraphs = Array.from(parsed.getElementsByTagName('w:p'))

  for (const paragraph of paragraphs) {
    const textNodes = Array.from(paragraph.getElementsByTagName('w:t'))
    if (textNodes.length === 0) continue

    const segments: TextNodeSegment[] = []
    let cursor = 0
    for (const node of textNodes) {
      const text = node.textContent ?? ''
      const start = cursor
      cursor += text.length
      segments.push({ node, start, end: cursor, text })
    }

    const paragraphText = segments.map((segment) => segment.text).join('')
    if (!paragraphText.trim()) continue

    const matchRange = findFirstFlexibleMatchRange(
      paragraphText,
      originalText,
    )
    if (!matchRange) continue

    const replaced = replaceRangeInParagraphRuns(
      segments,
      matchRange,
      recommendedText,
    )
    if (replaced) return true
  }

  return false
}

function replaceFirstInTextNodes(
  parsed: XMLDocument,
  originalText: string,
  recommendedText: string,
): boolean {
  const nodeList = Array.from(parsed.getElementsByTagName('w:t'))

  for (const node of nodeList) {
    const currentText = node.textContent ?? ''
    if (!currentText.trim()) continue

    const { updatedText, replaced } = replaceFirstFlexible(
      currentText,
      originalText,
      recommendedText,
    )
    if (!replaced) continue

    setNodeTextPreservingWhitespace(node, updatedText)
    return true
  }

  return false
}

export async function applyRecommendationsInDocx({
  sourceFile,
  findingsToApply,
}: {
  sourceFile: File
  findingsToApply: QualityFinding[]
}): Promise<{ blob: Blob; appliedCount: number; unmatchedCount: number }> {
  const sourceBuffer = await sourceFile.arrayBuffer()
  const zip = await JSZip.loadAsync(sourceBuffer)
  const xmlFilePaths = Object.keys(zip.files).filter((path) =>
    editableDocxXmlPattern.test(path),
  )

  let appliedCount = 0
  const { findings: prioritizedFindings, skippedOverlaps } =
    dedupeAndPrioritizeFindings(findingsToApply)
  const remainingFindings = [...prioritizedFindings]

  for (const filePath of xmlFilePaths) {
    const xmlContent = await zip.file(filePath)?.async('string')
    if (!xmlContent) continue

    const parser = new DOMParser()
    const parsed = parser.parseFromString(xmlContent, 'application/xml')

    for (let index = 0; index < remainingFindings.length; ) {
      const finding = remainingFindings[index]
      const replacedInParagraph = replaceFirstInParagraphRuns(
        parsed,
        finding.originalText,
        finding.recommendedText,
      )
      const replaced =
        replacedInParagraph ||
        replaceFirstInTextNodes(
          parsed,
          finding.originalText,
          finding.recommendedText,
        )

      if (!replaced) {
        index += 1
        continue
      }

      appliedCount += 1
      remainingFindings.splice(index, 1)
    }

    const serializedXml = new XMLSerializer().serializeToString(parsed)
    if (serializedXml !== xmlContent) {
      zip.file(filePath, serializedXml)
    }

    if (remainingFindings.length === 0) break
  }

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

  return {
    blob,
    appliedCount,
    unmatchedCount: remainingFindings.length + skippedOverlaps,
  }
}
