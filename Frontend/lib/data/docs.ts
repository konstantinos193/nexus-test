/**
 * Documentation data - shared by desktop and mobile docs pages
 */

import { type LucideIcon, Book, Code, Wallet, Image as ImageIcon, Settings, Zap } from 'lucide-react'

export interface DocTopic {
  title: string
  content: string
}

export interface DocSection {
  id: string
  title: string
  icon: LucideIcon
  description: string
  topics: DocTopic[]
}

export interface QuickLink {
  href: string
  title: string
  description: string
  external?: boolean
}

export const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    description: 'Learn the basics of NeXus and how to get started',
    topics: [
      { title: 'What is NeXus?', content: 'NeXus is a powerful NFT launchpad built on Solana, designed to make creating and launching NFT collections simple and accessible.' },
      { title: 'Creating your first collection', content: 'Start by connecting your wallet, then navigate to the Create page to begin your collection journey.' },
      { title: 'Setting up your wallet', content: 'We support Phantom and other Solana-compatible wallets. Connect securely to start minting.' },
      { title: 'Understanding Solana NFTs', content: 'Learn about Solana NFT standards, metadata, and how they differ from other blockchains.' },
    ],
  },
  {
    id: 'creating-collections',
    title: 'Creating Collections',
    icon: ImageIcon,
    description: 'Step-by-step guide to creating and launching NFT collections',
    topics: [
      { title: 'Collection creation process', content: 'Follow our intuitive wizard to set up your collection name, description, and artwork.' },
      { title: 'Uploading images and metadata', content: 'Upload your artwork and configure metadata attributes. We support batch uploads for efficiency.' },
      { title: 'Setting collection parameters', content: 'Configure supply, pricing, royalty percentages, and launch dates for your collection.' },
      { title: 'Launching your collection', content: 'Review your collection settings and launch when ready. Your collection will be live immediately.' },
    ],
  },
  {
    id: 'wallet-integration',
    title: 'Wallet Integration',
    icon: Wallet,
    description: 'How to connect and use wallets with NeXus',
    topics: [
      { title: 'Connecting Phantom wallet', content: 'Click the connect button and approve the connection in your Phantom wallet extension.' },
      { title: 'Signing transactions', content: 'All transactions require your signature. Review carefully before approving.' },
      { title: 'Managing wallet permissions', content: 'You can revoke permissions at any time through your wallet settings.' },
      { title: 'Troubleshooting wallet issues', content: 'If you experience connection issues, try refreshing the page or reconnecting your wallet.' },
    ],
  },
  {
    id: 'tools-features',
    title: 'Tools & Features',
    icon: Settings,
    description: 'Learn about all the tools available on NeXus',
    topics: [
      { title: 'Holder Export', content: 'Export a full snapshot of your collection holders — useful for airdrops, allowlists, and community management.' },
      { title: 'NFT Exchange', content: 'Buy and sell NFTs directly on our platform with integrated marketplace functionality.' },
      { title: 'Batch Distribute', content: 'Drop NFTs to multiple wallet addresses in one go using our bulk distribution tool.' },
      { title: 'Edit Metadata', content: 'Update on-chain metadata and attributes for any NFT in your collection after launch.' },
      { title: 'Incinerator', content: 'Permanently destroy selected NFTs from your supply using the burn tool.' },
    ],
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Code,
    description: 'Technical documentation for developers',
    topics: [
      { title: 'REST API endpoints', content: 'Access our RESTful API to programmatically interact with NeXus. Full endpoint documentation available.' },
      { title: 'Authentication', content: 'Use API keys for secure authentication. Generate keys in your dashboard settings.' },
      { title: 'Collection management API', content: 'Create, update, and manage collections through our API endpoints.' },
      { title: 'Webhook integration', content: 'Set up webhooks to receive real-time notifications about collection events.' },
    ],
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    icon: Book,
    description: 'Tips and best practices for NFT creators',
    topics: [
      { title: 'Image optimization', content: 'Use high-quality images (recommended: 2000x2000px) with optimized file sizes for faster loading.' },
      { title: 'Metadata best practices', content: 'Write clear, descriptive metadata. Include relevant attributes and traits for your collection.' },
      { title: 'Pricing strategies', content: 'Research similar collections and set competitive prices. Consider starting lower for initial traction.' },
      { title: 'Community building', content: 'Engage with your community on social media and build anticipation before launch.' },
    ],
  },
]

export const quickLinks: QuickLink[] = [
  { href: '/create', title: 'Create Your First Collection', description: 'Start creating NFTs in minutes' },
  { href: '/tools', title: 'Explore Tools', description: 'Discover all available tools' },
  { href: '/faq', title: 'FAQ', description: 'Find answers to common questions' },
  { href: 'https://github.com', title: 'GitHub Repository', description: 'View source code and contribute', external: true },
]
