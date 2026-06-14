import pg from 'pg'
const { Client } = pg

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('Definí DATABASE_URL en .env.local')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

async function run() {
  await client.connect()
  const res = await client.query(`
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    WHERE conrelid = 'traspaso'::regclass AND conname = 'traspaso_estado_check'
  `)
  console.log('traspaso_estado_check:', res.rows[0]?.pg_get_constraintdef ?? 'N/A')
  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
