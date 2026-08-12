/**
 * Corredor Bancard VPOS — listo para credenciales (Laura / Bancard).
 *
 * Seguridad (PCI DSS / práctica internacional e-commerce):
 * - NUNCA capturar ni persistir PAN, CVV, fecha de vencimiento en Nexus.
 * - Monto y moneda siempre desde `pedido_web` (servidor), no del browser.
 * - Redirect a página hospedada Bancard (hosted payment / single_buy).
 * - IPN/webhook con secreto + verificación de firma antes de marcar PAGADO.
 * - Separar sandbox vs production (`BANCARD_ENV`).
 * - shop_process_id idempotente por pedido.
 *
 * Stub operativo hasta `BANCARD_*` en .env — ver docs/BANCARD_SOLICITUD.md
 */

import { createHash } from 'crypto'

export type BancardEnv = 'sandbox' | 'production'

export interface BancardConfig {
  publicKey: string
  privateKey: string
  commerceCode: string
  env: BancardEnv
  /** Base VPOS (sandbox/prod). Override con BANCARD_VPOS_BASE si Bancard entrega URL distinta. */
  vposBase: string
}

/** Contrato de seguridad expuesto a UI / ops — sin secretos. */
export const BANCARD_SECURITY_CONTRACT = {
  pci: 'redirect_hosted' as const,
  card_data_in_nexus: false,
  amount_source: 'pedido_web.total' as const,
  currency: 'PYG' as const,
  ipn_path: '/api/payments/bancard/callback',
  requires: [
    'BANCARD_PUBLIC_KEY',
    'BANCARD_PRIVATE_KEY',
    'BANCARD_COMMERCE_CODE',
    'BANCARD_CALLBACK_SECRET',
  ] as const,
} as const

const VPOS_DEFAULT: Record<BancardEnv, string> = {
  sandbox: 'https://vpos.infonet.com.py:8888',
  production: 'https://vpos.infonet.com.py',
}

export function getBancardConfig(): BancardConfig | null {
  const publicKey = process.env.BANCARD_PUBLIC_KEY?.trim()
  const privateKey = process.env.BANCARD_PRIVATE_KEY?.trim()
  const commerceCode = process.env.BANCARD_COMMERCE_CODE?.trim()
  const env = (process.env.BANCARD_ENV ?? 'sandbox') as BancardEnv

  if (!publicKey || !privateKey || !commerceCode) return null

  const vposBase =
    process.env.BANCARD_VPOS_BASE?.trim() ||
    VPOS_DEFAULT[env] ||
    VPOS_DEFAULT.sandbox

  return { publicKey, privateKey, commerceCode, env, vposBase }
}

export function isBancardEnabled(): boolean {
  return getBancardConfig() !== null
}

/** shop_process_id estable por pedido (idempotencia ante reintentos). */
export function shopProcessIdForPedido(pedidoId: number): string {
  return String(pedidoId)
}

/**
 * Token típico Bancard (MD5 de concatenación private_key + campos).
 * La cadena exacta la confirma Laura en el kit oficial — hoy es plantilla.
 */
export function signBancardToken(parts: string[]): string {
  return createHash('md5').update(parts.join(''), 'utf8').digest('hex')
}

export type BancardInitOk = {
  redirectUrl: string
  shop_process_id: string
  env: BancardEnv
}

export type BancardInitStandby = {
  status: 'STANDBY'
  error: string
  security: typeof BANCARD_SECURITY_CONTRACT
  shop_process_id: string
}

/**
 * Inicia single_buy / redirect VPOS.
 * Sin credenciales → STANDBY (pedido ya en Bóveda; pago se coordina).
 * Con credenciales → POST al VPOS; URL de pago hospedado (sin tarjeta en Nexus).
 */
export async function createBancardPayment(params: {
  amount: number
  pedidoId: number
  description: string
  returnUrl?: string
  cancelUrl?: string
}): Promise<BancardInitOk | BancardInitStandby> {
  const shop_process_id = shopProcessIdForPedido(params.pedidoId)
  const amountEntero = Math.round(Number(params.amount))

  if (!Number.isFinite(amountEntero) || amountEntero <= 0) {
    return {
      status: 'STANDBY',
      error: 'Monto inválido para pasarela.',
      security: BANCARD_SECURITY_CONTRACT,
      shop_process_id,
    }
  }

  const config = getBancardConfig()
  if (!config) {
    return {
      status: 'STANDBY',
      error:
        'Bancard en espera de credenciales (Laura). Pedido registrado · sin datos de tarjeta en Bazzar.',
      security: BANCARD_SECURITY_CONTRACT,
      shop_process_id,
    }
  }

  // ── Cuando llegue el kit oficial: descomentar / ajustar firma y endpoint ──
  // const token = signBancardToken([
  //   config.privateKey,
  //   shop_process_id,
  //   String(amountEntero),
  //   'PYG',
  // ])
  // const res = await fetch(`${config.vposBase}/vpos/api/0.3/single_buy`, { ... })
  // return { redirectUrl: process_id_url, shop_process_id, env: config.env }

  void params.description
  void params.returnUrl
  void params.cancelUrl

  return {
    status: 'STANDBY',
    error:
      'Credenciales presentes · falta cablear single_buy del kit Bancard (firma exacta). Sin captura de tarjeta en Nexus.',
    security: BANCARD_SECURITY_CONTRACT,
    shop_process_id,
  }
}
