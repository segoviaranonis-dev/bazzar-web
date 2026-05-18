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
    <div className="fixed bottom-6 left-6 z-50 max-w-[300px] bg-white border border-gray-200 shadow-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-widest mb-2 text-black">Cookies</p>
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        Usamos cookies para mejorar tu experiencia de navegación y analizar el tráfico del sitio.
      </p>
      <div className="flex gap-3">
        <button
          onClick={accept}
          className="flex-1 bg-black text-white text-xs font-semibold uppercase tracking-wider py-2.5 hover:bg-gray-800 transition-colors"
        >
          Aceptar
        </button>
        <button
          onClick={configure}
          className="flex-1 border border-gray-200 text-gray-800 text-xs font-semibold uppercase tracking-wider py-2.5 hover:border-gray-800 transition-colors"
        >
          Configurar
        </button>
      </div>
    </div>
  )
}
