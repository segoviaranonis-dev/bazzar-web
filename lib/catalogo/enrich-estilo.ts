/**
 * Estilo en catálogo: v_stock_web suele traer OTROS / vacío (ALM ciego).
 * Ley siamese (paridad auditoría 2.5.1.6.1 / Depósito Web):
 *   LR.grupo_estilo → linea.grupo_estilo → PE · rechaza OTROS / SIN ESTILO.
 */
import pg from 'pg'
import { createAdminClient } from '@/lib/supabase/admin'
import type { StockWebItem } from '@/types/bazzar'

const ESTILO_PLACEHOLDER = new Set(['OTROS', '(SIN ESTILO)', 'SIN ESTILO'])

export function isEstiloPlaceholder(nom: string | null | undefined): boolean {
  const t = String(nom ?? '').trim()
  if (!t) return true
  return ESTILO_PLACEHOLDER.has(t.toUpperCase())
}

function needsEstilo(r: StockWebItem): boolean {
  return isEstiloPlaceholder(r.descp_grupo_estilo)
}

function packOk(id: number | null, nombre: string): { id: number | null; nombre: string } | null {
  const nom = String(nombre ?? '').trim()
  if (!nom || isEstiloPlaceholder(nom)) return null
  return { id, nombre: nom }
}

/** Completa estilo cuando la vista viene ciega o en OTROS. */
export async function enrichEstiloDesdeLineaReferencia(
  rows: StockWebItem[],
): Promise<StockWebItem[]> {
  if (rows.length === 0) return rows
  const faltantes = rows.filter(needsEstilo)
  if (faltantes.length === 0) return rows

  const lineaIds = Array.from(
    new Set(faltantes.map((r) => Number(r.linea_id)).filter((id) => id > 0)),
  )
  if (lineaIds.length === 0) return rows

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('linea_referencia')
    .select(
      'linea_id, referencia_id, grupo_estilo_id, descp_grupo_estilo, grupo_estilo_v2(descp_grupo_estilo)',
    )
    .in('linea_id', lineaIds)

  if (error) {
    console.error('[enrich-estilo]', error.message)
  }

  const byLr = new Map<string, { id: number | null; nombre: string }>()
  const byLinea = new Map<number, { id: number | null; nombre: string }>()
  for (const e of data ?? []) {
    const ge = e.grupo_estilo_v2 as { descp_grupo_estilo?: string } | null
    const pack = packOk(
      e.grupo_estilo_id != null && Number(e.grupo_estilo_id) > 0
        ? Number(e.grupo_estilo_id)
        : null,
      String(ge?.descp_grupo_estilo ?? e.descp_grupo_estilo ?? ''),
    )
    if (!pack) continue
    byLr.set(`${Number(e.linea_id)}|${Number(e.referencia_id)}`, pack)
    if (!byLinea.has(Number(e.linea_id))) byLinea.set(Number(e.linea_id), pack)
  }

  // Fallback PE (misma ley que Report estadistica / deposito-web)
  const peByKey = new Map<string, { id: number | null; nombre: string }>()
  const url = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim()
  const stillNeed = faltantes.filter((r) => {
    const hit =
      byLr.get(`${Number(r.linea_id)}|${Number(r.referencia_id)}`) ??
      byLinea.get(Number(r.linea_id))
    return !hit
  })
  if (url && stillNeed.length > 0) {
    const pairs = Array.from(
      new Set(
        stillNeed.map(
          (r) =>
            `${String(r.linea_codigo ?? '').trim()}|${String(r.referencia_codigo ?? '').trim()}`,
        ),
      ),
    ).filter((k) => k !== '|')
    if (pairs.length > 0) {
      const client = new pg.Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
      })
      try {
        await client.connect()
        const { rows: peRows } = await client.query<{
          linea_codigo: string
          referencia_codigo: string
          pe_estilo: string
          pe_grupo_estilo_id: number | null
        }>(
          `
          SELECT DISTINCT ON (pe.linea_codigo::text, pe.referencia_codigo::text)
            pe.linea_codigo::text AS linea_codigo,
            pe.referencia_codigo::text AS referencia_codigo,
            btrim(pe.descp_grupo_estilo::text) AS pe_estilo,
            pe.grupo_estilo_id AS pe_grupo_estilo_id
          FROM v_stock_pe_rimec pe
          WHERE (pe.linea_codigo::text || '|' || pe.referencia_codigo::text) = ANY($1::text[])
            AND NULLIF(btrim(pe.descp_grupo_estilo::text), '') IS NOT NULL
            AND upper(btrim(pe.descp_grupo_estilo::text))
              NOT IN ('OTROS', '(SIN ESTILO)', 'SIN ESTILO')
          ORDER BY
            pe.linea_codigo::text,
            pe.referencia_codigo::text,
            CASE WHEN pe.grupo_estilo_id IS NOT NULL THEN 0 ELSE 1 END,
            pe.descp_grupo_estilo
          `,
          [pairs],
        )
        for (const p of peRows) {
          const pack = packOk(
            p.pe_grupo_estilo_id != null ? Number(p.pe_grupo_estilo_id) : null,
            p.pe_estilo,
          )
          if (pack) {
            peByKey.set(`${p.linea_codigo}|${p.referencia_codigo}`, pack)
          }
        }
      } catch (e) {
        console.error('[enrich-estilo PE]', e instanceof Error ? e.message : e)
      } finally {
        await client.end().catch(() => undefined)
      }
    }
  }

  // Estilo en linea (pilar) vía Supabase — si LR no trajo
  const lineaIdsSin = Array.from(
    new Set(
      faltantes
        .filter((r) => {
          const k = `${Number(r.linea_id)}|${Number(r.referencia_id)}`
          return !byLr.has(k) && !byLinea.has(Number(r.linea_id))
        })
        .map((r) => Number(r.linea_id))
        .filter((id) => id > 0),
    ),
  )
  if (lineaIdsSin.length > 0) {
    const { data: lineas, error: errL } = await supabase
      .from('linea')
      .select('id, grupo_estilo_id, grupo_estilo_v2(descp_grupo_estilo)')
      .in('id', lineaIdsSin)
    if (errL) {
      console.error('[enrich-estilo linea]', errL.message)
    } else {
      for (const l of lineas ?? []) {
        const ge = l.grupo_estilo_v2 as { descp_grupo_estilo?: string } | null
        const pack = packOk(
          l.grupo_estilo_id != null && Number(l.grupo_estilo_id) > 0
            ? Number(l.grupo_estilo_id)
            : null,
          String(ge?.descp_grupo_estilo ?? ''),
        )
        if (pack) byLinea.set(Number(l.id), pack)
      }
    }
  }

  return rows.map((r) => {
    if (!needsEstilo(r)) return r
    const hit =
      byLr.get(`${Number(r.linea_id)}|${Number(r.referencia_id)}`) ??
      byLinea.get(Number(r.linea_id)) ??
      peByKey.get(
        `${String(r.linea_codigo ?? '').trim()}|${String(r.referencia_codigo ?? '').trim()}`,
      )
    if (!hit) return r
    return {
      ...r,
      descp_grupo_estilo: hit.nombre,
      grupo_estilo_id: hit.id ?? r.grupo_estilo_id,
    }
  })
}
