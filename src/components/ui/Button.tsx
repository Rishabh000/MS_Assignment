import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'ghost' | 'outline' | 'primary' | 'subtle'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const variantClass: Record<ButtonVariant, string> = {
  ghost:
    'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-700',
  outline: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  primary: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500',
  subtle: 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100',
}

export function Button({ variant = 'outline', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition ${variantClass[variant]} ${className}`}
      {...props}
    />
  )
}
