// Vercel Function. vercel.json routes link-preview bots (WhatsApp, Facebook,
// X, Telegram…) here for event and voting links; people get the normal app.
import { buildPreview, previewHtml } from './_preview'

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const meta = await buildPreview({
    origin: `${url.protocol}//${url.host}`,
    slug: url.searchParams.get('slug') ?? '',
    number: url.searchParams.get('n'),
    vote: url.searchParams.has('vote'),
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
  })
  return new Response(previewHtml(meta), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
