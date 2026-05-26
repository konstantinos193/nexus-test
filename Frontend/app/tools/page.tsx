/**
 * Tools Page - Where creators find useful tools
 * Because creating NFTs requires more than just hope and dreams
 * (But hope and dreams are still important)
 * Snapshot, trade, airdrop, burn — the whole toolkit. Some "Coming Soon." We're building.
 *
 * @author Juan - The developer who assembled the creator toolkit
 * (Coded with care, humor, and probably too much coffee)
 */

'use client'

// Card, CardHeader, etc. - the boxes we put each tool in. Nice and organized.
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
// Button - "Use Tool" / "Coming Soon". We tell you what you can click.
import Button from '@/components/ui/Button'
// Icons - Camera, RefreshCw, Gift, Edit, Flame, Plus, Bitcoin. Visual flair.
import { 
  Camera, 
  RefreshCw, 
  Gift, 
  Edit, 
  Flame, 
  Plus,
  Bitcoin
} from 'lucide-react'

// Tool categories - Because organization is key
const solanaTools = [
  {
    id: 'snapshot',
    name: 'Holder Export',
    description: 'Export a snapshot of all current collection holders',
    icon: Camera,
    comingSoon: false,
  },
  {
    id: 'trade',
    name: 'NFT Exchange',
    description: 'Swap and trade NFTs directly through the platform',
    icon: RefreshCw,
    comingSoon: false,
  },
  {
    id: 'airdrop',
    name: 'Batch Distribute',
    description: 'Drop NFTs to multiple wallets in a single transaction',
    icon: Gift,
    comingSoon: true,
  },
  {
    id: 'update',
    name: 'Edit Metadata',
    description: 'Modify on-chain metadata for NFTs in your collection',
    icon: Edit,
    comingSoon: true,
  },
  {
    id: 'burn',
    name: 'Incinerator',
    description: 'Permanently destroy selected NFTs from your supply',
    icon: Flame,
    comingSoon: true,
  },
  {
    id: 'mint-single',
    name: 'Quick Mint',
    description: 'Mint a one-off NFT without a full collection launch',
    icon: Plus,
    comingSoon: true,
  },
]

const bitcoinTools = [
  {
    id: 'ordinals',
    name: 'Inscriptions Studio',
    description: 'Inscribe files and data onto Bitcoin as Ordinals',
    icon: Bitcoin,
    comingSoon: true,
  },
]

export default function ToolsPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page header - Because context matters */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark-text-primary mb-2">
            Tools
          </h1>
          <p className="text-dark-text-secondary">
            Everything you need to manage, distribute, and fine-tune your NFT collections — all in one place.
          </p>
        </div>

        {/* Solana Tools - Because Solana is popular */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-dark-text-primary mb-6">
            Solana Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solanaTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Card
                  key={tool.id}
                  variant="elevated"
                  className="hover:border-dark-border-accent transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                        <Icon className="w-6 h-6 text-dark-accent-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-dark-text-primary">
                            {tool.name}
                          </h3>
                          {tool.comingSoon && (
                            <span className="px-2 py-1 bg-dark-bg-tertiary text-dark-text-tertiary text-xs rounded">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-dark-text-secondary mb-4">
                          {tool.description}
                        </p>
                        <Button
                          variant={tool.comingSoon ? 'outline' : 'primary'}
                          size="sm"
                          disabled={tool.comingSoon}
                          className="w-full"
                        >
                          {tool.comingSoon ? 'Coming Soon' : 'Use Tool'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Bitcoin Tools - Because Bitcoin is OG */}
        <div>
          <h2 className="text-2xl font-bold text-dark-text-primary mb-6">
            Bitcoin Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bitcoinTools.map((tool) => {
              const Icon = tool.icon
              return (
                <Card
                  key={tool.id}
                  variant="elevated"
                  className="hover:border-dark-border-accent transition-all duration-300"
                >
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-dark-bg-tertiary rounded-lg">
                        <Icon className="w-6 h-6 text-dark-accent-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-dark-text-primary">
                            {tool.name}
                          </h3>
                          {tool.comingSoon && (
                            <span className="px-2 py-1 bg-dark-bg-tertiary text-dark-text-tertiary text-xs rounded">
                              Soon
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-dark-text-secondary mb-4">
                          {tool.description}
                        </p>
                        <Button
                          variant={tool.comingSoon ? 'outline' : 'primary'}
                          size="sm"
                          disabled={tool.comingSoon}
                          className="w-full"
                        >
                          {tool.comingSoon ? 'Coming Soon' : 'Use Tool'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

// Coded by Juan - tools curator and "manual work is for peasants" believer
// (Hope and dreams + actual tools. We've got both. You're welcome.)
// P.S. - Use the tools. Build the things. We're rooting for you. 🔧

