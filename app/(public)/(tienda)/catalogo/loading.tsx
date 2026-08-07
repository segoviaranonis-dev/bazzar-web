/** Feedback inmediato al ir a Catálogo (RSC pesado). */
export default function CatalogoLoading() {
  return (
    <div className="animate-pulse space-y-4 py-2" aria-busy="true" aria-label="Cargando catálogo">
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="h-96 rounded-xl bg-slate-100" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  )
}
