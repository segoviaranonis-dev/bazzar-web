'use client'

import {
  createContext, useContext, useEffect, useState, useCallback, ReactNode,
} from 'react'

export interface CartItem {
  key: string            // linea_id-referencia_id-id_material_f9-id_color_f9-talla
  combinacion_id: number
  stock_web: number
  linea_id: number
  linea_codigo: string
  referencia_id: number
  referencia_codigo: string
  referencia_descripcion: string
  marca: string
  material_descripcion: string
  color_nombre: string
  talla_codigo: string
  imagen_url: string
  precio_web: number | null
  cantidad: number
}

interface CartContextValue {
  items: CartItem[]
  total: number
  count: number
  open: boolean
  setOpen: (v: boolean) => void
  addItem: (item: Omit<CartItem, 'cantidad'>) => void
  removeItem: (key: string) => void
  updateQty: (key: string, delta: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)
const STORAGE_KEY = 'bazzar_cart_v1'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)

  // Cargar desde localStorage al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  // Persistir cada cambio
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'cantidad'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.key === item.key)
      if (existing) {
        if (existing.cantidad >= existing.stock_web) return prev // ya en el máximo
        return prev.map(i => i.key === item.key ? { ...i, cantidad: i.cantidad + 1 } : i)
      }
      if (item.stock_web <= 0) return prev // sin stock
      return [...prev, { ...item, cantidad: 1 }]
    })
    // NO auto-abrir el drawer — el feedback visual está en la card (checkmark naranja)
  }, [])

  const removeItem = useCallback((key: string) => {
    setItems(prev => prev.filter(i => i.key !== key))
  }, [])

  const updateQty = useCallback((key: string, delta: number) => {
    setItems(prev => prev
      .map(i => {
        if (i.key !== key) return i
        const next = i.cantidad + delta
        if (next > i.stock_web) return i // no exceder stock disponible
        return { ...i, cantidad: next }
      })
      .filter(i => i.cantidad > 0)
    )
  }, [])

  const clear = useCallback(() => setItems([]), [])

  const total = items.reduce((s, i) => s + (i.precio_web ?? 0) * i.cantidad, 0)
  const count = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider value={{ items, total, count, open, setOpen, addItem, removeItem, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be inside CartProvider')
  return ctx
}
