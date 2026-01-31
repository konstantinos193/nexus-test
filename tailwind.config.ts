import type { Config } from 'tailwindcss'

// Tailwind 4: Most theme configuration is now in globals.css using @theme
// This config file is kept minimal for content paths only
const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}
export default config
