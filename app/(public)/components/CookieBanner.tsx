'use client'

import { useState, useEffect } from 'react'

const COOKIE_KEY = 'bz_cookies_accepted'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) setVisible(true)
  }, [])

  const accept = () => { localStorage.setItem(COOKIE_KEY, '1'); setVisible(false) }
  const configure = () => { localStorage.setItem(COOKIE_KEY, 'config'); setVisible(false) }

  if (!visible) return null

  return (
    <div className="safe-bottom fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-[340px] rounded-xl border border-gray-200 bg-white p-5 shadow-xl sm:left-6 sm:right-auto sm:max-w-[300px]">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-black">Cookies</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        Usamos cookies para mejorar tu experiencia de navegación y analizar el tráfico del sitio.
      </p>
      <div className="flex gap-3">
        <button
          onClick={accept}
          className="min-h-11 flex-1 bg-black text-white text-xs font-semibold uppercase tracking-wider py-3 hover:bg-gray-800 transition-colors"
        >
          Aceptar
        </button>
        <button
          onClick={configure}
          className="min-h-11 flex-1 border border-gray-200 text-gray-800 text-xs font-semibold uppercase tracking-wider py-3 hover:border-gray-800 transition-colors"
        >
          Configurar
        </button>
      </div>
    </div>
  )
}
