/**
 * Builds and downloads an example collection ZIP (images + metadata)
 * so users can see the expected folder structure and file format.
 */

import JSZip from 'jszip'

/** Minimal 1x1 transparent PNG (base64) for placeholder images */
const MINI_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Example metadata for one token (matches TokenMetadata used in Create flow) */
function exampleMetadata(index: number) {
  const names = ['Example #0', 'Example #1', 'Example #2']
  const traits = [
    [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Example Trait 2', value: 'Common' },
    ],
    [
      { trait_type: 'Background', value: 'Red' },
      { trait_type: 'Example Trait 2', value: 'Rare' },
    ],
    [
      { trait_type: 'Background', value: 'Gold' },
      { trait_type: 'Example Trait 2', value: 'Legendary' },
    ],
  ]
  const filename = `${index}.png`
  return {
    name: names[index] ?? `Example #${index}`,
    image: filename,
    attributes: traits[index] ?? [{ trait_type: 'Token', value: `${index}` }],
    properties: {
      files: [{ uri: filename, type: 'image/png' }],
    },
  }
}

const README = `Example collection for the Create flow (Step 2)

STRUCTURE
---------
• images/   — 0.png, 1.png, 2.png (256x256 example images; replace with your own PNG/JPG)
• metadata/ — 0.json, 1.json, 2.json (one JSON per token)

HOW TO USE
---------
1. In Step 2, drag the "images" folder into the Images dropzone.
2. Drag the "metadata" folder into the Metadata dropzone.
3. Upload will run automatically; then continue to Deploy.

METADATA FORMAT (each N.json)
-----------------------------
{
  "name": "Your NFT #N",
  "image": "N.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Example Trait 2", "value": "Common" }
  ],
  "properties": {
    "files": [{ "uri": "N.png", "type": "image/png" }]
  }
}

Image and properties.files[].uri are updated to IPFS URLs when you upload.
`

const ZIP_FILENAME = 'example-collection.zip'

export async function downloadExampleCollection(): Promise<void> {
  const zip = new JSZip()
  const imagesFolder = zip.folder('images')
  const metadataFolder = zip.folder('metadata')
  if (!imagesFolder || !metadataFolder) return

  const pngBytes = base64ToUint8Array(MINI_PNG_BASE64)
  for (let i = 0; i < 3; i++) {
    imagesFolder.file(`${i}.png`, pngBytes)
    metadataFolder.file(`${i}.json`, JSON.stringify(exampleMetadata(i), null, 2))
  }
  zip.file('README.txt', README)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = ZIP_FILENAME
  a.click()
  URL.revokeObjectURL(url)
}
