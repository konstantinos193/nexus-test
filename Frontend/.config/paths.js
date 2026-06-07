// Config paths for moved configuration files
// This helps Next.js and other tools find the moved config files

import path from 'path'

export default {
  postcss: path.join(import.meta.dirname, 'postcss.config.js'),
  tailwind: path.join(import.meta.dirname, 'tailwind.config.ts'),
  browserslistrc: path.join(import.meta.dirname, '.browserslistrc')
}
