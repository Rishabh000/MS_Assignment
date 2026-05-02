import mammoth from 'mammoth/mammoth.browser'

export async function extractWordText(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new Error('Only .docx files are supported for AI quality checks.')
  }

  const arrayBuffer = await file.arrayBuffer()
  const { value } = await mammoth.extractRawText({ arrayBuffer })
  const normalizedText = value.replace(/\r/g, '').trim()

  if (!normalizedText) {
    throw new Error('The uploaded document appears to be empty.')
  }

  return normalizedText
}
