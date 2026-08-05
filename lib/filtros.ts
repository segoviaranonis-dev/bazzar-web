import type { SupabaseClient } from '@supabase/supabase-js'
import { soloVendibleCatalogo } from '@/lib/catalogo-vendible'

export interface SectionData {
  label:   string
  lineas:  number[]
  marcas:  string[]
  estilos: string[]
  tipos:   string[]
}

export interface HeaderData {
  mujeres: SectionData
  ninas:   SectionData
  ninos:   SectionData
  hombres: SectionData
}

export async function getFiltros(supabase: SupabaseClient) {
  // Paso 1: Obtener todos los productos con stock — claves numéricas (linea_id, genero_id, grupo_estilo_id).
  const { data: stockData } = await soloVendibleCatalogo(
    supabase.from('v_stock_web').select('linea_id, marca, genero_id, descp_genero, grupo_estilo_id, descp_grupo_estilo'),
  )

  if (!stockData) return null

  const lineaIds = Array.from(new Set(stockData.map(item => item.linea_id)))

  // Paso 2: Obtener metadata desde tabla linea (marca y género desde maestros).
  const { data: lineasData } = await supabase
    .from('linea')
    .select('id, codigo_proveedor, genero_id, marca_id, genero(codigo, descripcion), marca_v2(descp_marca)')
    .in('id', lineaIds)
    .not('genero_id', 'is', null)

  const lineaMetaMap = new Map<number, any>()
  for (const item of lineasData ?? []) {
    const genObj = item.genero as any
    const marcaObj = item.marca_v2 as any

    lineaMetaMap.set(Number(item.id), {
      linea_id: Number(item.id),
      linea_codigo: String(item.codigo_proveedor),
      genero_id: Number(item.genero_id),
      genero_codigo: genObj?.codigo,
      descp_genero: genObj?.descripcion,
      descp_marca: marcaObj?.descp_marca,
    })
  }

  // Paso 3: Estilos / tipos desde linea_referencia (FK a grupo_estilo_v2 y tipo_1).
  const { data: estilosData } = await supabase
    .from('linea_referencia')
    .select('linea_id, grupo_estilo_id, tipo_1_id, descp_grupo_estilo, descp_tipo_1, grupo_estilo_v2(descp_grupo_estilo), tipo_1(descp_tipo_1)')
    .in('linea_id', lineaIds)
    .not('grupo_estilo_id', 'is', null)

  const estiloMap = new Map<number, { estilos: Set<string>; tipos: Set<string> }>()
  for (const e of estilosData ?? []) {
    if (!estiloMap.has(e.linea_id)) estiloMap.set(e.linea_id, { estilos: new Set(), tipos: new Set() })

    const grupoEstiloObj = e.grupo_estilo_v2 as any
    const tipo1Obj = e.tipo_1 as any
    const descp_estilo = grupoEstiloObj?.descp_grupo_estilo ?? e.descp_grupo_estilo
    if (descp_estilo) estiloMap.get(e.linea_id)!.estilos.add(descp_estilo)

    const descp_tipo_1 = tipo1Obj?.descp_tipo_1 ?? e.descp_tipo_1
    if (descp_tipo_1) estiloMap.get(e.linea_id)!.tipos.add(descp_tipo_1)
  }

  // Agrupar por género (texto canónico desde maestro)
  const init = () => ({ label: '', lineas: new Set<number>(), marcas: new Set<string>(), estilos: new Set<string>(), tipos: new Set<string>() })
  const mujeres = init()
  const ninas = init()
  const ninos = init()
  const hombres = init()

  const todasMarcas = new Set<string>()
  const todosEstilos = new Set<string>()
  const todosTipos = new Set<string>()

  // Mapas para filtrado por FK: texto → linea_ids que lo contienen
  const marcaToLineas = new Map<string, Set<number>>()
  const estiloToLineas = new Map<string, Set<number>>()
  const tipoToLineas = new Map<string, Set<number>>()

  for (const item of stockData) {
    const lineaId = Number(item.linea_id)
    const meta = lineaMetaMap.get(lineaId)
    const generoCodigo = meta?.genero_codigo
    const descpMarca = meta?.descp_marca ?? item.marca

    if (!generoCodigo) continue

    const processSection = (section: any) => {
      section.lineas.add(lineaId)
      if (descpMarca) {
        section.marcas.add(descpMarca)
        todasMarcas.add(descpMarca)
        if (!marcaToLineas.has(descpMarca)) marcaToLineas.set(descpMarca, new Set())
        marcaToLineas.get(descpMarca)!.add(lineaId)
      }
      if (estiloMap.has(lineaId)) {
        const rel = estiloMap.get(lineaId)!
        rel.estilos.forEach(e => {
          section.estilos.add(e)
          todosEstilos.add(e)
          if (!estiloToLineas.has(e)) estiloToLineas.set(e, new Set())
          estiloToLineas.get(e)!.add(lineaId)
        })
        rel.tipos.forEach(t => {
          section.tipos.add(t)
          todosTipos.add(t)
          if (!tipoToLineas.has(t)) tipoToLineas.set(t, new Set())
          tipoToLineas.get(t)!.add(lineaId)
        })
      }
    }

    if (generoCodigo === 'DAMAS') {
      processSection(mujeres)
      if (!mujeres.label) mujeres.label = meta?.descp_genero || 'Damas'
    } else if (generoCodigo === 'NINAS' || generoCodigo === 'NIÑAS') {
      processSection(ninas)
      if (!ninas.label) ninas.label = meta?.descp_genero || 'Niñas'
    } else if (generoCodigo === 'NINOS' || generoCodigo === 'NIÑOS') {
      processSection(ninos)
      if (!ninos.label) ninos.label = meta?.descp_genero || 'Niños'
    } else if (generoCodigo === 'CABALLEROS') {
      processSection(hombres)
      if (!hombres.label) hombres.label = meta?.descp_genero || 'Caballeros'
    }
  }

  const formatSection = (s: any): SectionData => ({
    label:   s.label,
    lineas:  Array.from(s.lineas).sort() as number[],
    marcas:  Array.from(s.marcas).sort() as string[],
    estilos: Array.from(s.estilos).sort() as string[],
    tipos:   Array.from(s.tipos).sort() as string[]
  })

  const marcaLineasMap: Record<string, number[]> = {}
  marcaToLineas.forEach((lineas, marca) => {
    marcaLineasMap[marca] = Array.from(lineas)
  })

  const estiloLineasMap: Record<string, number[]> = {}
  estiloToLineas.forEach((lineas, estilo) => {
    estiloLineasMap[estilo] = Array.from(lineas)
  })

  const tipoLineasMap: Record<string, number[]> = {}
  tipoToLineas.forEach((lineas, tipo) => {
    tipoLineasMap[tipo] = Array.from(lineas)
  })

  return {
    header: {
      mujeres: formatSection(mujeres),
      ninas:   formatSection(ninas),
      ninos:   formatSection(ninos),
      hombres: formatSection(hombres)
    },
    todasLineas:  Array.from(lineaIds).sort((a, b) => a - b),
    todasMarcas:  Array.from(todasMarcas).sort(),
    todosEstilos: Array.from(todosEstilos).sort(),
    todosTipos:   Array.from(todosTipos).sort(),
    // Mapas texto → linea_id (bigint)
    marcaLineasMap,
    estiloLineasMap,
    tipoLineasMap
  }
}
