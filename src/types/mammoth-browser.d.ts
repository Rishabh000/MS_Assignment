declare module 'mammoth/mammoth.browser' {
  type ExtractRawTextInput = {
    arrayBuffer: ArrayBuffer
  }

  type ExtractRawTextResult = {
    value: string
    messages: Array<{ type: string; message: string }>
  }

  const mammoth: {
    extractRawText(input: ExtractRawTextInput): Promise<ExtractRawTextResult>
  }

  export default mammoth
}
