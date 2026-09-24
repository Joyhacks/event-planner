# Ariya design system

Ariya plans African celebrations, so it should look like one: textile, paper and
ink, not a SaaS dashboard. Tokens live in `src/index.css`; this file is the intent.

## Mood

Editorial print meets Yoruba textile. Think an owambe invitation card, a folded
aso-ebi bolt, and a well-set magazine page. Calm surfaces, loud moments.

## Colour

The default Tailwind palette is switched off in `@theme`. If a colour is not a
token, it does not exist.

| Token | Hex | Use |
|---|---|---|
| `paper` / `paper-2` / `card` | #f4eee3 / #ebe2d2 / #fbf8f2 | Page, sunken panels, raised surfaces |
| `ink` / `ink-soft` / `ink-faint` | #1b1612 / #564c42 / #8a7d6e | Text, secondary text, labels |
| `line` / `line-strong` | #d8ccb8 / #b7a78e | Rules and input borders |
| `indigo` | #1f2a5a | Adire indigo. Primary brand surface |
| `clay` | #b0412a | Camwood. Primary action, emphasis in headlines |
| `ochre` | #d99a2b | Accent and decoration. Never body text on paper |
| `palm` | #2f5a3b | Success: coming, paid, collected |

Every event type owns a colour and a motif (`src/data/catalog.ts`), so a
ticket is recognisable before it is read.

## Type

- **Instrument Serif** for display, numbers that matter and one italic phrase per headline.
- **Bricolage Grotesque** for everything else.
- Two families, no more. Both are self-hosted through Fontsource.
- Eyebrows: 0.72rem, 600, 0.18em tracking, uppercase.
- Money and counts always use the `tabular` utility.

## Shape

- Radius vocabulary: `rounded-xs` (2px) for inputs and panels, `rounded-sm` (4px) for tickets, `rounded-full` for buttons, chips and pills. Nothing in between.
- Surfaces are separated by 1px rules and colour, not stacked shadows.
- One shadow each: `shadow-lift` for small floating notes, `drop-stamp` for tickets.

## Motifs

`<Motif>` draws SVG patterns inspired by adire and kente:
`oniko` (tie-dye rings), `eleko` (starch-resist lines and dots), `kente`
(woven blocks), `orbit` (calabash rings). Use them on covers and feature
blocks, always with a gradient scrim under any text that sits on top.

## Signature pieces

- **The ticket** (`EventTicket`): patterned cover, perforated tear line with notches, stub with the numbers.
- **The countdown**: a very large serif numeral.
- **The ledger**: rows split by hairlines, not cards.

## Never

- Purple-to-blue gradients, glassmorphism, neon.
- `rounded-2xl shadow-lg p-6` cards, cards inside cards.
- Three-column icon feature grids.
- Stock photos or AI-generated imagery. Use motifs and colour blocks.
- Fake testimonials or invented stats.
- Fade or bounce animations on scroll. The marquee respects `prefers-reduced-motion`.

## Voice

Warm, direct, a little Lagos. Light Pidgin and Yoruba where it lands naturally
(“wahala”, “Ẹ káàárọ̀”), never as a gimmick. Error messages tell people what to
do next.
