/** Número WhatsApp admin sin + ni espacios (595...) */
export function adminWhatsAppNumber(): string {
  return (process.env.ADMIN_WHATSAPP ?? '').replace(/\D/g, '')
}

export function adminWhatsAppUrl(text?: string): string {
  const n = adminWhatsAppNumber()
  if (!n) return '#'
  const base = `https://wa.me/${n}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
