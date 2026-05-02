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

  return [
    new RegExp(escapeRegex(originalText), ''),
    new RegExp(whitespaceFlexible, ''),
    new RegExp(apostropheFlexible, ''),
    new RegExp(quoteFlexible, ''),
    new RegExp(dashFlexible, ''),
    new RegExp(normalizedWhitespacePattern, ''),
    ...(tokenPattern ? [tokenPattern] : []),
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

function redistributeParagraphText(
  textNodes: Element[],
  updatedParagraphText: string,
): void {
  const previousLengths = textNodes.map((node) => (node.textContent ?? '').length)
  let cursor = 0

  for (let index = 0; index < textNodes.length; index += 1) {
    const node = textNodes[index]
    const isLastNode = index === textNodes.length - 1
    const chunkLength = isLastNode
      ? updatedParagraphText.length - cursor
      : previousLengths[index]
    const safeLength = Math.max(0, chunkLength)

    node.textContent = updatedParagraphText.slice(cursor, cursor + safeLength)
    cursor += safeLength
  }
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

    const paragraphText = textNodes.map((node) => node.textContent ?? '').join('')
    if (!paragraphText.trim()) continue

    const { updatedText, replaced } = replaceFirstFlexible(
      paragraphText,
      originalText,
      recommendedText,
    )
    if (!replaced) continue

    redistributeParagraphText(textNodes, updatedText)
    return true
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

    node.textContent = updatedText
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
  const remainingFindings = [...findingsToApply]

  for (const filePath of xmlFilePaths) {
    const xmlContent = await zip.file(filePath)?.async('string')
    if (!xmlContent) continue

    const parser = new DOMParser()
    const parsed = parser.parseFromString(xmlContent, 'application/xml')

    for (let index = remainingFindings.length - 1; index >= 0; index -= 1) {
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

      if (!replaced) continue

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

  return { blob, appliedCount, unmatchedCount: remainingFindings.length }
}
