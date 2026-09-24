import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let alive = true
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#0e0e0e', light: '#ffffff' } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(''))
    return () => {
      alive = false
    }
  }, [value, size])
  return src ? (
    <img src={src} width={size} height={size} alt={label} className="rounded-md border-2 border-ink bg-white p-1" />
  ) : (
    <div style={{ width: size, height: size }} className="animate-pulse rounded-md border-2 border-ink bg-paper-2" />
  )
}
