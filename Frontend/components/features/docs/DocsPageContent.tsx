/**
 * Documentation Page Content Component
 * A modern, engaging documentation layout that doesn't look like generic docs
 * Because documentation doesn't have to be boring
 * (Even if the content sometimes is)
 *
 * Features:
 * - Desktop: sidebar navigation + smooth scrolling sections
 * - Mobile: dedicated mobile layout with accordion sections (MobileDocsPageContent)
 * - Modern dark theme matching our design
 *
 * @author Juan - The developer who made docs actually look good
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { docSections, quickLinks } from '@/lib/data/docs'
import MobileDocsPageContent from './mobile/MobileDocsPageContent'
import styles from './DocsPageContent.module.css'

export default function DocsPageContent() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileDocsPageContent />
  }

  return <DocsPageContentDesktop />
}

function DocsPageContentDesktop() {
  const [activeSection, setActiveSection] = useState(docSections[0].id)
  const [, setIsScrolling] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true)
      const sections = docSections.map(s => s.id)
      const scrollPosition = window.scrollY + 200

      for (let i = sections.length - 1; i >= 0; i--) {
        const element = document.getElementById(sections[i])
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(sections[i])
          break
        }
      }

      setTimeout(() => setIsScrolling(false), 150)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      setIsScrolling(true)
      const offset = 100
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - offset

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      })

      setActiveSection(sectionId)
      setTimeout(() => setIsScrolling(false), 500)
    }
  }

  return (
    <main className={styles.main}>
      {/* Main Content Container */}
      <div className={styles.container}>
        {/* Sidebar Navigation (Desktop) */}
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Documentation navigation">
            <ul className={styles.navList}>
              {docSections.map((section) => (
                <li key={section.id}>
                  <button
                    onClick={() => scrollToSection(section.id)}
                    className={`${styles.navItem} ${activeSection === section.id ? styles.navItemActive : ''}`}
                    aria-current={activeSection === section.id ? 'page' : undefined}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content Area */}
        <div className={styles.content}>
          {/* Documentation Sections */}
          {docSections.map((section) => {
            return (
              <section
                key={section.id}
                id={section.id}
                className={styles.docSection}
              >
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>{section.title}</h2>
                  <p className={styles.sectionDescription}>{section.description}</p>
                </div>

                <div className={styles.topics}>
                  {section.topics.map((topic, index) => (
                    <article key={index} className={styles.topic}>
                      <h3 className={styles.topicTitle}>{topic.title}</h3>
                      <p className={styles.topicContent}>{topic.content}</p>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}

          {/* Quick Links Section */}
          <section className={styles.quickLinksSection}>
            <div className={styles.quickLinksHeader}>
              <h2 className={styles.quickLinksTitle}>Quick Links</h2>
            </div>
            <div className={styles.quickLinksGrid}>
              {quickLinks.map((link, index) => {
                const LinkComponent = link.external ? 'a' : Link
                const linkProps = link.external
                  ? { href: link.href, target: '_blank', rel: 'noopener noreferrer' }
                  : { href: link.href }
                
                return (
                  <LinkComponent
                    key={index}
                    {...linkProps}
                    className={styles.quickLink}
                  >
                    <div className={styles.quickLinkContent}>
                      <h3 className={styles.quickLinkTitle}>{link.title}</h3>
                      <p className={styles.quickLinkDescription}>{link.description}</p>
                    </div>
                    {link.external ? (
                      <ExternalLink className={styles.quickLinkIcon} size={20} />
                    ) : (
                      <ArrowRight className={styles.quickLinkIcon} size={20} />
                    )}
                  </LinkComponent>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
