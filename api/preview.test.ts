import { describe, expect, it } from 'vitest'
import { buildPreview, previewHtml } from './_preview'

const origin = 'https://ariya.test'
const rows: Record<string, unknown[]> = {
  events: [{ id: 'e1', title: 'Detty Owambe', starts_at: '2026-12-19T15:00:00Z', venue: 'Harbour Hall', city: 'Lagos', cover_url: 'https://img.test/cover.jpg', status: 'published' }],
  contests: [{ id: 'c1', title: 'Face of Detty Owambe' }],
  contestants: [{ display_name: 'Amaka', number: 3, photo_url: 'https://img.test/amaka.jpg' }],
}
const fakeFetch = async (url: string) => {
  const table = url.split('/rest/v1/')[1]!.split('?')[0]!
  if (url.includes('slug=eq.missing')) return new Response('[]')
  return new Response(JSON.stringify(rows[table] ?? []))
}
const base = { origin, supabaseUrl: 'https://db.test', anonKey: 'anon', fetchImpl: fakeFetch }

describe('link previews', () => {
  it('describes an event with Lagos time and its cover photo', async () => {
    const m = await buildPreview({ ...base, slug: 'detty-owambe' })
    expect(m.title).toBe('Detty Owambe')
    expect(m.description).toContain('16:00')
    expect(m.description).toContain('Harbour Hall, Lagos')
    expect(m.image).toBe('https://img.test/cover.jpg')
  })
  it('describes a contestant with their photo', async () => {
    const m = await buildPreview({ ...base, slug: 'detty-owambe', number: '3' })
    expect(m.title).toBe('Vote for Amaka (#3)')
    expect(m.image).toBe('https://img.test/amaka.jpg')
    expect(m.url).toBe('https://ariya.test/e/detty-owambe/vote/3')
  })
  it('falls back safely for unknown, malformed or unconfigured requests', async () => {
    expect((await buildPreview({ ...base, slug: 'missing' })).title).toMatch(/^Ariya/)
    expect((await buildPreview({ ...base, slug: '../etc?x=1' })).title).toMatch(/^Ariya/)
    expect((await buildPreview({ origin, slug: 'detty-owambe' })).image).toBe('https://ariya.test/og-image.png')
  })
  it('escapes HTML in titles', () => {
    const html = previewHtml({ title: '<script>"x"</script>', description: 'a & b', image: 'https://i', url: 'https://u' })
    expect(html).not.toContain('<script>"x"')
    expect(html).toContain('&lt;script&gt;&quot;x&quot;')
    expect(html).toContain('a &amp; b')
  })
})

describe('which visitors get the preview page', async () => {
  const { readFileSync } = await import('node:fs')
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const pattern: string = config.rewrites[0].has[0].value
  const re = new RegExp(pattern.replace('(?i)', ''), 'i')

  it('matches link-preview bots', () => {
    for (const ua of [
      'WhatsApp/2.23.20.0 A',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'TelegramBot (like TwitterBot)',
      'Twitterbot/1.0',
    ]) expect(re.test(ua), ua).toBe(true)
  })
  it('leaves real people in in-app browsers alone', () => {
    for (const ua of [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0',
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 [FBAN/EMA;FBLC/en_US]',
      'Mozilla/5.0 (Linux; Android 13) Snapchat/12.60.0.46 (like Safari/604.1)',
      'Mozilla/5.0 (iPhone) Pinterest for iOS/12.0',
    ]) expect(re.test(ua), ua).toBe(false)
  })
})
