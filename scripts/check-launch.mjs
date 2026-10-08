import { loadEnv } from 'vite'

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
if (process.argv.includes('--deployment') && env.VERCEL_ENV !== 'production') {
  console.log('Preview build: production configuration gate is deferred.')
  process.exit(0)
}
const problems = []
for (const key of [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SITE_URL',
  'VITE_COMPANY_NAME',
  'VITE_COMPANY_RC',
  'VITE_COMPANY_ADDRESS',
  'VITE_SUPPORT_EMAIL',
  'VITE_PRIVACY_EMAIL',
]) {
  const value = env[key]?.trim()
  if (!value || /\[|yourdomain|example\.(com|org)|placeholder/i.test(value))
    problems.push(`${key}: supply the production value`)
}
for (const key of ['VITE_SUPABASE_URL', 'VITE_SITE_URL']) {
  try {
    const u = new URL(env[key])
    if (u.protocol !== 'https:' || /^(localhost|127\.|0\.)/.test(u.hostname)) throw new Error()
  } catch {
    problems.push(`${key}: use a public HTTPS URL`)
  }
}
for (const key of ['VITE_SUPPORT_EMAIL', 'VITE_PRIVACY_EMAIL'])
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env[key] || '')) problems.push(`${key}: use a working email address`)
if (env.VITE_TERMS_REVIEWED !== 'true') problems.push('VITE_TERMS_REVIEWED: approve the actual policies before launch')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (key.startsWith('sb_secret_'))
  problems.push('VITE_SUPABASE_ANON_KEY: secret keys must never be exposed to the browser')
if (key.split('.').length === 3) {
  try {
    if (JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role')
      problems.push('VITE_SUPABASE_ANON_KEY: service_role keys are forbidden')
  } catch {
    problems.push('VITE_SUPABASE_ANON_KEY: invalid public key')
  }
}
if (env.VITE_MARKETPLACE_ENABLED === 'true' && env.MARKETPLACE_LAUNCH_APPROVED !== 'true')
  problems.push('MARKETPLACE_LAUNCH_APPROVED: complete the payment/email/refund staging checklist first')
if (problems.length) {
  console.error('Production launch blocked:\n' + problems.map((p) => `- ${p}`).join('\n'))
  process.exitCode = 1
} else
  console.log('Production configuration check passed. Complete the staging checks in PRODUCTION.md before release.')
