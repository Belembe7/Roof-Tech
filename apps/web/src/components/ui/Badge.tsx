import type { ReactNode } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'neutral'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  icon?: ReactNode
}

export function Badge({ children, variant = 'neutral', icon }: BadgeProps) {
  return (
    <span className={`rt-badge rt-badge--${variant}`}>
      {icon}
      {children}
    </span>
  )
}
