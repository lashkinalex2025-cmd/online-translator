import sharp from 'sharp'
import { mkdir } from 'fs/promises'

function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="128" y2="128">
      <stop stop-color="#2563eb"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <circle cx="40" cy="52" r="14" fill="white" opacity="0.95"/>
  <circle cx="88" cy="52" r="14" fill="white" opacity="0.95"/>
  <path d="M54 52h20" stroke="#1d4ed8" stroke-width="5" stroke-linecap="round"/>
  <path d="M32 86 Q64 108 96 86" stroke="white" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
  <text x="64" y="42" text-anchor="middle" font-size="18" fill="white" font-family="Arial" font-weight="700">Aa</text>
</svg>`
}

await mkdir('public/icons', { recursive: true })
await sharp(Buffer.from(svg(192))).png().toFile('public/icons/icon-192.png')
await sharp(Buffer.from(svg(512))).png().toFile('public/icons/icon-512.png')
await sharp(Buffer.from(svg(180))).png().toFile('public/apple-touch-icon.png')
console.log('icons ok')
