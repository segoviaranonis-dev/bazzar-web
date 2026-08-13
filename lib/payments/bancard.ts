/**
 * Corredor Bancard VPOS 2.0 — Single Buy (pago ocasional) · kit oficial v1.23
 *
 * PCI: NUNCA capturar PAN/CVV en Nexus. Monto solo desde pedido_web (servidor).
 * Iframe hospedado Bancard (`bancard-checkout-*.js`).
 *
 * Credenciales: BANCARD_PUBLIC_KEY · BANCARD_PRIVATE_KEY · BANCARD_COMMERCE_CODE
 * (commerce code se registra en portal; API usa public/private).
 *
 * Documentación: docs/bancard-laura-20260812/eCommerce_bancard_compra_simple_version_1.23.1.pdf
 */

import { createHash } from 'crypto'

export type BancardEnv = 'sandbox' | 'production'

export interface BancardConfig {
  publicKey: string
  privateKey: string
  commerceCode: string
  env: BancardEnv
  vposBase: string
}

export const BANCARD_SECURITY_CONTRACT = {
  pci: 'iframe_hosted_vpos' as const,
  card_data_in_nexus: false,
  amount_source: 'pedido_web.total' as const,
  currency: 'PYG' as const,
  confirm_path: '/api/payments/bancard/callback',
  requires: [
    'BANCARD_PUBLIC_KEY',
    'BANCARD_PRIVATE_KEY',
    'BANCARD_COMMERCE_CODE',
  ] as const,
} as const

const VPOS_DEFAULT: Record<BancardEnv, string> = {
  sandbox: 'https://vpos.infonet.com.py:8888',
  production: 'https://vpos.infonet.com.py',
}

/** Script iframe oficial (PDF § Invocar iframe). */
export function bancardCheckoutScriptUrl(env: BancardEnv): string {
  const base = VPOS_DEFAULT[env]
  return `${base}/checkout/javascript/dist/bancard-checkout-4.0.0.js`
}

export function getBancardConfig(): BancardConfig | null {
  const publicKey = process.env.BANCARD_PUBLIC_KEY?.trim()
  const privateKey = process.env.BANCARD_PRIVATE_KEY?.trim()
  const commerceCode = process.env.BANCARD_COMMERCE_CODE?.trim()
  const envRaw = (process.env.BANCARD_ENV ?? 'sandbox').toLowerCase()
  const env: BancardEnv = envRaw === 'production' ? 'production' : 'sandbox'

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

/** shop_process_id = id pedido (entero ≤15 dígitos). */
export function shopProcessIdForPedido(pedidoId: number): number {
  return Math.trunc(pedidoId)
}

/**
 * Importe Bancard: siempre string con 2 decimales y punto.
 * Ej. Gs. 682000 → "682000.00"
 */
export function formatBancardAmount(gs: number): string {
  const n = Math.round(Number(gs))
  if (!Number.isFinite(n) || n <= 0) throw new Error('Monto Bancard inválido')
  return `${n}.00`
}

/** MD5 hex 32 chars — orden exacto del PDF. */
export function signBancardToken(parts: string[]): string {
  return createHash('md5').update(parts.join(''), 'utf8').digest('hex')
}

export function tokenSingleBuy(
  privateKey: string,
  shopProcessId: number | string,
  amountFormatted: string,
  currency = 'PYG',
): string {
  return signBancardToken([
    privateKey,
    String(shopProcessId),
    amountFormatted,
    currency,
  ])
}

/** Confirmación entrante VPOS → comercio. */
export function tokenSingleBuyConfirm(
  privateKey: string,
  shopProcessId: number | string,
  amountFormatted: string,
  currency = 'PYG',
): string {
  return signBancardToken([
    privateKey,
    String(shopProcessId),
    'confirm',
    amountFormatted,
    currency,
  ])
}

export function tokenGetConfirmation(
  privateKey: string,
  shopProcessId: number | string,
): string {
  return signBancardToken([
    privateKey,
    String(shopProcessId),
    'get_confirmation',
  ])
}

export function tokenRollback(privateKey: string, shopProcessId: number | string): string {
  return signBancardToken([
    privateKey,
    String(shopProcessId),
    'rollback',
    '0.00',
  ])
}

export type BancardInitOk = {
  status: 'IFRAME'
  process_id: string
  shop_process_id: number
  env: BancardEnv
  checkoutScriptUrl: string
  amount: string
  currency: 'PYG'
}

export type BancardInitFail = {
  status: 'ERROR'
  error: string
  shop_process_id: number
  security: typeof BANCARD_SECURITY_CONTRACT
}

/**
 * POST /vpos/api/0.3/single_buy → process_id para iframe.
 */
export async function createBancardPayment(params: {
  amount: number
  pedidoId: number
  description: string
  returnUrl: string
  cancelUrl: string
}): Promise<BancardInitOk | BancardInitFail> {
  const shop_process_id = shopProcessIdForPedido(params.pedidoId)
  const config = getBancardConfig()
  if (!config) {
    return {
      status: 'ERROR',
      error: 'Bancard no configurado (faltan BANCARD_*).',
      shop_process_id,
      security: BANCARD_SECURITY_CONTRACT,
    }
  }

  let amountStr: string
  try {
    amountStr = formatBancardAmount(params.amount)
  } catch {
    return {
      status: 'ERROR',
      error: 'Monto inválido para pasarela.',
      shop_process_id,
      security: BANCARD_SECURITY_CONTRACT,
    }
  }

  const description = String(params.description ?? `Pedido #${params.pedidoId}`)
    .slice(0, 20)
    .trim() || `Pedido #${params.pedidoId}`.slice(0, 20)

  const token = tokenSingleBuy(
    config.privateKey,
    shop_process_id,
    amountStr,
    'PYG',
  )

  const body = {
    public_key: config.publicKey,
    operation: {
      token,
      shop_process_id,
      amount: amountStr,
      currency: 'PYG',
      additional_data: '',
      description,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
  }

  const url = `${config.vposBase.replace(/\/$/, '')}/vpos/api/0.3/single_buy`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    })
  } catch (e) {
    console.error('[bancard] single_buy network', e)
    return {
      status: 'ERROR',
      error: 'No se pudo contactar VPOS Bancard. Reintentá.',
      shop_process_id,
      security: BANCARD_SECURITY_CONTRACT,
    }
  }

  const raw = (await res.json().catch(() => null)) as {
    status?: string
    process_id?: string
    messages?: unknown
    message?: string
  } | null

  if (!res.ok || !raw || String(raw.status).toLowerCase() !== 'success' || !raw.process_id) {
    console.error('[bancard] single_buy fail', res.status, raw)
    return {
      status: 'ERROR',
      error:
        (typeof raw?.message === 'string' && raw.message) ||
        `VPOS rechazó single_buy (${res.status}). Revisá keys / monto / shop_process_id.`,
      shop_process_id,
      security: BANCARD_SECURITY_CONTRACT,
    }
  }

  return {
    status: 'IFRAME',
    process_id: String(raw.process_id),
    shop_process_id,
    env: config.env,
    checkoutScriptUrl: bancardCheckoutScriptUrl(config.env),
    amount: amountStr,
    currency: 'PYG',
  }
}

