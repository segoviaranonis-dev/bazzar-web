/** Feedback inmediato al volver a portada. */
export default function InicioLoading() {
  return (
    <div className="animate-pulse space-y-8" aria-busy="true" aria-label="Cargando inicio">
      <div className="w-full rounded-none bg-slate-200" style={{ aspectRatio: '21/9', minHeight: 280 }} />
      <div className="h-8 w-56 rounded bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 rounded-2xl bg-slate-100" />
        ))}
      </div>
    </div>
  )
}
