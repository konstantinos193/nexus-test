/**
 * Terms of Service Page - The Legal Contract Nobody Reads But Everyone Agrees To
 * Where we lay down the rules in plain (ish) English so nobody can claim ignorance
 * Because every platform needs terms. It's the law. Literally. Legally.
 * (We're legally required to have this. Here it is. In all its glory.)
 *
 * Key facts about this page:
 * - Almost nobody reads it all the way through
 * - Everybody clicks "I accept" without reading it
 * - It's still legally binding when they do that
 * - Juan finds this deeply unsettling but accepts the reality of human nature
 *
 * The sections array below is the raw content — pure data, no JSX
 * TermsPageContent takes it and renders mobile or desktop layout based on screen size
 * Because terms of service on mobile is an experience we've optimized. Slightly.
 *
 * @author Juan - The developer who made ToS slightly less soul-crushing to actually look at
 * (Coded with care, humor, and legal review that definitely happened at some point)
 */

// Metadata type — the TypeScript shape for Next.js SEO configuration
// The ToS page deserves proper metadata even if nobody searches for it
import type { Metadata } from 'next'

// SEO config — pageTitle for formatted titles, absoluteUrl for canonical URLs
// "Terms of Service | NeXus" — as professional as it sounds
import { pageTitle, absoluteUrl } from '@/lib/seo/config'

// TermsPageContent — the responsive ToS renderer
// Handles mobile/desktop layout differences, renders sections and content arrays
// We hand it the data; it handles the presentation
import TermsPageContent from '@/components/features/terms/TermsPageContent'

// ── Page Identity ─────────────────────────────────────────────────────────────
// Title and description for the Terms page
// Descriptive enough for search engines, honest enough for users

const title = 'Terms of Service'

// Description — covers what the page is and who should care
// "read our terms and conditions" is as honest as it gets
const description =
  'Terms of Service for NeXus NFT Launchpad - Read our terms and conditions. Understand the rules and guidelines for using our NFT launchpad platform.'

// ── SEO Metadata ─────────────────────────────────────────────────────────────
// Full metadata for the Terms page — title, description, canonical, OG, Twitter, robots
// robots: index + follow because terms should be findable (transparency)
// Someone searching "NeXus terms of service" should be able to find this page easily
export const metadata: Metadata = {
  // Title — "Terms of Service | NeXus" in tabs and search results
  title: pageTitle(title),

  // Description — search snippet and social preview text
  description,

  // Canonical — prevents duplicate indexing if the page ever appears at multiple URLs
  alternates: { canonical: absoluteUrl('/terms') },

  // Open Graph — for when someone shares the ToS (it happens, usually in disagreement)
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/terms'),
  },

  // Twitter — same card for Twitter/X previews
  twitter: {
    title: pageTitle(title),
    description,
  },

  // Robots — index the terms page, follow its links
  // Transparency: we want people to be able to find our rules
  // That way they can't say they didn't know the rules existed
  robots: {
    index: true,  // Yes, index the Terms. They're public. They should be findable.
    follow: true, // Yes, follow the links. This is a trustworthy page.
  },
}

// ── Terms Content Data ────────────────────────────────────────────────────────
// The actual terms sections — title + content array pairs
// Passed to TermsPageContent which handles the rendering
// Defined here (server-side) because it's static data that never changes client-side
// (It barely changes server-side either. Last edited: whenever a lawyer had a thought.)

