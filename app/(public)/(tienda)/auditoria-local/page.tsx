import { notFound } from 'next/navigation'
import { isAuditoriaLocalEnabled } from '@/lib/auditoria-local/enabled'
import { AuditoriaLocalClient } from './AuditoriaLocalClient'

export const dynamic = 'force-dynamic'

/** SOLO local :3002 — no desplegar a Vercel prod */
export default function AuditoriaLocalPage() {
  if (!isAuditoriaLocalEnabled()) notFound()
  return <AuditoriaLocalClient />
}
