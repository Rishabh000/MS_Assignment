type ProgressChipProps = {
  value: number
}

export function ProgressChip({ value }: ProgressChipProps) {
  const safeValue = Math.max(0, Math.min(value, 100))

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-slate-700">Overall Form Completion</p>
        <p className="text-xs text-slate-500">Completion of each form section</p>
      </div>
      <div className="ml-auto grid h-9 w-9 place-items-center rounded-full border-2 border-brand-500 bg-white text-xs font-bold text-brand-600">
        {safeValue}%
      </div>
    </div>
  )
}
