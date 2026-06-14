import pg from 'pg'
const { Client } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Definí DATABASE_URL en .env.local (ver .env.example)')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

async function run() {
  await client.connect()

  console.log('\n── Columnas de v_stock_web ──')
  const r0 = await client.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'v_stock_web' AND table_schema = 'public'
    ORDER BY ordinal_position
  `)
  console.table(r0.rows)

  console.log('\n── reservar_stock() ──')
  const r2 = await client.query(
    `SELECT pg_get_functiondef(oid) AS def FROM pg_proc WHERE proname = 'reservar_stock'`
  )
  if (r2.rows.length) console.log(r2.rows[0].def)
  else console.log('No encontrada')

  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
