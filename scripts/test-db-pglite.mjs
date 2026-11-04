// Execute the actual migrations and SQL permission tests in isolated Postgres.
// Production-specific auth, network services and pg_cron still need staging checks.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { readFile, readdir } from 'node:fs/promises'

const db = new PGlite({ extensions: { pgcrypto } })
try {
  const migrations = (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const tests = (await readdir('supabase/tests')).filter((f) => f.endsWith('.sql') && !f.startsWith('00_')).sort()
  for (const path of [
    'supabase/tests/00_supabase_stub.sql',
    ...migrations.map((f) => `supabase/migrations/${f}`),
    ...tests.map((f) => `supabase/tests/${f}`),
  ]) {
    const sql = (await readFile(path, 'utf8'))
      .replace(/^\\.*$/gm, '')
      .replace(/create function pg_temp\./g, 'create or replace function pg_temp.')
    try {
      // psql uses separate sessions; reset role and replace only test helpers.
      await db.exec('RESET ROLE')
      await db.exec(sql)
      console.log(`PASS ${path}`)
    } catch (e) {
      console.error(`FAIL ${path}: ${e.message}\n${e.where ?? ''}`)
      process.exitCode = 1
      break
    }
  }
} finally {
  await db.close()
}
