/**
 * Integración Bancard — stub ETAPA BAZZAR-WEB-001.
 * Implementar tras recibir credenciales comerciales (ver docs/BANCARD_SOLICITUD.md).
 */

export type BancardEnv = 'sandbox' | 'production'

export interface BancardConfig {
  publicKey: string
  privateKey: string
  commerceCode: string
  env: BancardEnv
}

export function getBancardConfig(): BancardConfig | null {
  const publicKey = process.env.BANCARD_PUBLIC_KEY
  const privateKey = process.env.BANCARD_PRIVATE_KEY
  const commerceCode = process.env.BANCARD_COMMERCE_CODE
  const env = (process.env.BANCARD_ENV ?? 'sandbox') as BancardEnv

  if (!publicKey || !privateKey || !commerceCode) return null
  return { publicKey, privateKey, commerceCode, env }
}

export function isBancardEnabled(): boolean {
  return getBancardConfig() !== null
}

/** Fase 2: crear single_buy / shop_process y devolver redirect URL */
export async function createBancardPayment(_params: {
  amount: number
  pedidoId: number
  description: string
}): Promise<{ redirectUrl: string } | { error: string }> {
  if (!isBancardEnabled()) {
    return { error: 'Bancard no configurado — coordinar pago manualmente.' }
  }
  return { error: 'Integración Bancard pendiente de credenciales sandbox.' }
}
