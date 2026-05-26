/**
 * Technical Debt Tracker - TODO comments with proper issue tracking
 * Because TODO comments without tickets are just forgotten promises
 */

export interface TechnicalDebt {
  id: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  component: string
  createdAt: string
  assignee?: string
  estimatedHours?: number
}

// Current technical debt items that need tickets
export const technicalDebtItems: TechnicalDebt[] = [
  {
    id: 'TECH-001',
    description: 'Implement wallet connection and mint functionality for drop page',
    priority: 'high',
    component: 'app/drops/[slug]/page.tsx',
    createdAt: '2025-03-26',
    assignee: 'backend-team',
    estimatedHours: 16
  },
  {
    id: 'TECH-002', 
    description: 'Implement mint quantity selection and validation',
    priority: 'high',
    component: 'app/drops/[slug]/page.tsx',
    createdAt: '2025-03-26',
    assignee: 'frontend-team',
    estimatedHours: 8
  },
  {
    id: 'TECH-003',
    description: 'Implement backend API for collection creation',
    priority: 'critical',
    component: 'hooks/useCreateCollectionForm.ts',
    createdAt: '2025-03-26',
    assignee: 'backend-team',
    estimatedHours: 24
  }
]

// Function to create GitHub issues from technical debt
export function createGitHubIssue(item: TechnicalDebt): string {
  const title = encodeURIComponent(item.description)
  const body = encodeURIComponent(`
## Technical Debt Item: ${item.id}

**Description:** ${item.description}
**Priority:** ${item.priority}
**Component:** ${item.component}
**Estimated Hours:** ${item.estimatedHours || 'TBD'}
**Assignee:** ${item.assignee || 'Unassigned'}

### Acceptance Criteria
- [ ] Implement the described functionality
- [ ] Add appropriate tests
- [ ] Update documentation
- [ ] Code review completed

### Notes
This was automatically generated from TODO comments in the codebase.
  `)
  
  return `https://github.com/your-org/your-repo/issues/new?title=${title}&body=${body}&labels=technical-debt,priority-${item.priority}&assignee=${item.assignee || ''}`
}
