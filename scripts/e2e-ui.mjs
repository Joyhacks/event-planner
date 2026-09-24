// Browser end-to-end test of the marketplace, run as real users through the UI.
// Needs local Supabase (+ functions serve), fake Paystack, and the app served
// on http://127.0.0.1:5173 built against the local Supabase.
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

const APP = 'http://127.0.0.1:5173'
const API = 'http://127.0.0.1:54321'
const MAIL = 'http://127.0.0.1:54324'
const FAKE = 'http://127.0.0.1:4010'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const SHOTS = process.env.SHOTS_DIR
if (!SERVICE) throw new Error('Set SUPABASE_SERVICE_ROLE_KEY (local only)')
const service = createClient(API, SERVICE, { auth: { persistSession: false } })

let passed = 0
const ok = (cond, what) => {
  if (!cond) throw new Error('FAILED: ' + what)
  passed++
  console.log('ok  ' + what)
}
const run = Date.now().toString(36)
const email = (who) => `${who}-${run}@ariya.test`
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
process.on('uncaughtException', async (err) => {
  console.error(err.message)
  if (SHOTS) {
    let i = 0
    for (const ctx of browser.contexts()) for (const p of ctx.pages()) await p.screenshot({ path: `${SHOTS}/failure-${i++}.png`, fullPage: true }).catch(() => {})
  }
  process.exit(1)
})
const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true })

