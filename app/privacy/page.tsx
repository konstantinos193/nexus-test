/**
 * Privacy Policy Page - The Legal Stuff
 * Where we tell you what we do with your data (and hope you still trust us)
 * Because privacy matters (even if we're not always great at it)
 * (And we're legally required to have this, so here it is)
 *
 * @author Juan - The developer who made legalese slightly less painful to scroll through
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
import { pageTitle, absoluteUrl, ogImagePath } from '@/lib/seo/config'
// Layout - header, footer. Even legal pages need a frame.
import Layout from '@/components/layout/Layout'
// Privacy page content with mobile/desktop detection
import PrivacyPageContent from '@/components/features/privacy/PrivacyPageContent'

const title = 'Privacy Policy'
const description =
  'Privacy Policy for NeXus Web3 Launchpad - Learn how we collect, use, and protect your data. Understand our commitment to your privacy and data security.'

export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  keywords: ['privacy policy', 'NeXus', 'Web3 launchpad', 'data protection'],
  alternates: { canonical: absoluteUrl('/privacy') },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: absoluteUrl('/privacy'),
    siteName: 'NeXus',
    title: pageTitle(title),
    description,
    images: [{ url: absoluteUrl(ogImagePath), width: 1200, height: 630, alt: 'NeXus – Privacy Policy' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: pageTitle(title),
    description,
    images: [absoluteUrl(ogImagePath)],
  },
}

// Policy sections - the actual content. What we collect, how we use it, etc.
// We wrote this so you don't have to wonder. (And so lawyers don't come knocking.)
const sections = [
  {
    title: 'Information We Collect',
    content: [
      'When you use NeXus, we may collect information such as your wallet address, transaction history, collection data, and usage patterns. We collect this information to provide and improve our services.',
      'We do not collect personal information like names, email addresses, or phone numbers unless you voluntarily provide them. Your wallet address is public on the blockchain and is not considered private information.',
    ],
  },
  {
    title: 'How We Use Your Information',
    content: [
      'We use collected information to provide, maintain, and improve our services, process transactions, and communicate with you about your account and our services.',
      'We may use aggregated, anonymized data for analytics and to improve our platform. We do not sell your personal information to third parties.',
    ],
  },
  {
    title: 'Blockchain Transparency',
    content: [
      'All transactions on the Solana blockchain are public and permanent. This means that your wallet address, transaction history, and NFT ownership are visible to anyone.',
      'We cannot delete or modify blockchain data. Once a transaction is confirmed, it becomes part of the permanent blockchain record.',
    ],
  },
  {
    title: 'Data Storage',
    content: [
      'NFT images and metadata are stored on IPFS (InterPlanetary File System), a decentralized storage network. This ensures permanent accessibility and decentralization.',
      'We may store some data on our servers for service functionality, but we do not store sensitive personal information beyond what is necessary for our services.',
    ],
  },
  {
    title: 'Third-Party Services',
    content: [
      'We may use third-party services for analytics, hosting, and other functions. These services have their own privacy policies, and we encourage you to review them.',
      'We integrate with wallet providers (like Phantom) and blockchain networks. Your interactions with these services are governed by their respective privacy policies.',
    ],
  },
  {
    title: 'Your Rights',
    content: [
      'You have the right to access, update, or delete your account information. However, blockchain data cannot be deleted or modified once confirmed.',
      'You can disconnect your wallet at any time, which will stop the collection of new data associated with your wallet address.',
    ],
  },
  {
    title: 'Cookies and Tracking',
    content: [
      'We may use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. You can control cookies through your browser settings.',
      'We do not use cookies for advertising or tracking across other websites.',
    ],
  },
  {
    title: 'Children\'s Privacy',
    content: [
      'Our services are not intended for users under the age of 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.',
    ],
  },
  {
    title: 'Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last Updated" date.',
      'Your continued use of our services after changes are made constitutes acceptance of the updated policy.',
    ],
  },
  {
    title: 'Contact Us',
    content: [
      'If you have questions about this Privacy Policy or our data practices, please contact us through our Discord community, X (Twitter), or GitHub.',
      'We are committed to protecting your privacy and will respond to your inquiries promptly.',
    ],
  },
]

/**
 * Privacy Page - Renders the full Privacy Policy
 * All those sections, Cards, and "we don't sell your data" energy. It's here.
 * Renders mobile or desktop version based on screen size
 */
export default function PrivacyPage() {
  return (
    <Layout>
      <PrivacyPageContent sections={sections} />
    </Layout>
  )
}

// Coded by Juan - privacy policy scribe and "we don't sell your data" truther
// (Read it. Or don't. But it's there. We tried.)
// P.S. - Your data, your choice. We're just documenting ours. 🔒
