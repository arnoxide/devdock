import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-dock-muted">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm text-dock-text
            placeholder:text-dock-muted/50
            focus:outline-none focus:ring-2 focus:ring-dock-accent/50 focus:border-dock-accent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-dock-red focus:ring-dock-red/50' : ''}
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-dock-red">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
