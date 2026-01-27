/**
 * Desktop Terms of Service Page Content
 * The original desktop layout with standalone CSS
 */

import '@/app/terms/terms.css'

interface Section {
  title: string
  content: string[]
}

interface DesktopTermsPageContentProps {
  sections: Section[]
}

export default function DesktopTermsPageContent({ sections }: DesktopTermsPageContentProps) {
  return (
    <div className="terms-container">
      {/* Hero Section */}
      <div className="terms-hero">
        <div className="terms-title-wrapper">
          <h1 className="terms-title">Terms of Service</h1>
        </div>
        <div className="terms-meta">
          January 25, 2026
        </div>
      </div>

      {/* Introduction */}
      <div className="terms-intro">
        <p className="terms-intro-text">
          Welcome to NeXus NFT Launchpad. These Terms of Service ("Terms") govern your access to and use of 
          our platform and services. By using NeXus, you agree to be bound by these Terms. Please read them carefully.
        </p>
      </div>

      {/* Terms Sections */}
      <div className="terms-sections">
        {sections.map((section, index) => (
          <div key={index} className="terms-section">
            <h2 className="terms-section-title">{section.title}</h2>
            <div className="terms-section-content">
              {section.content.map((paragraph, pIndex) => (
                <p key={pIndex}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="terms-contact">
        <div className="terms-contact-content">
          <h2 className="terms-contact-title">Questions About Our Terms?</h2>
          <p className="terms-contact-text">
            If you have any questions about these Terms of Service, please don't hesitate to reach out.
          </p>
          <div className="terms-contact-links">
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="terms-contact-link"
            >
              Discord
            </a>
            <span className="terms-contact-separator">•</span>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="terms-contact-link"
            >
              X (Twitter)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
