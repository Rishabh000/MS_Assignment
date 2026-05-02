import type { SelectHTMLAttributes } from 'react'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-100 focus:border-brand-500 focus:ring-2 ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
