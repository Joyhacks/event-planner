// Link previews for WhatsApp, Instagram, X, Telegram and friends.
// Pure helpers, unit-tested; api/share.ts wires them to Vercel.

export interface PreviewMeta {
  title: string
  description: string
  image: string
  url: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function previewHtml(m: PreviewMeta): string {
  return `<!doctype html>
<html lang="en-NG">
<head>
<meta charset="utf-8">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ariya">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${esc(m.image)}">
<meta property="og:url" content="${esc(m.url)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta name="twitter:image" content="${esc(m.image)}">
<link rel="canonical" href="${esc(m.url)}">
</head>
<body><a href="${esc(m.url)}">${esc(m.title)}</a></body>
</html>`
}

export function whenInLagos(iso: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(iso))
}

interface EventRow {
  id: string
  title: string
  starts_at: string
  venue: string
  city: string
  cover_url: string | null
  status: string
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Builds preview metadata for /e/:slug, /e/:slug/vote and /e/:slug/vote/:n.
 * Only public (non-draft) events are ever described.
 */
export async function buildPreview(opts: {
  origin: string
  slug: string
  number?: string | null
  vote?: boolean
  supabaseUrl?: string
  anonKey?: string
  fetchImpl?: Fetch
}): Promise<PreviewMeta> {
  const { origin, slug, number, vote } = opts
  const fallback: PreviewMeta = {
    title: 'Ariya — Owambe without wahala',
    description: 'Tickets, aso-ebi, voting contests and a planner for celebrations across Africa.',
    image: `${origin}/og-image.png`,
    url: `${origin}/e/${slug}`,
  }
  if (!opts.supabaseUrl || !opts.anonKey || !/^[a-z0-9-]{3,80}$/.test(slug)) return fallback
  const f = opts.fetchImpl ?? fetch
  const headers = { apikey: opts.anonKey, Authorization: `Bearer ${opts.anonKey}` }
  const get = async <T>(path: string): Promise<T[]> => {
    const res = await f(`${opts.supabaseUrl}/rest/v1/${path}`, { headers })
    return res.ok ? ((await res.json()) as T[]) : []
  }

  try {
    const [event] = await get<EventRow>(
      `events?select=id,title,starts_at,venue,city,cover_url,status&slug=eq.${encodeURIComponent(slug)}&status=neq.draft&limit=1`,
    )
    if (!event) return fallback
    const where = [event.venue, event.city].filter(Boolean).join(', ')
    const base: PreviewMeta = {
      title: event.title,
      description:
        event.status === 'cancelled'
          ? `Cancelled. ${where}.`
          : `${whenInLagos(event.starts_at)} · ${where}. Get tickets on Ariya.`,
      image: event.cover_url ?? fallback.image,
      url: `${origin}/e/${slug}`,
    }
    if (!vote && !number) return base

    const [contest] = await get<{ id: string; title: string }>(
      `contests?select=id,title&event_id=eq.${event.id}&order=created_at&limit=1`,
    )
    if (!contest) return base
    if (number && /^[0-9]{1,5}$/.test(number)) {
      const [who] = await get<{ display_name: string; number: number; photo_url: string | null }>(
        `contestants?select=display_name,number,photo_url&contest_id=eq.${contest.id}&number=eq.${number}&status=eq.active&limit=1`,
      )
      if (who) {
        return {
          title: `Vote for ${who.display_name} (#${who.number})`,
          description: `${contest.title}. Every vote counts. Tap to vote on Ariya.`,
          image: who.photo_url ?? base.image,
          url: `${origin}/e/${slug}/vote/${who.number}`,
        }
      }
    }
    return {
      title: `${contest.title}: live leaderboard`,
      description: `See who is leading and cast your vote. ${event.title}.`,
      image: base.image,
      url: `${origin}/e/${slug}/vote`,
    }
  } catch {
    return fallback
  }
}
