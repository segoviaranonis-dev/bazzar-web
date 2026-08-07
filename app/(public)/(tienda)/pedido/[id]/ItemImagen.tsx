'use client'

export function ItemImagen({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-contain p-1"
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}
