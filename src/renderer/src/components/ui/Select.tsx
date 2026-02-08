import { SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-medium text-dock-muted">{label}</label>
        )}
        <select
          ref={ref}
          className={`w-full bg-dock-bg border border-dock-border rounded-lg px-3 py-2 text-sm text-dock-text
            focus:outline-none focus:ring-2 focus:ring-dock-accent/50 focus:border-dock-accent
            ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
