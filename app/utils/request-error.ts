export function requestErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null || !('data' in error))
    return fallback
  const data = error.data
  if (typeof data === 'object' && data !== null && 'statusMessage' in data && typeof data.statusMessage === 'string')
    return data.statusMessage
  return fallback
}
