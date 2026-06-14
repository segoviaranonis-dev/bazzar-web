/** Emails autorizados para panel /admin */
export function getAdminEmails(): string[] {
  const raw = process.env.BAZZAR_ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? ''
  return raw
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const allowed = getAdminEmails()
  if (allowed.length === 0) return true // dev: sin lista → cualquier auth user
  return allowed.includes(email.toLowerCase())
}
