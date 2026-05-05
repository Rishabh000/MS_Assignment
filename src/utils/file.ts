const kb = 1024
const mb = kb * 1024

export function formatFileSize(sizeInBytes: number): string {
  if (sizeInBytes >= mb) {
    return `${(sizeInBytes / mb).toFixed(1)} MB`
  }
  if (sizeInBytes >= kb) {
    return `${(sizeInBytes / kb).toFixed(1)} KB`
  }
  return `${sizeInBytes} B`
}
