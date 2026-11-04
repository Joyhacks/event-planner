// Draws a 1080×1350 "Vote for me" poster for Instagram and WhatsApp status.

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, start: number, font: (px: number) => string) {
  let size = start
  ctx.font = font(size)
  while (ctx.measureText(text).width > maxWidth && size > 28) {
    size -= 4
    ctx.font = font(size)
  }
  return size
}

export async function drawShareCard(opts: {
  name: string
  number: number
  contest: string
  url: string
  photoUrl: string | null
}): Promise<Blob | null> {
  await document.fonts.ready
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')!
  const display = (px: number) => `850 ${px}px "Archivo Variable", sans-serif`
  const sign = (px: number) => `${px}px Bungee, sans-serif`

  // Danfo yellow with the two black stripes.
  ctx.fillStyle = '#ffc700'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(0, H - 150, W, 36)
  ctx.fillRect(0, H - 96, W, 16)

  // Photo, in a thick black frame.
  const photo = opts.photoUrl ? await loadImage(opts.photoUrl) : null
  const px = 110
  const py = 110
  const pw = W - 220
  const ph = 700
  ctx.fillStyle = '#0e0e0e'
  ctx.fillRect(px - 8 + 16, py - 8 + 16, pw + 16, ph + 16)
  ctx.fillRect(px - 8, py - 8, pw + 16, ph + 16)
  if (photo) {
    const scale = Math.max(pw / photo.width, ph / photo.height)
    const sw = pw / scale
    const sh = ph / scale
    ctx.drawImage(photo, (photo.width - sw) / 2, (photo.height - sh) / 2, sw, sh, px, py, pw, ph)
  } else {
    ctx.fillStyle = '#f0287a'
    ctx.fillRect(px, py, pw, ph)
    ctx.fillStyle = '#0e0e0e'
    ctx.font = sign(360)
    ctx.textAlign = 'center'
    ctx.fillText(`#${opts.number}`, W / 2, py + ph / 2 + 130)
  }

  // Sticker with the number.
  ctx.save()
  ctx.translate(W - 190, 150)
  ctx.rotate(0.2)
  ctx.fillStyle = '#0e0e0e'
  ctx.beginPath()
  ctx.arc(8, 8, 110, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0287a'
  ctx.beginPath()
  ctx.arc(0, 0, 110, 0, Math.PI * 2)
  ctx.fill()
  ctx.lineWidth = 8
  ctx.strokeStyle = '#0e0e0e'
  ctx.stroke()
  ctx.fillStyle = '#0e0e0e'
  ctx.textAlign = 'center'
  ctx.font = sign(34)
  ctx.fillText('NO.', 0, -22)
  ctx.font = sign(78)
  ctx.fillText(String(opts.number), 0, 50)
  ctx.restore()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#0e0e0e'
  ctx.font = sign(64)
  ctx.fillText('VOTE FOR', px, 900)
  const nameSize = fitText(ctx, opts.name.toUpperCase(), pw, 112, display)
  ctx.font = display(nameSize)
  ctx.fillText(opts.name.toUpperCase(), px, 900 + nameSize)
  const contestSize = fitText(ctx, opts.contest, pw, 40, (p) => `700 ${p}px "Archivo Variable", sans-serif`)
  ctx.font = `700 ${contestSize}px "Archivo Variable", sans-serif`
  ctx.fillText(opts.contest, px, 1090)
  ctx.font = '600 34px "Archivo Variable", sans-serif'
  ctx.fillText(opts.url.replace(/^https?:\/\//, ''), px, 1150)

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'))
}
