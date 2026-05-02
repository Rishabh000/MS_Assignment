import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement>

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none ring-brand-100 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 ${className}`}
      {...props}
    />
  )
}
