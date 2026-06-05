import sharp from 'sharp'
import { copyFileSync } from 'fs'

// Pad favicon.png (1320x1129) to square with transparent bg, then resize to 512x512
await sharp('public/favicon.png')
  .resize(1320, 1320, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .resize(512, 512)
  .toFile('public/icon.png')

// 32x32 for favicon.ico (PNG-in-ICO format, accepted by all modern browsers + wallets)
await sharp('public/icon.png')
  .resize(32, 32)
  .toFile('public/favicon-32.png')

// favicon.ico = PNG-in-ICO: copy the 32x32 PNG directly — valid per ICO spec section 6
copyFileSync('public/favicon-32.png', 'public/favicon.ico')

console.log('Done: public/icon.png, public/favicon-32.png, public/favicon.ico')
