# Ariya design system: "Danfo Signboard"

Ariya plans African celebrations, so it should look like Lagos, not like a
template. The references are the yellow danfo bus with its two black stripes,
hand-painted signboards and bus slogans, owambe fabric and Afrobeats poster
graphics. Tokens live in `src/index.css`; this file explains the intent.

## Mood

Loud outside, calm inside. The marketing pages shout: yellow, huge type,
stickers, slogans. The planner itself is a clean white workspace that uses the
same borders, shadows and yellow accents, so the two feel like one product.

## Colour

The default Tailwind palette is switched off in `@theme`. If a colour is not a
token, it does not exist.

| Token | Hex | Use |
|---|---|---|
| `danfo` | #ffc700 | Brand. Hero, active nav, primary highlights |
| `ink` | #0e0e0e | Text, borders, shadows, primary buttons (yellow text on black) |
| `paper` / `card` | #f4f3ee / #ffffff | App background and surfaces |
| `pink` | #f0287a | Gele pink. Stickers, owambe, one accent per screen |
| `green` | #008751 | Naija green. Success: coming, paid, collected |
| `blue` | #2447d6 | Lagoon blue. Focus rings, info, corporate events |
| `red` | #d9331a | Errors and overspend only |

Pink or yellow text on yellow fails contrast, so it is never used. Emphasis
on yellow is black-box-yellow-text instead.

## Type

- **Archivo** (variable width), set extra-wide (`font-display`: 125% width, 850 weight) for headlines. Normal width for body and UI.
- **Bungee** (`font-sign`) is signboard lettering. Use it for numbers that matter (countdowns, money, stats), slogans and stickers. Never for paragraphs.
- Both are self-hosted through Fontsource.
- Labels: 0.68 to 0.72rem, bold, 0.12em tracking, uppercase.
- Emphasised headline phrase: `hl` utility (yellow marker box).

## Shape and depth

- Borders are 2px ink. Hairlines are only for inside tables.
- Radius vocabulary: `rounded-md` (10px) for controls, `rounded-lg` (16px) for cards, `rounded-full` for pills, stickers and tabs.
- Depth is a hard offset shadow (`shadow-hard-sm`, `shadow-hard`, `shadow-hard-lg`), never blur. Pressable things lift on hover and press flat on click.

## Signature pieces

- **Danfo stripes** (`danfo-stripes`): the two black bands, used to close yellow sections.
- **Signboard** (`<Signboard>`): a painted plate with four screws.
- **Sticker** (`<Sticker>`): rotated badge in Bungee.
- **Gate-pass ticket** (`<EventTicket>`): patterned cover, perforation with notches, stats stub.
- **Slogan marquee**: danfo slogans in Bungee on black.
- **Textile motifs** (`<Motif>`): adire rings, eleko dots, kente blocks, calabash orbits, taxi checker. Keep them at low opacity (about 0.12) behind content.
- **Grain** (`grain`): print texture on big yellow areas only.

## Never

- Cream paper with a thin serif and terracotta (the 2025 "AI editorial" look).
- Purple or blue gradients, glassmorphism, soft blurred shadows.
- Inter, Instrument Serif, Fraunces, Space Grotesk.
- Three-column icon feature grids, cards inside cards.
- Stock photos or AI-generated imagery.
- Fake testimonials or invented stats.

## Voice

Warm, direct, a little Lagos. Light Pidgin and Yoruba where it fits naturally
(“wahala”, “This party don change venue”, “Ẹ káàárọ̀”). Error messages tell
people what to do next.
