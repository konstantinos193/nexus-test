/**
 * Terms Page Content Component
 * Conditionally renders mobile or desktop version based on screen size
 */

'use client'

import { useIsMobile } from '@/hooks/useMediaQuery'
import MobileTermsPageContent from './mobile/MobileTermsPageContent'
import DesktopTermsPageContent from './DesktopTermsPageContent'

interface Section {
  title: string
  content: string[]
}

interface TermsPageContentProps {
  sections: Section[]
}

export default function TermsPageContent({ sections }: TermsPageContentProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileTermsPageContent sections={sections} />
  }

  return <DesktopTermsPageContent sections={sections} />
}
