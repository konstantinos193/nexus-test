/**
 * Terms of Service Page - The Rules We All Agree To
 * Where we lay down the law (or at least try to)
 * Because every platform needs rules (even if nobody reads them)
 * (And we're legally required to have this, so here it is)
 *
 * @author Juan - The developer who made ToS slightly less soul-crushing to scroll
 * (Coded with care, humor, and probably too much coffee)
 */

import type { Metadata } from 'next'
// SEO config - pageTitle, URLs. Google's gotta know we have terms. We do. We have *many*.
import { pageTitle, absoluteUrl } from '@/lib/seo/config'
// Layout - header, footer. Legal pages need frames too. We're consistent like that.
import Layout from '@/components/layout/Layout'
// Terms page content with mobile/desktop detection
import TermsPageContent from '@/components/features/terms/TermsPageContent'

const title = 'Terms of Service'
const description =
  'Terms of Service for NeXus NFT Launchpad - Read our terms and conditions. Understand the rules and guidelines for using our NFT launchpad platform.'

export const metadata: Metadata = {
  title: pageTitle(title),
  description,
  alternates: { canonical: absoluteUrl('/terms') },
  openGraph: {
    title: pageTitle(title),
    description,
    url: absoluteUrl('/terms'),
  },
  twitter: {
    title: pageTitle(title),
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

const sections = [
  {
    title: 'Acceptance of Terms',
    content: [
      'By accessing and using NeXus NFT Launchpad ("the Platform"), you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.',
      'We reserve the right to modify these terms at any time. Your continued use of the Platform after changes are made constitutes acceptance of the updated terms.',
    ],
  },
  {
    title: 'Eligibility',
    content: [
      'You must be at least 18 years old to use NeXus. By using the Platform, you represent and warrant that you are of legal age in your jurisdiction.',
      'You must have the legal capacity to enter into binding agreements. If you are using the Platform on behalf of an organization, you must have authority to bind that organization to these terms.',
    ],
  },
  {
    title: 'Platform Services',
    content: [
      'NeXus provides tools and services for creating, launching, and managing NFT collections on the Solana blockchain. We act as a platform and do not control or guarantee the success of any NFT collection.',
      'We reserve the right to modify, suspend, or discontinue any aspect of the Platform at any time without prior notice. We are not liable for any losses resulting from such changes.',
    ],
  },
  {
    title: 'User Responsibilities',
    content: [
      'You are responsible for maintaining the security of your wallet and private keys. We are not responsible for any loss of funds or NFTs due to compromised wallets or lost private keys.',
      'You agree not to use the Platform for any illegal activities, including but not limited to money laundering, fraud, or violation of intellectual property rights.',
      'You are responsible for ensuring that any content you create, upload, or mint does not infringe on the rights of others, including copyrights, trademarks, or privacy rights.',
    ],
  },
  {
    title: 'Intellectual Property',
    content: [
      'The Platform and its content, including but not limited to logos, designs, and software, are owned by NeXus and protected by intellectual property laws.',
      'When you create and mint NFTs through our Platform, you retain ownership of the underlying content. However, you grant us a license to use, display, and promote your NFTs for Platform purposes.',
    ],
  },
  {
    title: 'Blockchain Transactions',
    content: [
      'All transactions on the Solana blockchain are final and irreversible. We cannot reverse, cancel, or modify blockchain transactions once they are confirmed.',
      'You are responsible for verifying all transaction details before confirming. We are not liable for any errors or losses resulting from incorrect transaction details.',
      'Network fees (gas fees) are required for all blockchain transactions and are paid directly to the Solana network, not to NeXus.',
    ],
  },
  {
    title: 'Fees and Payments',
    content: [
      'Creating collections on NeXus is free. However, you are responsible for paying Solana network fees for all blockchain transactions.',
      'We reserve the right to introduce fees for certain premium features in the future. Any such fees will be clearly disclosed before you use those features.',
    ],
  },
  {
    title: 'Prohibited Activities',
    content: [
      'You agree not to: (a) use the Platform for any illegal purpose, (b) attempt to hack, disrupt, or interfere with the Platform, (c) create NFTs that contain illegal, harmful, or offensive content, (d) impersonate others or provide false information, (e) violate any applicable laws or regulations.',
      'Violation of these prohibitions may result in immediate termination of your access to the Platform and potential legal action.',
    ],
  },
  {
    title: 'Disclaimers and Limitations',
    content: [
      'THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
      'We are not responsible for the value, legality, or authenticity of any NFTs created or traded through the Platform. NFT values are determined by market forces and are subject to volatility.',
      'To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.',
    ],
  },
  {
    title: 'Indemnification',
    content: [
      'You agree to indemnify, defend, and hold harmless NeXus, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Platform, violation of these terms, or infringement of any rights of another party.',
    ],
  },
  {
    title: 'Termination',
    content: [
      'We reserve the right to suspend or terminate your access to the Platform at any time, with or without cause or notice, for any reason including violation of these terms.',
      'Upon termination, your right to use the Platform will immediately cease. However, blockchain transactions and NFT ownership are permanent and cannot be reversed.',
    ],
  },
  {
    title: 'Governing Law',
    content: [
      'These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.',
      'Any disputes arising from these terms or your use of the Platform shall be resolved through binding arbitration or in the appropriate courts of jurisdiction.',
    ],
  },
  {
    title: 'Contact Information',
    content: [
      'If you have questions about these Terms of Service, please contact us through our Discord community, X (Twitter), or GitHub.',
      'We are committed to addressing your concerns and will respond to inquiries in a timely manner.',
    ],
  },
]

/**
 * Terms Page - Renders the full Terms of Service
 * All those sections, Cards, and "you agree to this by using us" energy. Classic.
 * Renders mobile or desktop version based on screen size
 */
export default function TermsPage() {
  return (
    <Layout>
      <TermsPageContent sections={sections} />
    </Layout>
  )
}
