/**
 * Privacy Policy Page - The "Here's What We Know About You" Page
 * Where we document our data practices so you can make informed decisions
 * Because privacy matters, transparency is required, and lawyers insisted
 * (All three of those reasons apply equally. We honor all three.)
 *
 * Key thesis of this privacy policy:
 * - We collect minimal data
 * - We don't sell it
 * - Blockchain data is public by design (we didn't invent this, but we acknowledge it)
 * - IPFS storage is decentralized and permanent
 * - Your wallet is your identity here; we don't need your email
 *
 * This file: page metadata + static sections array + thin PrivacyPageContent wrapper
 * PrivacyPageContent: the actual responsive layout and rendering
 * You don't need to read this file to understand the privacy policy.
 * (You could just go to /privacy in a browser. That's generally faster.)
 *
 * @author Juan - Privacy policy scribe and "we genuinely don't sell your data" truther
 * (Coded with care, legal guidance, and one very strong opinion about data ethics)
 */

// Metadata type — the TypeScript shape for Next.js <head> configuration
// The Privacy page deserves proper SEO even if users don't search for it by choice
import type { Metadata } from 'next'

// SEO config — pageTitle formats "Privacy Policy | NeXus", absoluteUrl builds full URLs
// Search engines should be able to find our privacy policy. Transparency demands it.
import { pageTitle, absoluteUrl } from '@/lib/seo/config'

// PrivacyPageContent — the responsive privacy policy renderer
// Handles mobile/desktop layout, renders sections with proper typography
// Data comes from us; presentation comes from it. Clean separation.
import PrivacyPageContent from '@/components/features/privacy/PrivacyPageContent'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title and description for the Privacy Policy page
// "Privacy Policy" — clear, expected, exactly what someone searching would type

const title = 'Privacy Policy'

// Description — tells search engines (and users previewing from search results) what's here
const description =
  'Privacy Policy for NeXus NFT Launchpad - Learn how we collect, use, and protect your data. Understand our commitment to your privacy and data security.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Full metadata for the Privacy page
// Indexed so users can find our privacy policy when they look for it
// (They should be able to find it. GDPR, CCPA, and basic ethics all agree on this.)
export const metadata: Metadata = {
  // Title — "Privacy Policy | NeXus" in tabs, search results, and previews
  title: pageTitle(title),

  // Description — the quick summary for search snippets
  description,

  // Canonical — one official URL for the privacy policy
  // No duplicates. No confusion. One page.
  alternates: { canonical: absoluteUrl('/privacy') },

  // Open Graph — for social previews (unusual for a privacy page, but complete is better than partial)
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/privacy'),
  },

  // Twitter — same card content for X/Twitter previews
  twitter: {
    title: pageTitle(title),
    description,
  },

  // Robots — index the privacy policy, follow its links
  // Users need to be able to find our privacy policy via search
  // Hiding it would be both technically possible and deeply ironic
  robots: {
    index: true,  // Index it. People have a right to find it.
    follow: true, // Follow the links. They lead to legitimate parts of the platform.
  },
}

// ── Privacy Policy Content Data ───────────────────────────────────────────────
// The actual policy sections — static, server-side, no dynamic fetching needed
// This content changes rarely (yearly at most) so static is the right choice
// Each section has a title and an array of paragraph content strings

