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

  const res = await client.query(`
    SELECT pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    WHERE conrelid = 'traspaso'::regclass AND conname = 'traspaso_estado_check'
  `)
  console.log('traspaso_estado_check definition:')
  console.log(res.rows)

  await client.end()
}

run().catch(e => { console.error(e.message); process.exit(1) })