export type BancardConfirmPayload = {
  operation?: {
    token?: string
    shop_process_id?: string | number
    response?: string
    response_details?: string
    amount?: string | number
    iva_amount?: string | number
    currency?: string
    authorization_number?: string
    ticket_number?: string | number
    response_code?: string
    response_description?: string
    extended_response_description?: string
    security_information?: Record<string, unknown>
  }
}

/** Valida token confirm y si la transacción fue aprobada (response S + code 00). */
export function parseAndVerifyConfirm(
  payload: BancardConfirmPayload,
  privateKey: string,
): {
  ok: boolean
  approved: boolean
  shopProcessId: number | null
  amountGs: number | null
  error?: string
  operation?: NonNullable<BancardConfirmPayload['operation']>
} {
  const op = payload?.operation
  if (!op?.token || op.shop_process_id == null) {
    return { ok: false, approved: false, shopProcessId: null, amountGs: null, error: 'Payload incompleto' }
  }

  const shopProcessId = Number(op.shop_process_id)
  if (!Number.isFinite(shopProcessId) || shopProcessId <= 0) {
    return { ok: false, approved: false, shopProcessId: null, amountGs: null, error: 'shop_process_id inválido' }
  }

  const amountRaw = op.amount
  const amountStr =
    typeof amountRaw === 'number'
      ? formatBancardAmount(amountRaw)
      : String(amountRaw ?? '').trim()
  if (!/^\d+\.\d{2}$/.test(amountStr)) {
    return {
      ok: false,
      approved: false,
      shopProcessId,
      amountGs: null,
      error: 'amount inválido en confirm',
    }
  }

  const currency = String(op.currency ?? 'PYG').trim() || 'PYG'
  const expected = tokenSingleBuyConfirm(privateKey, shopProcessId, amountStr, currency)
  if (expected.toLowerCase() !== String(op.token).toLowerCase()) {
    return {
      ok: false,
      approved: false,
      shopProcessId,
      amountGs: null,
      error: 'Token confirm inválido',
    }
  }

  const amountGs = Math.round(parseFloat(amountStr))
  const approved =
    String(op.response).toUpperCase() === 'S' &&
    String(op.response_code ?? '') === '00'

  return { ok: true, approved, shopProcessId, amountGs, operation: op }
}

/**
 * Consulta estado en VPOS (si no llegó confirm a tiempo).
 * POST …/single_buy/confirmations
 */
export async function getSingleBuyConfirmation(
  shopProcessId: number,
): Promise<{
  ok: boolean
  approved: boolean
  raw?: unknown
  error?: string
}> {
  const config = getBancardConfig()
  if (!config) return { ok: false, approved: false, error: 'Sin config' }

  const token = tokenGetConfirmation(config.privateKey, shopProcessId)
  const url = `${config.vposBase.replace(/\/$/, '')}/vpos/api/0.3/single_buy/confirmations`
  // Algunos kits usan get_confirmation path; el PDF lista get_single_buy_confirmation.
  // Probamos el path documentado en varias integraciones PY:
  const candidates = [
    url,
    `${config.vposBase.replace(/\/$/, '')}/vpos/api/0.3/single_buy/get_confirmation`,
  ]

  const body = {
    public_key: config.publicKey,
    operation: {
      token,
      shop_process_id: shopProcessId,
    },
  }

  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      })
      const raw = await res.json().catch(() => null)
      if (!res.ok || !raw) continue
      const op = (raw as { operation?: { response?: string; response_code?: string } })
        .operation
      const approved =
        String(op?.response ?? '').toUpperCase() === 'S' &&
        String(op?.response_code ?? '') === '00'
      return { ok: true, approved, raw }
    } catch {
      /* try next */
    }
  }
  return { ok: false, approved: false, error: 'No se pudo consultar confirmación VPOS' }
}
