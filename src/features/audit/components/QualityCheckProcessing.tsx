import { LoaderCircle } from 'lucide-react'

type QualityCheckProcessingProps = {
  steps: string[]
  currentStep: number
}

export function QualityCheckProcessing({
  steps,
  currentStep,
}: QualityCheckProcessingProps) {
  return (
    <div className="rounded-md border border-brand-100 bg-brand-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        AI is processing the document
      </div>
      <ol className="mt-3 space-y-1 text-sm">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isActive = index === currentStep
          return (
            <li
              key={step}
              className={`rounded px-2 py-1 ${
                isActive
                  ? 'bg-white font-medium text-brand-700'
                  : isDone
                    ? 'text-emerald-700'
                    : 'text-slate-500'
              }`}
            >
              {isDone ? '✓' : isActive ? '•' : '○'} {step}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
