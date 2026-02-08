import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  primary: 'bg-dock-accent hover:bg-blue-600 text-white',
  secondary: 'bg-dock-card hover:bg-dock-border text-dock-text border border-dock-border',
  danger: 'bg-dock-red/10 hover:bg-dock-red/20 text-dock-red border border-dock-red/20',
  ghost: 'hover:bg-dock-card text-dock-muted hover:text-dock-text',
  success: 'bg-dock-green/10 hover:bg-dock-green/20 text-dock-green border border-dock-green/20'
}

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
  lg: 'px-5 py-2.5 text-sm'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors
          focus:outline-none focus:ring-2 focus:ring-dock-accent/50 focus:ring-offset-1 focus:ring-offset-dock-bg
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
