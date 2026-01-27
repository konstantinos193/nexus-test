/**
 * FAQ Page - Frequently Asked Questions (or "Answers Nobody Read Until They're Stuck")
 * The main page component that wraps FAQ content
 * This is where we pretend people actually read the docs before asking
 * (Spoiler: they don't. But we tried.)
 *
 * You've got questions? We've got... answers. Sometimes. Hopefully.
 * If the answer isn't here, good luck with that support ticket queue
 *
 * @author Juan - The developer who answered the same question 47 times
 * (Coded with hope that maybe, just maybe, someone will Ctrl+F first)
 */

// Layout - the structural backbone, like a spine but for web pages
// Without it we'd just be a pile of content bones (gross)
import Layout from '@/components/layout/Layout'
// FAQPageContent - where the actual Q&A magic happens
// This component has seen some things. So many repeated questions.
import FAQPageContent from '@/components/features/faq/FAQPageContent'
// faqs - the sacred data. The source of truth. The content we pray people actually read.
// Seriously, it's right there. Just... scroll. Please.
import { faqs } from '@/lib/data/faqs'

/**
 * FAQ Page Component - The main entry point for /faq
 * Renders when someone finally gives up googling and visits our FAQ
 * (Welcome! We've been expecting you. The lost ones always find their way here.)
 */
export default function FAQPage() {
  return (
    // Layout wrapper - header, footer, the usual suspects
    // Same deal as homepage: we need a frame before we hang the art
    <Layout>
      {/* FAQ Page Content - the meat and potatoes
          This is where faqs get rendered, accordions expand, and hope flickers
          We pass faqs like passing the torch. Or passing the buck. Same energy.
          (Please read these before opening a support ticket. We're begging you.) */}
      <FAQPageContent faqs={faqs} />
    </Layout>
  )
}

// Coded by Juan - FAQ maintainer and "did you check the FAQ?" enthusiast
// (Yes, we have an FAQ. Yes, people still ask. No, we're not surprised.)
// P.S. - If your question isn't here, it might become one. The circle of FAQ life.
