// Minimal, dependency-free access to Supabase from Edge Functions:
// PostgREST for data and GoTrue for the caller's identity.
import { HttpError } from './http.ts'

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const q = encodeURIComponent

export interface AuthUser {
  id: string
  email?: string
}

async function rest(path: string, init: RequestInit = {}, prefer = ''): Promise<Response> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new HttpError(res.status >= 500 ? 500 : 400, body.message ?? `Database request failed (${res.status})`)
  }
  return res
}

/**
 * Service-role data access. Bypasses row level security, so every caller
 * must check permissions first.
 */
export const db = {
  eq: (column: string, value: string) => `${column}=eq.${q(value)}`,

  async many<T>(table: string, query: string): Promise<T[]> {
    return (await rest(`${table}?${query}`)).json()
  },
  async one<T>(table: string, query: string): Promise<T | null> {
    const rows = await db.many<T>(table, `${query}&limit=1`)
    return rows[0] ?? null
  },
  async insert(table: string, row: Record<string, unknown>): Promise<void> {
    await rest(table, { method: 'POST', body: JSON.stringify(row) }, 'return=minimal')
  },
  async update(table: string, query: string, patch: Record<string, unknown>): Promise<void> {
    await rest(`${table}?${query}`, { method: 'PATCH', body: JSON.stringify(patch) }, 'return=minimal')
  },
  async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    // Functions returning void answer with an empty body.
    const text = await (await rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })).text()
    return (text ? JSON.parse(text) : null) as T
  },
}

export async function requireUser(req: Request): Promise<AuthUser> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) throw new HttpError(401, 'Please sign in')
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new HttpError(401, 'Please sign in again')
  const user = await res.json()
  if (!user?.id) throw new HttpError(401, 'Please sign in again')
  return user
}

export async function requireAdmin(req: Request): Promise<AuthUser> {
  const user = await requireUser(req)
  const profile = await db.one<{ role: string }>('profiles', `select=role&${db.eq('id', user.id)}`)
  if (profile?.role !== 'super_admin') throw new HttpError(403, 'Admins only')
  return user
}
