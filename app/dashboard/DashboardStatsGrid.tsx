/**
 * Dashboard Stats Grid - The four little cards that show numbers
 * Total Collections, Total Minted, Total Supply, Active
 * Because creators want to see their numbers at a glance
 * (And we're not making them open a spreadsheet. Yet.)
 *
 * Milestone 1: we show placeholders (0). Real data comes later.
 * Each card: label, value, icon in a colored wrapper (primary/success/secondary/warning)
 *
 * @author Juan - The developer who counted to four
 * (Coded with care, humor, and probably too much coffee)
 */

// Card - elevated variant for the stat cards
import { Card, CardContent } from '@/components/ui/Card'
// Icons - one per stat so the grid isn't just numbers
// Because numbers without icons are like coffee without a mug (functional but sad)
import { TrendingUp, Users, Image as ImageIcon } from 'lucide-react'

interface StatItem {
  label: string
  value: string | number
  iconWrapClass: string
  icon: React.ReactNode
}

// Stat definitions - label, value (0 for M1), CSS class for icon color, icon component
// We keep this in one place so adding a fifth stat is trivial
const STATS: StatItem[] = [
  {
    label: 'Total Collections',
    value: '0',
    iconWrapClass: 'icon-accent-primary',
    icon: <ImageIcon />,
  },
  {
    label: 'Total Minted',
    value: '0',
    iconWrapClass: 'icon-accent-success',
    icon: <TrendingUp />,
  },
  {
    label: 'Total Supply',
    value: '0',
    iconWrapClass: 'icon-accent-secondary',
    icon: <Users />,
  },
  {
    label: 'Active',
    value: '0',
    iconWrapClass: 'icon-accent-warning',
    icon: <TrendingUp />,
  },
]

export default function DashboardStatsGrid() {
  return (
    <div className="nft-dashboard-stats">
      {STATS.map(({ label, value, iconWrapClass, icon }) => (
        <Card key={label} variant="elevated" className="nft-dashboard-stat-card">
          <CardContent>
            <div className="nft-dashboard-stat-card-inner">
              <div>
                <p className="nft-dashboard-stat-label">{label}</p>
                <p className="nft-dashboard-stat-value">{value}</p>
              </div>
              {/* Icon wrapper - the accent class colors the icon (primary, success, etc.) */}
              <div className={`nft-dashboard-stat-icon-wrap ${iconWrapClass}`}>
                {icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Coded by Juan - because every good component needs a developer signature
// (Even if it's just a comment at the bottom)
// P.S. - Zero is a valid number. So is four. We have both.
