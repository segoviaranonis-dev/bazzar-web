import { createClient } from '@/lib/supabase/server'
import type { PedidoWeb } from '@/types/bazzar'

export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: pedidos } = await supabase
    .from('pedido_web').select('*')
    .order('created_at', { ascending: false }).limit(50)

  const all = pedidos ?? []
  const pendientes = all.filter((p: PedidoWeb) => p.estado === 'PENDIENTE').length
  const confirmados = all.filter((p: PedidoWeb) => p.estado === 'CONFIRMADO').length

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pedidos</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Pendientes" value={pendientes} color="amber" />
        <Stat label="Total" value={all.length} color="blue" />
        <Stat label="Confirmados" value={confirmados} color="green" />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['#', 'Cliente', 'Total', 'Estado', 'Fecha'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-gray-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {all.map((p: PedidoWeb) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-400">#{p.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.cliente_nombre}</p>
                  <p className="text-gray-400 text-xs">{p.cliente_email}</p>
                </td>
                <td className="px-4 py-3 font-semibold">Gs. {new Intl.NumberFormat('es-PY').format(p.total)}</td>
                <td className="px-4 py-3"><Badge estado={p.estado} /></td>
                <td className="px-4 py-3 text-gray-400">{new Date(p.created_at).toLocaleDateString('es-PY')}</td>
              </tr>
            ))}
            {all.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Sin pedidos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  const c: Record<string, string> = { amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', green: 'bg-green-50 text-green-700' }
  return (
    <div className={`rounded-2xl p-5 ${c[color]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm mt-1 opacity-75">{label}</p>
    </div>
  )
}

function Badge({ estado }: { estado: string }) {
  const m: Record<string, string> = { PENDIENTE: 'bg-amber-100 text-amber-800', CONFIRMADO: 'bg-green-100 text-green-700', RECHAZADO: 'bg-red-100 text-red-700', ENTREGADO: 'bg-gray-100 text-gray-700' }
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${m[estado] ?? ''}`}>{estado}</span>
}
