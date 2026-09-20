export async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function sendMagicLink(email: string, link: string): Promise<void> {
  console.warn(`[auth] Magic link for ${email}: ${link}`)
}
