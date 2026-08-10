import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'outline' | 'ghost'
  children: ReactNode
}

/** 平台統一按鈕。深藍實心為主要動作，outline / ghost 為次要。 */
export function Button({
  variant = 'solid',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 min-h-[44px]'
  const styles = {
    solid: 'bg-brand text-white hover:bg-ink',
    outline: 'border border-brand text-brand hover:bg-brand-pale/40',
    ghost: 'text-brand hover:bg-brand-pale/40',
  }[variant]
  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  )
}