async function magicLink(address) {
  for (let i = 0; i < 40; i++) {
    const list = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + address)}`).then((r) => r.json())
    const msg = list.messages?.[0]
    if (msg) {
      const full = await fetch(`${MAIL}/api/v1/message/${msg.ID}`).then((r) => r.json())
      const link = (full.HTML || full.Text).match(/href="([^"]+verify[^"]+)"/)?.[1] ?? (full.Text.match(/(http\S+verify\S+)/) || [])[1]
      if (link) return link.replace(/&amp;/g, '&')
    }
    await sleep(500)
  }
  throw new Error('No magic link for ' + address)
}

async function signIn(page, address, name, next = '/account/tickets') {
  await page.goto(`${APP}/signin?next=${encodeURIComponent(next)}`)
  await page.getByLabel('Email').fill(address)
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await page.getByText('Check your email').waitFor()
  await page.goto(await magicLink(address))
  await page.waitForURL((u) => u.pathname === next.split('?')[0], { timeout: 20000 })
  // Wait until the one-time code has been exchanged for a session.
  await page.getByRole('link', { name: 'My tickets' }).first().waitFor({ timeout: 20000 })
  await page.waitForURL((u) => !u.searchParams.has('code'), { timeout: 20000 })
}

async function newUser(label, name, viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport })
  const page = await context.newPage()
  page.on('pageerror', (e) => console.log(`[${label} pageerror]`, e.message))
  await signIn(page, email(label), name)
  return { context, page }
}

// Seller applies -------------------------------------------------------------
const seller = await newUser('seller', 'Sola Adebayo')
ok(true, 'seller signed in with a magic link')
await seller.page.goto(`${APP}/sell`)
await seller.page.getByLabel('Business or brand name').fill('Sola Events')
await seller.page.getByLabel('Phone', { exact: true }).fill('08030000000')
await seller.page.getByLabel('Bank').selectOption('058')
await seller.page.getByLabel('Account number').fill('0123456789')
await seller.page.getByRole('button', { name: 'Apply to sell' }).click()
await seller.page.getByText('Under review').waitFor()
ok(await seller.page.getByText('SOLA ADEBAYO').isVisible(), 'application shows the Paystack-verified account name')

// Admin approves -----------------------------------------------------------------
const admin = await newUser('admin', 'Ada Admin')
const { data: adminUser } = await service.from('profiles').select('id').eq('full_name', 'Ada Admin').order('created_at', { ascending: false }).limit(1).single()
await service.from('profiles').update({ role: 'super_admin' }).eq('id', adminUser.id)
await admin.page.goto(`${APP}/admin`)
await admin.page.reload()
await admin.page.getByText('Paystack verified: SOLA ADEBAYO').waitFor()
await shot(admin.page, 'admin')
await admin.page.getByRole('button', { name: 'Approve' }).first().click()
await admin.page.getByText('No applications waiting.').waitFor()
ok(true, 'admin approves the seller from the dashboard')

// Seller builds and publishes an event ----------------------------------------------
await seller.page.goto(`${APP}/seller`)
await seller.page.reload()
await seller.page.getByRole('button', { name: 'New event' }).click()
await seller.page.getByLabel('Event name').fill('Detty Owambe')
const start = new Date(Date.now() + 20 * 864e5)
const local = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
await seller.page.getByLabel('Starts').fill(local(start))
await seller.page.getByRole('button', { name: 'Create' }).click()
await seller.page.waitForURL(/seller\/events\//)
const eventId = seller.page.url().split('/').pop().split('?')[0]

await seller.page.getByLabel('Venue').fill('Harbour Hall')
await seller.page.getByRole('button', { name: 'Add question' }).click()
await seller.page.getByRole('textbox', { name: 'Question' }).fill('T-shirt size')
await seller.page.getByLabel('Answer type').selectOption('select')
await seller.page.getByLabel('Options').fill('S, M, L')
await seller.page.getByLabel('Required').check()
await seller.page.getByRole('button', { name: 'Save changes' }).click()
await seller.page.getByText('Saved.').waitFor()

await seller.page.getByRole('button', { name: 'Tickets', exact: true }).click()
await seller.page.getByRole('heading', { name: 'Add a ticket type' }).waitFor()
const addType = async (name, price, qty, kind = 'single', seats = '10') => {
  await seller.page.getByLabel('Name', { exact: true }).fill(name)
  await seller.page.getByLabel('Kind').selectOption(kind)
  if (kind === 'table') await seller.page.getByLabel('Seats per table').fill(seats)
  await seller.page.getByLabel(/^Price/).fill(price)
  await seller.page.getByLabel(/available$/).fill(qty)
  await seller.page.getByRole('button', { name: 'Add ticket type' }).click()
  await seller.page.locator('li', { hasText: name }).first().waitFor()
}
await addType('Regular', '5,000', '100')
await addType('Gold table', '200k', '5', 'table', '10')
ok(await seller.page.getByText('Table for 10').isVisible(), 'seller adds single and table ticket types')

await seller.page.getByRole('button', { name: 'Promos & promoters' }).click()
await seller.page.getByRole('heading', { name: 'Promoter links' }).waitFor()
await seller.page.getByLabel('Code', { exact: true }).fill('EARLY10')
await seller.page.getByLabel('Value').fill('10')
await seller.page.getByRole('button', { name: 'Add code' }).click()
await seller.page.getByText('10% off').waitFor()
await seller.page.getByLabel('Name', { exact: true }).fill('Tunde Hype')
await seller.page.getByLabel('Link code (optional)').fill('tunde')
await seller.page.getByRole('button', { name: 'Add promoter' }).click()
await seller.page.getByText(`?ref=tunde`).waitFor()
ok(true, 'seller creates a promo code and a promoter link')

await seller.page.getByRole('button', { name: 'Aso-ebi' }).click()
await seller.page.getByRole('heading', { name: 'Add aso-ebi' }).waitFor()
await seller.page.getByLabel('Fabric').fill('Gold aso-oke set')
await seller.page.getByLabel('Price per set (₦)').fill('45,000')
await seller.page.getByLabel('Sets available').fill('20')
await seller.page.getByRole('button', { name: 'Gold' }).click()
await seller.page.getByRole('button', { name: 'Add aso-ebi' }).click()
await seller.page.getByText('0 sold of 20').waitFor()
ok(true, 'seller lists aso-ebi for sale')

await seller.page.getByRole('button', { name: 'Contest' }).click()
await seller.page.getByRole('heading', { name: 'Start a voting contest' }).waitFor()
await seller.page.getByLabel('Contest name').fill('Face of Detty Owambe')
await seller.page.getByLabel('Voting opens').fill(local(new Date(Date.now() - 3600e3)))
await seller.page.getByLabel('Voting closes').fill(local(new Date(Date.now() + 5 * 864e5)))
await seller.page.getByText(/I confirm I hold/).click()
await seller.page.getByRole('button', { name: 'Create contest' }).click()
for (const n of ['Amaka', 'Bisola']) {
  await seller.page.getByLabel('Name', { exact: true }).fill(n)
  await seller.page.getByRole('button', { name: 'Add contestant' }).click()
  await seller.page.locator('li', { hasText: n }).first().waitFor()
}
await seller.page.getByLabel('Votes', { exact: true }).fill('10')
await seller.page.getByLabel('Price (₦)').fill('500')
await seller.page.getByRole('button', { name: 'Add', exact: true }).click()
await seller.page.getByText('10 votes · ₦500').waitFor()
ok(true, 'seller sets up a contest with contestants and a vote bundle')

await seller.page.getByRole('button', { name: 'Door' }).click()
await seller.page.getByRole('heading', { name: 'Door team' }).waitFor()
await seller.page.getByLabel('Add by email').fill(email('door'))
await seller.page.getByRole('button', { name: 'Add', exact: true }).click()
await seller.page.getByText('No Ariya account uses that email yet').waitFor()
ok(true, 'door staff must have an account first')

await seller.page.getByRole('button', { name: 'Details' }).click()
await seller.page.getByRole('heading', { name: 'About the event' }).waitFor()
await seller.page.getByRole('button', { name: 'Save & publish' }).click()
await seller.page.getByText('published').first().waitFor()
await shot(seller.page, 'seller-event')
const { data: ev } = await service.from('events').select('slug').eq('id', eventId).single()
ok(ev.slug, 'event published')

// Buyer checks out ------------------------------------------------------------------
const buyer = await newUser('buyer', 'Bisi Buyer', { width: 390, height: 844 })
await buyer.page.goto(`${APP}/e/${ev.slug}?ref=tunde`)
await buyer.page.getByRole('heading', { name: 'Detty Owambe' }).waitFor()
await shot(buyer.page, 'event-mobile')
await buyer.page.getByRole('button', { name: 'More Regular' }).click()
await buyer.page.getByRole('button', { name: 'More Regular' }).click()
await buyer.page.getByRole('button', { name: 'More Gold aso-oke set' }).click()
await buyer.page.getByLabel('Promo code (optional)').fill('early10')
await buyer.page.getByRole('button', { name: 'Continue', exact: true }).click()
await buyer.page.getByLabel('T-shirt size').selectOption('M')
await buyer.page.getByRole('button', { name: 'Continue to payment' }).click()
await buyer.page.getByText('Promo discount').waitFor()
ok(await buyer.page.getByText('−₦1,000').isVisible(), 'review shows the 10% promo on tickets only')
ok(await buyer.page.getByText('Payment fee').isVisible(), 'buyer-paid Paystack fee shown separately')
ok(await buyer.page.getByText(/held for/).isVisible(), 'hold countdown shown')
await shot(buyer.page, 'review-mobile')

await buyer.context.route('https://checkout.paystack.test/**', (route) => route.fulfill({ body: '<h1>Paystack checkout (fake)</h1>', contentType: 'text/html' }))
await buyer.page.getByRole('button', { name: /^Pay ₦/ }).click()
await buyer.page.waitForURL(/checkout\.paystack\.test/)
const reference = buyer.page.url().split('/').pop()
await fetch(`${FAKE}/__pay?ref=${reference}`)
await buyer.page.goto(`${APP}/checkout/return?reference=${reference}`)
await buyer.page.getByText('You’re in!').waitFor({ timeout: 30000 })
ok(true, 'paid via Paystack and confirmed on return')
await buyer.page.getByRole('link', { name: 'See my tickets' }).click()
await buyer.page.getByText('Gold aso-oke set').first().waitFor()
const qrs = await buyer.page.getByRole('img', { name: /Ticket QR code/ }).count()
ok(qrs === 2, 'My tickets shows 2 QR codes')
await shot(buyer.page, 'tickets-mobile')

// Door staff scans -------------------------------------------------------------------
const door = await newUser('door', 'Tobi Door', { width: 390, height: 844 })
await seller.page.goto(`${APP}/seller/events/${eventId}?tab=door`)
await seller.page.getByLabel('Add by email').fill(email('door'))
await seller.page.getByRole('button', { name: 'Add', exact: true }).click()
await seller.page.getByText('can now scan tickets').waitFor()
const { data: codes } = await service.from('tickets').select('code').eq('event_id', eventId).order('created_at')
await door.page.goto(`${APP}/scan/${eventId}`)
await door.page.getByText(/Guest list saved on this phone/).waitFor()
const check = async (code) => {
  await door.page.getByLabel('Ticket code').fill(code)
  await door.page.getByRole('button', { name: 'Check' }).click()
}
await check(codes[0].code)
await door.page.getByText('Let them in').waitFor()
ok(true, 'scanner admits a valid ticket')
await sleep(3100)
await check(codes[0].code)
await door.page.getByText('Already used').waitFor()
ok(true, 'scanner blocks a second use')
await door.context.setOffline(true)
await door.page.evaluate(() => window.dispatchEvent(new Event('offline')))
await door.page.getByText('Offline', { exact: true }).waitFor()
await check(codes[1].code)
await door.page.getByText('Checked offline · will sync').waitFor()
ok(true, 'scanner admits from the saved guest list while offline')
await shot(door.page, 'scanner-offline')
await door.context.setOffline(false)
await door.page.evaluate(() => window.dispatchEvent(new Event('online')))
await door.page.getByText(/Synced 1 offline scans/).waitFor({ timeout: 20000 })
const { data: t2 } = await service.from('tickets').select('status').eq('code', codes[1].code).single()
ok(t2.status === 'checked_in', 'offline admission synced to the server')

// Voting ---------------------------------------------------------------------------------
const { data: contest } = await service.from('contests').select('id').eq('event_id', eventId).single()
const viewer = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const board = await viewer.newPage()
await board.goto(`${APP}/e/${ev.slug}/vote`)
await board.getByText('Live leaderboard').waitFor()
// The test OTP number can belong to only one account: release it from earlier runs.
execSync(`psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -qc "update auth.users set phone = null, phone_confirmed_at = null where phone = '2348031234567'"`)
await buyer.page.goto(`${APP}/e/${ev.slug}/vote/1`)
await buyer.page.getByRole('button', { name: 'Verify phone for a free vote' }).click()
await buyer.page.getByLabel('Phone number').fill('0803 123 4567')
await buyer.page.getByRole('button', { name: 'Text me a code' }).click()
await buyer.page.getByLabel('6-digit code').fill('123456')
await buyer.page.getByRole('button', { name: 'Verify' }).click()
await buyer.page.waitForURL(/\/vote\/1/)
await buyer.page.getByRole('button', { name: 'Cast my free vote' }).click()
await buyer.page.getByText(/Vote counted!/).waitFor()
ok(true, 'phone-verified buyer casts a free vote')
await board.locator('li', { hasText: 'Amaka' }).getByText('1', { exact: true }).waitFor({ timeout: 15000 })
ok(true, 'open leaderboard updates live without refresh')
await buyer.page.getByRole('button', { name: 'Cast my free vote' }).click()
await buyer.page.getByText('already used your free vote').waitFor()
ok(true, 'second free vote is refused')
await buyer.page.getByRole('button', { name: /Make “Vote for me” card/ }).click()
await buyer.page.getByRole('img', { name: /Vote for Amaka poster/ }).waitFor()
ok(true, 'vote-for-me share card generated')
await shot(buyer.page, 'contestant-mobile')
await shot(board, 'leaderboard')

// Cancel and refund -------------------------------------------------------------------------
await seller.page.goto(`${APP}/seller/events/${eventId}?tab=sales`)
await seller.page.getByText('You owe').waitFor()
ok(true, 'seller sees promoter commission owed')
await shot(seller.page, 'seller-sales')
await seller.page.getByRole('button', { name: 'Postpone / cancel' }).click()
await seller.page.getByLabel('Reason (shown to ticket holders)').fill('Venue withdrew')
await seller.page.getByRole('button', { name: 'Cancel event and refund' }).click()
await seller.page.getByRole('button', { name: 'Cancel and refund everyone?' }).click()
await seller.page.getByText(/queued for automatic refunds/).waitFor()
await admin.page.goto(`${APP}/admin`)
await admin.page.getByRole('button', { name: 'Send pending refunds to Paystack' }).click()
await admin.page.getByText('processing').first().waitFor()
ok(true, 'cancelling queues refunds and admin sends them to Paystack')

await browser.close()
console.log(`\nALL ${passed} UI E2E CHECKS PASSED`)
