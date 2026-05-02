import type { AuditSummary } from '../../../types/audit'
import { formatDisplayDate } from '../../../utils/format'
import { ProgressChip } from '../../../components/ui/ProgressChip'

type StageSidebarProps = {
  summary: AuditSummary
}

type MetadataFieldProps = {
  label: string
  value: string
}

function MetadataField({ label, value }: MetadataFieldProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">{value}</dd>
    </div>
  )
}

export function StageSidebar({ summary }: StageSidebarProps) {
  const { stage, metadata, completionPercent } = summary

  return (
    <aside className="w-full border-r border-slate-200 bg-slate-50 p-5 lg:w-72">
      <p className="text-xs font-semibold uppercase text-slate-500">Stage {stage.current}/{stage.total}</p>
      <p className="mt-1 text-sm text-slate-500">Your current stage</p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {Array.from({ length: stage.total }).map((_, index) => (
          <span
            key={`${index + 1}`}
            className={`h-1 rounded ${index < stage.current ? 'bg-brand-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <button
        type="button"
        className="mt-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
      >
        {stage.label}
      </button>

      <dl className="mt-6 space-y-4">
        <MetadataField label="Title" value={metadata.title} />
        <MetadataField label="Start Date" value={formatDisplayDate(metadata.startDate)} />
        <MetadataField label="End Date" value={formatDisplayDate(metadata.endDate)} />
        <MetadataField label="Audit Manager" value={metadata.auditManager} />
        <MetadataField label="Lead Auditor" value={metadata.leadAuditor} />
      </dl>

      <div className="mt-8">
        <ProgressChip value={completionPercent} />
      </div>
    </aside>
  )
}
