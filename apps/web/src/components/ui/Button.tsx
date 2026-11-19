import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet'
type ButtonSize = 'regular' | 'small'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'regular',
  icon,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rt-button rt-button--${variant} ${size === 'small' ? 'rt-button--small' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
      {icon}
    </button>
  )
}