// We wrote this so you don't have to wonder what we collect.
// (And so regulators don't come knocking. Both are valid motivations.)
const sections = [
  {
    // What We Collect — wallet addresses, transaction history, usage patterns
    // We do NOT collect: names, emails, phone numbers (unless voluntarily provided)
    // Blockchain data is public by nature — this isn't collection, it's observation
    title: 'Information We Collect',
    content: [
      'When you use NeXus, we may collect information such as your wallet address, transaction history, collection data, and usage patterns. We collect this information to provide and improve our services.',
      // The "we don't collect PII unless you give it to us" paragraph
      // Wallet addresses are pseudonymous and publicly visible on-chain
      'We do not collect personal information like names, email addresses, or phone numbers unless you voluntarily provide them. Your wallet address is public on the blockchain and is not considered private information.',
    ],
  },
  {
    // How We Use It — service delivery, improvement, aggregated analytics
    // The two things we explicitly don't do: sell it, or use it non-anonymously for ads
    title: 'How We Use Your Information',
    content: [
      'We use collected information to provide, maintain, and improve our services, process transactions, and communicate with you about your account and our services.',
      // Aggregated analytics = patterns, not individuals
      // "We do not sell" — this is not boilerplate. We mean it.
      'We may use aggregated, anonymized data for analytics and to improve our platform. We do not sell your personal information to third parties.',
    ],
  },
  {
    // Blockchain Transparency — the "your on-chain activity is public forever" section
    // This is not us being creepy. This is how blockchains work.
    // We didn't design Solana. We're just clarifying how it operates.
    title: 'Blockchain Transparency',
    content: [
      // The immutability truth — wallet addresses, transactions, NFT ownership: all public
      'All transactions on the Solana blockchain are public and permanent. This means that your wallet address, transaction history, and NFT ownership are visible to anyone.',
      // We cannot delete blockchain data — this is technically true, not a cop-out
      'We cannot delete or modify blockchain data. Once a transaction is confirmed, it becomes part of the permanent blockchain record.',
    ],
  },
  {
    // Data Storage — IPFS for NFT assets, some server-side data for functionality
    // IPFS: decentralized, permanent, accessible to anyone with the CID
    // Server-side: minimal, functional, not sensitive
    title: 'Data Storage',
    content: [
      // IPFS storage — decentralized and permanent by design
      // Once your NFT image is on IPFS, it lives there. That's the feature.
      'NFT images and metadata are stored on IPFS (InterPlanetary File System), a decentralized storage network. This ensures permanent accessibility and decentralization.',
      // Server-side storage — only what's necessary for the platform to function
      'We may store some data on our servers for service functionality, but we do not store sensitive personal information beyond what is necessary for our services.',
    ],
  },
  {
    // Third-Party Services — analytics, hosting, wallet providers
    // We integrate with others. Those others have their own policies. Read them.
    // Phantom specifically — your Phantom interactions are governed by Phantom's policy.
    title: 'Third-Party Services',
    content: [
      'We may use third-party services for analytics, hosting, and other functions. These services have their own privacy policies, and we encourage you to review them.',
      // Wallet providers — specifically calling out Phantom and blockchain networks
      // Their data handling is their responsibility, not ours to disclaim away
      'We integrate with wallet providers (like Phantom) and blockchain networks. Your interactions with these services are governed by their respective privacy policies.',
    ],
  },
  {
    // Your Rights — access, update, delete (where possible), disconnect
    // The asterisk: blockchain data cannot be deleted. This is not a workaround. It's physics.
    title: 'Your Rights',
    content: [
      // Rights with the asterisk: blockchain data is immutable, rest is mutable
      'You have the right to access, update, or delete your account information. However, blockchain data cannot be deleted or modified once confirmed.',
      // Disconnect = stop the data collection tap for your wallet
      // Practical and effective. The nuclear option, but a clean one.
      'You can disconnect your wallet at any time, which will stop the collection of new data associated with your wallet address.',
    ],
  },
  {
    // Cookies and Tracking — what we use them for and what we don't
    // We use cookies for UX improvement, not for cross-site surveillance
    // No advertising networks. No tracking pixels. No "we know you looked at shoes on Amazon."
    title: 'Cookies and Tracking',
    content: [
      // Cookies for experience, not for surveillance
      // Browser settings are the control mechanism — we respect that
      'We may use cookies and similar technologies to improve your experience, analyze usage, and provide personalized content. You can control cookies through your browser settings.',
      // The explicit non-ad-tracking statement — we are not a data broker
      'We do not use cookies for advertising or tracking across other websites.',
    ],
  },
  {
    // Children's Privacy — we don't serve users under 18. Full stop.
    // If we accidentally collected data from a minor, contact us and we'll delete it.
    // COPPA compliance in spirit. We don't have a children's product and we don't want one.
    title: "Children's Privacy",
    content: [
      'Our services are not intended for users under the age of 18. We do not knowingly collect information from children. If you believe we have collected information from a child, please contact us immediately.',
    ],
  },
  {
    // Policy Updates — we may change this. We'll tell you when we do.
    // Continued use = acceptance. Same clause as the ToS. It's industry standard.
    // (Still slightly diabolical. We acknowledge this.)
    title: 'Changes to This Policy',
    content: [
      // How we'll notify you: update the page, update the date
      // We're not emailing every user. We're updating the page. You'll see it.
      'We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last Updated" date.',
      // The continued-use acceptance clause — standard, present, acknowledged
      'Your continued use of our services after changes are made constitutes acceptance of the updated policy.',
    ],
  },
  {
    // Contact — how to reach us with privacy questions
    // Discord, X, GitHub. The same three channels as everything else. Consistent.
    title: 'Contact Us',
    content: [
      'If you have questions about this Privacy Policy or our data practices, please contact us through our Discord community, X (Twitter), or GitHub.',
      // We respond — it says so right here, in the privacy policy
      // Which means we're contractually obligated to respond. In spirit at least.
      'We are committed to protecting your privacy and will respond to your inquiries promptly.',
    ],
  },
]

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * PrivacyPage - The exported default for /privacy
 * Passes the sections array to PrivacyPageContent for rendering
 * Static data + thin wrapper = fast, simple, correct
 *
 * Why is the sections data in this file and not a separate data file?
 * Because unlike the FAQs (which are also used by JSON-LD), the Privacy sections
 * are only consumed by this one page. No need to extract them separately.
 * Single consumer, single location. Simple.
 */
export default function PrivacyPage() {
  return (
    // Fragment — root layout handles nav/footer
    // PrivacyPageContent handles its own container and layout
    <>
      {/* PrivacyPageContent — the responsive privacy policy renderer
          Takes the sections array, renders mobile or desktop layout based on screen
          All the typography, spacing, and layout decisions live inside this component
          We provide the data. It provides the presentation. Clean division of labor. */}
      <PrivacyPageContent sections={sections} />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — privacy policy scribe and "we don't sell your data" truther (genuinely).
// Read this page. Or at least skim it. You deserve to know what we do with your wallet address.
// P.S. — Your data, your choice. We wrote it all down. We meant every word.
