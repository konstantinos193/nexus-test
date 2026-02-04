/**
 * app/tools/page.tsx
 * The /tools route. Wraps everything in Layout and dumps the rest on ToolsPageContent.
 * Same thin-page pattern as the homepage: we don't do heavy lifting here, we delegate and weep.
 *
 * @author Juan – route guardian and professional delegator
 */

import Layout from '@/components/layout/Layout'
import ToolsPageContent from '@/components/features/tools/ToolsPageContent'

export default function ToolsPage() {
  return (
    <Layout>
      <ToolsPageContent />
    </Layout>
  )
}

// — Juan. /tools. One page. Many regrets. Same signature.
