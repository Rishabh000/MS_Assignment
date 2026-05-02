import { useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Filter, WandSparkles } from 'lucide-react'
import { Card } from '../../../components/ui/Card'
import { Button } from '../../../components/ui/Button'
import type {
  QualityCheckId,
  QualityCheckResult,
  Severity,
} from '../../../types/audit'
import { applyRecommendationsInDocx } from '../utils/docxInPlaceUpdater'

type QualityCheckSummaryProps = {
  result: QualityCheckResult
  sourceFile: File | null
  onPreparedDocument: (blob: Blob, fileName: string) => void
}

export function QualityCheckSummary({
  result,
  sourceFile,
  onPreparedDocument,
}: QualityCheckSummaryProps) {
  const [activeCheckFilter, setActiveCheckFilter] = useState<QualityCheckId | 'all'>(
    'all',
  )
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<Severity | 'All'>(
    'All',
  )
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set())
  const [applyMessage, setApplyMessage] = useState<string>('')
  const [isApplying, setIsApplying] = useState<boolean>(false)

  const filteredFindings = useMemo(() => {
    return result.findings.filter((finding) => {
      const matchesCheck =
        activeCheckFilter === 'all' || finding.checkId === activeCheckFilter
      const matchesSeverity =
        activeSeverityFilter === 'All' || finding.severity === activeSeverityFilter
      return matchesCheck && matchesSeverity
    })
  }, [activeCheckFilter, activeSeverityFilter, result.findings])

  const filteredFindingIds = useMemo(
    () => filteredFindings.map((finding) => finding.id),
    [filteredFindings],
  )

  function toggleFindingSelection(findingId: string, checked: boolean) {
    const next = new Set(selectedFindingIds)
    if (checked) {
      next.add(findingId)
    } else {
      next.delete(findingId)
    }
    setSelectedFindingIds(next)
  }

  function setSelectAllFiltered(checked: boolean) {
    const next = new Set(selectedFindingIds)
    for (const id of filteredFindingIds) {
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
    }
    setSelectedFindingIds(next)
  }

  async function applyChangesAndDownload() {
    if (!sourceFile) {
      setApplyMessage('Original file not available. Please upload the report again.')
      return
    }

    const selectedFindings = result.findings.filter((finding) =>
      selectedFindingIds.has(finding.id),
    )
    if (selectedFindings.length === 0) {
      setApplyMessage('Select at least one recommendation to apply changes.')
      return
    }

    try {
      setIsApplying(true)
      const { blob, appliedCount } = await applyRecommendationsInDocx({
        sourceFile,
        findingsToApply: selectedFindings,
      })
      const baseName = sourceFile.name.replace(/\.docx$/i, '') || 'audit_report'
      const nextFileName = `${baseName}_updated.docx`
      onPreparedDocument(blob, nextFileName)

      setApplyMessage(
        `Applied ${appliedCount} in-place replacement(s). Updated document is ready to download.`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to apply recommendations in place.'
      setApplyMessage(message)
    } finally {
      setIsApplying(false)
    }
  }

  const allFilteredSelected =
    filteredFindingIds.length > 0 &&
    filteredFindingIds.every((id) => selectedFindingIds.has(id))

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800">AI Quality Check Results</h3>
          <p className="text-sm text-slate-500">{result.modelSummary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Total Issues: {result.overallIssueCount}
          </div>
          <div className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
            Abbreviated Months Score: {Math.round(result.abbreviatedMonthsScore)}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {result.checks.map((item) => {
          const hasIssues = item.issueCount > 0

          return (
            <article
              key={item.id}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                <button
                  type="button"
                  onClick={() =>
                    setActiveCheckFilter((current) =>
                      current === item.id ? 'all' : item.id,
                    )
                  }
                  className={`inline-flex min-h-9 min-w-14 items-center justify-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                    hasIssues
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  } ${
                    activeCheckFilter === item.id
                      ? 'ring-2 ring-brand-300'
                      : ''
                  }`}
                >
                  {hasIssues ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {item.issueCount}
                </button>
              </div>

              {typeof item.confidence === 'number' ? (
                <p className="mt-1 text-xs text-slate-500">
                  Confidence: {Math.round(item.confidence * 100)}%
                </p>
              ) : null}

              {item.examples.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {item.examples.slice(0, 2).map((example, index) => (
                    <li key={`${item.id}-${index}`}>- {example}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  No sample issues detected for this check.
                </p>
              )}
            </article>
          )
        })}
      </div>

      <div className="mt-6 rounded-md border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4" />
            Quick Filters
          </div>
          <Button
            type="button"
            variant={activeCheckFilter === 'all' ? 'primary' : 'outline'}
            onClick={() => setActiveCheckFilter('all')}
            className="h-8"
          >
            All Checks
          </Button>
          <Button
            type="button"
            variant={activeSeverityFilter === 'All' ? 'primary' : 'outline'}
            onClick={() => setActiveSeverityFilter('All')}
            className="h-8"
          >
            All Severity
          </Button>
          {(['High', 'Medium', 'Low'] as const).map((severity) => (
            <Button
              key={severity}
              type="button"
              variant={activeSeverityFilter === severity ? 'primary' : 'outline'}
              onClick={() => setActiveSeverityFilter(severity)}
              className="h-8"
            >
              {severity}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={(event) => setSelectAllFiltered(event.target.checked)}
                    aria-label="Select all visible recommendations"
                  />
                </th>
                <th className="px-3 py-2">Page Number</th>
                <th className="px-3 py-2">Section</th>
                <th className="px-3 py-2">Line</th>
                <th className="px-3 py-2">Confidence Score</th>
                <th className="px-3 py-2">Problem Severity</th>
                <th className="px-3 py-2">Original Text</th>
                <th className="px-3 py-2">Recommended Text</th>
                <th className="px-3 py-2">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {filteredFindings.map((finding) => (
                <tr key={finding.id} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedFindingIds.has(finding.id)}
                      onChange={(event) =>
                        toggleFindingSelection(finding.id, event.target.checked)
                      }
                      aria-label={`Select recommendation ${finding.id}`}
                    />
                  </td>
                  <td className="px-3 py-2">{finding.pageNumber}</td>
                  <td className="px-3 py-2">{finding.section}</td>
                  <td className="px-3 py-2">{finding.line}</td>
                  <td className="px-3 py-2">
                    {Math.round(finding.confidenceScore * 100)}%
                  </td>
                  <td className="px-3 py-2">{finding.severity}</td>
                  <td className="max-w-[220px] px-3 py-2">{finding.originalText}</td>
                  <td className="max-w-[220px] px-3 py-2">{finding.recommendedText}</td>
                  <td className="max-w-[260px] px-3 py-2">{finding.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredFindings.length === 0 ? (
          <p className="border-t border-slate-100 px-3 py-3 text-sm text-slate-500">
            No rows match the selected filters.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-3 py-3">
          <p className="text-xs text-slate-600">
            {selectedFindingIds.size} recommendation(s) selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={applyChangesAndDownload}
              disabled={isApplying || !sourceFile}
              className="inline-flex items-center gap-2"
            >
              <WandSparkles className="h-4 w-4" />
              {isApplying ? 'Applying...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      </div>

      {applyMessage ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {applyMessage}
        </p>
      ) : null}
    </Card>
  )
}
