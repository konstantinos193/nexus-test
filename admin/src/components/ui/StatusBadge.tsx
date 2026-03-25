import { cn } from '@/lib/utils'
import type { TransactionStatus } from '@/lib/types'

interface StatusBadgeProps {
  status: TransactionStatus | 'active' | 'inactive' | string
  className?: string
  size?: 'sm' | 'md'
}

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  confirming: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
}

export function StatusBadge({
  status,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium capitalize',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-xs',
        style,
        className
      )}
    >
      {status}
    </span>
  )
}
