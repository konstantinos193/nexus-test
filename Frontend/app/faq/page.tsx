/**
 * FAQ Page - Frequently Asked Questions (or "Answers That Exist Before You Even Ask")
 * The authoritative Q&A page for NeXus NFT Launchpad
 * This is where we answer the questions so you don't have to open a support ticket
 * (We're not bitter about support tickets. We just prefer this.)
 *
 * You've got questions? We've got answers. Documented ones. Right here. Findable.
 * No appointment needed. No waiting. No "have you tried turning it off and on again."
 * (Okay, sometimes that answer is in there. It works surprisingly often.)
 *
 * If you're here reading this file instead of the FAQ page itself:
 * this file does one thing — it imports the FAQ data and passes it to FAQPageContent.
 * That's it. Everything else (the accordion UI, search, categories) is in FAQPageContent.
 *
 * @author Juan - The developer who answered the same question 47 times before writing this page
 * (Coded with the hope that maybe, MAYBE, someone will Ctrl+F before opening Discord)
 */

// FAQPageContent — the UI component that renders the FAQ accordion/list
// Takes the faqs array and transforms it into something users can actually read
// Handles search, filtering, expanded/collapsed states — all of it
// We just hand it the data and watch it work
import FAQPageContent from '@/components/features/faq/FAQPageContent'

// faqs — the sacred data. The canonical source of truth. The answers people seek.
// Lives in /lib/data/faqs so it can be used by both this page and the JSON-LD component
// (Two consumers, one source. DRY. Consistent. Clean. Unlike the FAQ inbox.)
// Seriously. It's right there. Just scroll. Just read it. Please.
import { faqs } from '@/lib/data/faqs'

// ── Page Component ────────────────────────────────────────────────────────────

/**
 * FAQPage - The exported default component for /faq
 * Renders when someone:
 * a) Gives up googling and navigates directly to /faq (welcome, you're in the right place)
 * b) Clicks the FAQ link in the nav (smart, efficient, we respect you)
 * c) Got linked here from a support response (we hope this resolves your question)
 * d) Is just exploring the site (also valid, also welcome)
 *
 * This component passes the faqs data to FAQPageContent.
 * It does not manage state. It does not fetch data.
 * It is a delivery mechanism for pre-loaded content. A humble, essential role.
 */
export default function FAQPage() {
  return (
    // Fragment — the root layout handles the nav and footer scaffolding
    // We just need to render the FAQ content component. Nothing else.
    <>
      {/* FAQPageContent — the full FAQ UI
          Receives the faqs array from the static data source
          Renders questions, answers, search box, category filters
          This is the page's entire reason for existing — answering questions
          Pass the faqs like passing a torch. Or passing the buck.
          (Torch. We're passing the torch. We're not passing the buck on support tickets.)
          Please read the FAQ before opening a support ticket.
          We are asking politely. */}
      <FAQPageContent faqs={faqs} />
    </>
  )
}

// ── Juan's Sign-Off ───────────────────────────────────────────────────────────
// Coded by Juan — FAQ maintainer, "did you check the FAQ?" evangelist, and answers-exist-already champion.
// The answers are here. They were always here. They will always be here.
// P.S. — If your question isn't in the FAQ yet, it will be. The circle of FAQ life continues.
