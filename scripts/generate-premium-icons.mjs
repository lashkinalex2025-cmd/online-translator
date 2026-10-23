import sharp from 'sharp'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const ROOT = path.resolve('C:/Users/User/Desktop/Переводчик')

/**
 * Premium translator icon — full-bleed brand gradient + bold globe + dual speech arcs.
 * No text. Designed to stay clear at 48–512px.
 */
function iconSvg(size, { pad = 0, round = 0 } = {}) {
  const vb = 1024
  const r = round
  const contentScale = (vb - pad * 2) / vb
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${vb} ${vb}">
  <defs>
    <linearGradient id="bg" x1="12%" y1="8%" x2="88%" y2="92%">
      <stop offset="0%" stop-color="#0f1f6b"/>
      <stop offset="40%" stop-color="#1d4ed8"/>
      <stop offset="78%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#4c1d95"/>
    </linearGradient>
    <linearGradient id="sheen" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="42%" stop-color="#ffffff" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#020617" stop-opacity="0.28"/>
    </linearGradient>
    <radialGradient id="spot" cx="30%" cy="24%" r="58%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="#93c5fd" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="metal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#fbbf24"/>
    </linearGradient>
    <filter id="soft" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#020617" flood-opacity="0.35"/>
    </filter>
  </defs>

  ${r > 0
    ? `<rect width="${vb}" height="${vb}" rx="${r}" ry="${r}" fill="url(#bg)"/>`
    : `<rect width="${vb}" height="${vb}" fill="url(#bg)"/>`}
  <rect width="${vb}" height="${vb}" ${r > 0 ? `rx="${r}" ry="${r}"` : ''} fill="url(#sheen)"/>
  <rect width="${vb}" height="${vb}" ${r > 0 ? `rx="${r}" ry="${r}"` : ''} fill="url(#spot)"/>

  <g transform="translate(${pad}, ${pad}) scale(${contentScale})" filter="url(#soft)">
    <!-- Soft plate behind symbol -->
    <circle cx="512" cy="468" r="268" fill="#0b1228" opacity="0.22"/>

    <!-- Globe ring -->
    <circle cx="512" cy="456" r="218" fill="none" stroke="url(#metal)" stroke-width="36"/>
    <ellipse cx="512" cy="456" rx="100" ry="218" fill="none" stroke="url(#metal)" stroke-width="22" opacity="0.95"/>
    <path d="M294 456 H730" stroke="url(#metal)" stroke-width="22" stroke-linecap="round"/>
    <path d="M328 368 Q512 328 696 368" fill="none" stroke="url(#metal)" stroke-width="18" stroke-linecap="round" opacity="0.9"/>
    <path d="M328 544 Q512 584 696 544" fill="none" stroke="url(#metal)" stroke-width="18" stroke-linecap="round" opacity="0.9"/>

    <!-- Dual speech / translation arcs -->
    <path d="M220 720 C320 630, 420 630, 500 720" fill="none" stroke="url(#gold)" stroke-width="34" stroke-linecap="round"/>
    <path d="M524 720 C604 630, 704 630, 804 720" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round"/>
    <circle cx="220" cy="720" r="22" fill="url(#gold)"/>
    <circle cx="804" cy="720" r="22" fill="#ffffff"/>
  </g>
</svg>`
}

async function renderPng(svg, out, size) {
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(out)
}

async function main() {
  const publicIcons = path.join(ROOT, 'public/icons')
  await mkdir(publicIcons, { recursive: true })

  await renderPng(iconSvg(1024), path.join(publicIcons, 'icon-master.png'), 1024)
  await renderPng(iconSvg(512), path.join(publicIcons, 'icon-512.png'), 512)
  await renderPng(iconSvg(192), path.join(publicIcons, 'icon-192.png'), 192)
  await renderPng(iconSvg(180), path.join(ROOT, 'public/apple-touch-icon.png'), 180)
  await writeFile(path.join(ROOT, 'public/favicon.svg'), iconSvg(128, { round: 28 }), 'utf8')
  await renderPng(iconSvg(64, { round: 14 }), path.join(ROOT, 'public/favicon-64.png'), 64)

  const androidRes = path.join(ROOT, 'android/app/src/main/res')
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48 },
    { dir: 'mipmap-hdpi', size: 72 },
    { dir: 'mipmap-xhdpi', size: 96 },
    { dir: 'mipmap-xxhdpi', size: 144 },
    { dir: 'mipmap-xxxhdpi', size: 192 },
  ]

  for (const { dir, size } of mipmaps) {
    const folder = path.join(androidRes, dir)
    await mkdir(folder, { recursive: true })
    await renderPng(iconSvg(size), path.join(folder, 'ic_launcher.png'), size)
    await renderPng(
      iconSvg(size, { round: Math.round(size * 0.5) }),
      path.join(folder, 'ic_launcher_round.png'),
      size,
    )
    // Adaptive foreground: keep symbol in safe zone
    await renderPng(
      iconSvg(size, { pad: Math.round(1024 * 0.14) }),
      path.join(folder, 'ic_launcher_foreground.png'),
      size,
    )
  }

  await writeFile(
    path.join(androidRes, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1D4ED8</color>
</resources>
`,
    'utf8',
  )

  await writeFile(
    path.join(androidRes, 'drawable/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:type="linear"
        android:angle="135"
        android:startColor="#0F1F6B"
        android:centerColor="#1D4ED8"
        android:endColor="#6D28D9" />
</shape>
`,
    'utf8',
  )

  // Replace vector foreground with a simple reference note — adaptive uses mipmap PNGs already
  console.log('Premium icons ready')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
