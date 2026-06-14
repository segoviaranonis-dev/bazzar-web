import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminEmail } from '@/lib/admin-auth'
import { AdminSignOut } from './AdminSignOut'

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')
  if (!isAdminEmail(user.email)) redirect('/admin/login?error=unauthorized')

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <p className="font-bold text-lg">Bazzar</p>
          <p className="text-xs text-gray-400 mt-0.5">Panel Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLink href="/admin" label="Pedidos" emoji="📦" />
        </nav>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
          <AdminSignOut />
        </div>
      </aside>
      <div className="ml-56"><main className="p-8">{children}</main></div>
    </div>
  )
}

function NavLink({ href, label, emoji }: { href: string; label: string; emoji: string }) {
  return (
    <Link href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm">
      <span>{emoji}</span><span>{label}</span>
    </Link>
  )
}