const sections = [
  {
    // Acceptance of Terms — the "by using this you agree" clause
    // The foundation of the entire legal agreement
    // Nobody reads this section. But its presence is what makes the agreement enforceable.
    title: 'Acceptance of Terms',
    content: [
      'By accessing and using NeXus NFT Launchpad ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.',
      // The modification clause — we reserve the right to update terms
      // "Continued use = acceptance" is the industry standard and also slightly diabolical
      'We reserve the right to modify these terms at any time. Your continued use of the Platform after changes are made constitutes acceptance of the updated terms.',
    ],
  },
  {
    // Eligibility — you must be 18+. No exceptions. Not even for "mature" 17-year-olds.
    // Also covers organizational users who need authority to bind the org to these terms
    title: 'Eligibility',
    content: [
      'You must be at least 18 years old to use NeXus. By using the Platform, you represent and warrant that you are of legal age in your jurisdiction.',
      'You must have the legal capacity to enter into binding agreements. If you are using the Platform on behalf of an organization, you must have authority to bind that organization to these terms.',
    ],
  },
  {
    // Platform Services — what we actually do and what we explicitly don't guarantee
    // We are a launchpad, not a success guarantee. Important distinction.
    title: 'Platform Services',
    content: [
      'NeXus provides tools and services for creating, launching, and managing NFT collections on the Solana blockchain. We act as a platform and do not control or guarantee the success of any NFT collection.',
      // The modification clause — we can change the platform at any time
      // "Without prior notice" is uncomfortable but legally necessary
      'We reserve the right to modify, suspend, or discontinue any aspect of the Platform at any time without prior notice. We are not liable for any losses resulting from such changes.',
    ],
  },
  {
    // User Responsibilities — the "don't do bad things" section
    // Wallet security, no illegal activities, no IP infringement
    // Standard platform terms. Every platform has them.
    title: 'User Responsibilities',
    content: [
      // Wallet security — your keys, your responsibility. We cannot recover lost wallets.
      // This is blockchain fundamentalism. We didn't invent the rule. We enforce it.
      'You are responsible for maintaining the security of your wallet and private keys. We are not responsible for any loss of funds or NFTs due to compromised wallets or lost private keys.',
      // No illegal activities — the "obviously" clause that still needs to be written down
      'You agree not to use the Platform for any illegal activities, including but not limited to money laundering, fraud, or violation of intellectual property rights.',
      // Content responsibility — you own what you create, and you're responsible for it
      'You are responsible for ensuring that any content you create, upload, or mint does not infringe on the rights of others, including copyrights, trademarks, or privacy rights.',
    ],
  },
  {
    // Intellectual Property — who owns what
    // Platform IP: us. Your NFT content: you (with a license grant to us for display)
    // The license grant is standard. It's how we show your NFTs on the platform.
    title: 'Intellectual Property',
    content: [
      'The Platform and its content, including but not limited to logos, designs, and software, are owned by NeXus and protected by intellectual property laws.',
      'When you create and mint NFTs through our Platform, you retain ownership of the underlying content. However, you grant us a license to use, display, and promote your NFTs for Platform purposes.',
    ],
  },
  {
    // Blockchain Transactions — the "all sales final, no refunds, ever" section
    // Blockchain is immutable. We can't reverse transactions. This is not a choice.
    // The blockchain made this rule. We're just documenting it.
    title: 'Blockchain Transactions',
    content: [
      // All transactions are final — because blockchain
      'All transactions on the Solana blockchain are final and irreversible. We cannot reverse, cancel, or modify blockchain transactions once they are confirmed.',
      // Verify before you sign — because we genuinely cannot fix it after
      'You are responsible for verifying all transaction details before confirming. We are not liable for any errors or losses resulting from incorrect transaction details.',
      // Network fees go to Solana, not us — important clarification
      'Network fees (gas fees) are required for all blockchain transactions and are paid directly to the Solana network, not to NeXus.',
    ],
  },
  {
    // Fees and Payments — how we charge (or don't, currently)
    // Creating collections is free. Gas fees are yours to handle. Premium features coming.
    title: 'Fees and Payments',
    content: [
      // Free tier — creating collections costs nothing in platform fees (only network gas)
      'Creating collections on NeXus is free. However, you are responsible for paying Solana network fees for all blockchain transactions.',
      // Future fees — honest disclosure that premium features might cost something someday
      'We reserve the right to introduce fees for certain premium features in the future. Any such fees will be clearly disclosed before you use those features.',
    ],
  },
  {
    // Prohibited Activities — the explicit "do not do these things" list
    // Hack us, post illegal content, impersonate people — all prohibited. In writing.
    // Violation leads to termination and potentially worse. Not a threat. A policy.
    title: 'Prohibited Activities',
    content: [
      'You agree not to: (a) use the Platform for any illegal purpose, (b) attempt to hack, disrupt, or interfere with the Platform, (c) create NFTs that contain illegal, harmful, or offensive content, (d) impersonate others or provide false information, (e) violate any applicable laws or regulations.',
      // Consequences — termination and potentially legal action. We mean it.
      'Violation of these prohibitions may result in immediate termination of your access to the Platform and potential legal action.',
    ],
  },
  {
    // Disclaimers and Limitations — the ALL-CAPS section that lawyers require
    // "AS IS" means we're not guaranteeing perfection. No platform can.
    // NFT value volatility disclaimer: very real, very important, very unignorable in 2026.
    title: 'Disclaimers and Limitations',
    content: [
      // The classic "AS IS / AS AVAILABLE" disclaimer — standard legal language
      // Caps-locked for legal tradition and also because lawyers believe in emphasis
      'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      // NFT value disclaimer — the market decides value, not us
      'We are not responsible for the value, legality, or authenticity of any NFTs created or traded through the Platform. NFT values are determined by market forces and are subject to volatility.',
      // Liability cap — standard limitation of liability clause
      'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.',
    ],
  },
  {
    // Indemnification — if you do something wrong and we get sued, you cover us
    // Standard. Expected. Present in basically every ToS in existence.
    title: 'Indemnification',
    content: [
      'You agree to indemnify, defend, and hold harmless NeXus, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform, violation of these terms, or infringement of any rights of another party.',
    ],
  },
  {
    // Termination — we can remove your access. You can remove yourself. Blockchain stays forever.
    // The on-chain record is permanent regardless of platform access. Immutability works both ways.
    title: 'Termination',
    content: [
      // We reserve the right to terminate — standard platform clause
      'We reserve the right to suspend or terminate your access to the Platform at any time, with or without cause or notice, for any reason including violation of these terms.',
      // Blockchain permanence — even after termination, your minted NFTs still exist on-chain
      'Upon termination, your right to use the Platform will immediately cease. However, blockchain transactions and NFT ownership are permanent and cannot be reversed.',
    ],
  },
  {
    // Governing Law — which jurisdiction's courts handle disputes
    // "Applicable laws" is intentionally vague here. Lawyers like options.
    title: 'Governing Law',
    content: [
      'These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.',
      // Arbitration/courts — disputes are resolved through binding arbitration or appropriate courts
      'Any disputes arising from these terms or your use of the Platform shall be resolved through binding arbitration or in the appropriate courts of jurisdiction.',
    ],
  },
  {
    // Contact Information — how to reach us with questions about the ToS
    // Discord, X, GitHub — our actual channels. We respond. Eventually.
    title: 'Contact Information',
    content: [
      'If you have questions about these Terms of Service, please contact us through our Discord community, X (Twitter), or GitHub.',
      // We respond to inquiries. We said it. It's binding now. (Sort of.)
      'We are committed to addressing your concerns and will respond to inquiries in a timely manner.',
    ],
  },
]

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * TermsPage - The exported default for /terms
 * Passes the sections array to TermsPageContent for responsive rendering
 * The data is defined above; the UI component handles the layout and typography
 * Mobile-optimized because people do read terms on their phones
 * (Usually right after agreeing to them. But still.)
 */
export default function TermsPage() {
  return (
    // Fragment — root layout handles the nav/footer scaffolding
    // TermsPageContent handles its own container layout
    <>
      {/* TermsPageContent — the responsive terms renderer
          Takes the sections array and renders it as a readable document
          Mobile/desktop responsive: different layouts, same content
          The "agree by using" energy. It's all here. Every clause. */}
      <TermsPageContent sections={sections} />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — ToS scribe and "you agreed to this by clicking Accept" enforcer.
// Nobody reads the ToS. Everybody agrees to it. We wrote it anyway. The lawyers appreciate it.
// P.S. — Read the Terms. Or don't. Either way, you agreed. Welcome to the platform.
