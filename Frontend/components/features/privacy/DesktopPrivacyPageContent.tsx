/**
 * Desktop Privacy Policy Page Content
 * The original desktop layout with standalone CSS
 */

import '@/app/privacy/privacy.css'

interface Section {
  title: string
  content: string[]
}

interface DesktopPrivacyPageContentProps {
  sections: Section[]
}

export default function DesktopPrivacyPageContent({ sections }: DesktopPrivacyPageContentProps) {
  return (
    <div className="privacy-container">
      {/* Hero Section */}
      <div className="privacy-hero">
        <div className="privacy-title-wrapper">
          <h1 className="privacy-title">Privacy Policy</h1>
        </div>
        <div className="privacy-meta">
          January 25, 2026
        </div>
      </div>

      {/* Introduction */}
      <div className="privacy-intro">
        <p className="privacy-intro-text">
          At NeXus, we respect your privacy and are committed to protecting your personal information. 
          This Privacy Policy explains how we collect, use, and safeguard your information when you use 
          our NFT launchpad platform. Please read this policy carefully to understand our practices.
        </p>
      </div>

      {/* Policy Sections */}
      <div className="privacy-sections">
        {sections.map((section, index) => (
          <div key={index} className="privacy-section">
            <h2 className="privacy-section-title">{section.title}</h2>
            <div className="privacy-section-content">
              {section.content.map((paragraph, pIndex) => (
                <p key={pIndex}>{paragraph}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Contact Section */}
      <div className="privacy-contact">
        <div className="privacy-contact-content">
          <h2 className="privacy-contact-title">Questions About Privacy?</h2>
          <p className="privacy-contact-text">
            If you have any questions or concerns about this Privacy Policy, please reach out to us.
          </p>
          <div className="privacy-contact-links">
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="privacy-contact-link"
            >
              Discord
            </a>
            <span className="privacy-contact-separator">•</span>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="privacy-contact-link"
            >
              X (Twitter)
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
