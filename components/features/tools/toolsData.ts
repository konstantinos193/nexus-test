/**
 * toolsData.ts
 * The only source of truth for "what tools do we even have?"
 * Used by ToolsPageContent to render the grid. If this list is empty,
 * we're basically a landing page for disappointment.
 *
 * @author Juan – the guy who typed this list and questioned his life choices
 */

import type { LucideIcon } from 'lucide-react'
import { ImagePlus } from 'lucide-react'

/** One tool in the creator toolkit. We promise the icon exists. */
export interface SolanaTool {
  id: string
  name: string
  description: string
  icon: LucideIcon
  href: string
}

/** The actual tools. Add more when we stop procrastinating. */
export const solanaTools: SolanaTool[] = [
  {
    id: 'nft-asset',
    name: 'NFT Layer Generator',
    description:
      'Drop folders of layers, set priority (draw order), generate images + metadata ready for the Create page',
    icon: ImagePlus,
    href: '/tools/nft-asset',
  },
]

// — Juan. Yes, one tool. We'll add more. Maybe. The backlog is a dark place.
