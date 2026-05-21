import pg from 'pg'
const { Client } = pg

const client = new Client({
  host: 'aws-1-sa-east-1.pooler.supabase.com',
  port: 5432, database: 'postgres',
  user: 'postgres.extrlcvcgypwazxipvqm',
  password: 'IJoFJbT8Qj0Q0w5m',
  ssl: { rejectUnauthorized: false },
})

async function run() {
  await client.connect()

  // 1. Columnas reales de v_stock_web
  console.log('\n── 1. Columnas de v_stock_web ──')
  const r0 = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'v_stock_web' AND table_schema = 'public'
    ORDER BY ordinal_position
  `)
  console.table(r0.rows)

  // 2. Counts of lineas and referencias
  console.log('\n── 2. Lineas and Referencias ──')
  const linTotal = await client.query(`SELECT COUNT(*) FROM linea`)
  const linNull = await client.query(`SELECT COUNT(*) FROM linea WHERE codigo_proveedor IS NULL`)
  const refTotal = await client.query(`SELECT COUNT(*) FROM referencia`)
  const refNull = await client.query(`SELECT COUNT(*) FROM referencia WHERE codigo_proveedor IS NULL`)
  console.log(`linea: total=${linTotal.rows[0].count}, null_provider_code=${linNull.rows[0].count}`)
  console.log(`referencia: total=${refTotal.rows[0].count}, null_provider_code=${refNull.rows[0].count}`)

  // 3. Código de reservar_stock()
  console.log('\n── 3. reservar_stock() ──')
  const r2 = await client.query(`SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'reservar_stock'`)
  if (r2.rows.length) console.log(r2.rows[0].def)
  else console.log('No encontrada')

  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
