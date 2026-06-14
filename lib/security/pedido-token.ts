import { randomBytes } from 'crypto'

/** Token opaco para acceder a confirmación de pedido sin auth de usuario */
export function generatePedidoToken(): string {
  return randomBytes(32).toString('base64url')
}

export function isValidPedidoToken(token: string | null | undefined): boolean {
  if (!token || token.length < 16 || token.length > 128) return false
  return /^[A-Za-z0-9_-]+$/.test(token)
}
