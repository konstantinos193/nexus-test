/**
 * Privacy Page Content Component
 * Conditionally renders mobile or desktop version based on screen size
 */

'use client'

import { useIsMobile } from '@/hooks/useMediaQuery'
import MobilePrivacyPageContent from './mobile/MobilePrivacyPageContent'
import DesktopPrivacyPageContent from './DesktopPrivacyPageContent'

interface Section {
  title: string
  content: string[]
}

interface PrivacyPageContentProps {
  sections: Section[]
}

export default function PrivacyPageContent({ sections }: PrivacyPageContentProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobilePrivacyPageContent sections={sections} />
  }

  return <DesktopPrivacyPageContent sections={sections} />
}
