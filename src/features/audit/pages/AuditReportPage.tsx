import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Download } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Select } from '../../../components/ui/Select'
import { ReportUploadCard } from '../components/ReportUploadCard'
import { TopActionBar } from '../components/TopActionBar'
import { QualityCheckSummary } from '../components/QualityCheckSummary'
import { QualityCheckProcessing } from '../components/QualityCheckProcessing'
import { extractWordText } from '../utils/wordTextExtractor'
import { runQualityCheck } from '../api/qualityCheckClient'
import {
  reportTypeOptions,
  uploadFormSchema,
  type QualityCheckResult,
  type UploadFormValues,
} from '../../../types/audit'

const processingSteps = [
  'Parsing uploaded Word document',
  'Extracting key report sections',
  'Evaluating 9 quality rules',
  'Building issue counts and recommendation rows',
  'Preparing filtered quality-check results',
]

export function AuditReportPage() {
  const [submitMessage, setSubmitMessage] = useState<string>('')
  const [result, setResult] = useState<QualityCheckResult | null>(null)
  const [runError, setRunError] = useState<string>('')
  const [isRunningCheck, setIsRunningCheck] = useState<boolean>(false)
  const [processingStep, setProcessingStep] = useState<number>(0)
  const [preparedBlob, setPreparedBlob] = useState<Blob | null>(null)
  const [preparedFileName, setPreparedFileName] = useState<string>('')

  const {
    register,
    control,
    setValue,
    clearErrors,
    resetField,
    handleSubmit,
    formState: { errors },
  } = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      reportType: reportTypeOptions[0],
    },
  })

  useEffect(() => {
    register('reportFile')
  }, [register])

  const selectedFile = useWatch({ control, name: 'reportFile' }) ?? null
  const selectedReportType = useWatch({ control, name: 'reportType' }) ?? 'Draft'

  useEffect(() => {
    if (!isRunningCheck) return

    const intervalId = window.setInterval(() => {
      setProcessingStep((current) =>
        Math.min(current + 1, processingSteps.length - 1),
      )
    }, 1100)

    return () => window.clearInterval(intervalId)
  }, [isRunningCheck])

  function onFileSelection(file: File | null) {
    setResult(null)
    setRunError('')
    setSubmitMessage('')
    setPreparedBlob(null)
    setPreparedFileName('')

    if (!file) {
      resetField('reportFile')
      clearErrors('reportFile')
      return
    }
    clearErrors('reportFile')
    setValue('reportFile', file, { shouldValidate: true })
  }

  async function onSubmit(values: UploadFormValues) {
    try {
      setIsRunningCheck(true)
      setProcessingStep(0)
      setRunError('')
      setResult(null)
      setPreparedBlob(null)
      setPreparedFileName('')
      setSubmitMessage('Extracting report content and running quality checks...')

      const documentText = await extractWordText(values.reportFile)
      const qualityResult = await runQualityCheck({
        documentText,
        reportType: values.reportType,
      })

      setResult(qualityResult)
      setSubmitMessage(`Completed quality checks for "${values.reportFile.name}".`)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to run AI quality checks.'
      setRunError(message)
      setSubmitMessage('')
    } finally {
      setIsRunningCheck(false)
    }
  }

  function onPreparedDocument(blob: Blob, fileName: string) {
    setPreparedBlob(blob)
    setPreparedFileName(fileName)
  }

  function downloadPreparedDocument() {
    if (!preparedBlob || !preparedFileName) {
      setSubmitMessage('Apply changes first to prepare the updated document.')
      return
    }

    const url = URL.createObjectURL(preparedBlob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = preparedFileName
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800">
      <section className="mx-auto max-w-7xl border-x border-slate-200 bg-slate-100">
        <TopActionBar />
        <section className="px-4 py-4 md:px-6">
          <Card className="overflow-hidden">
            <div className="min-w-0 bg-white p-6">
                  <section className="mb-6">
                    <p className="mt-3 text-sm font-semibold text-slate-600">Overview</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload an audit report and verify quality requirements before submission.
                    </p>
                  </section>

                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                    <Card className="p-4">
                      <label htmlFor="reportType" className="mb-2 block text-sm font-semibold text-slate-700">
                        Report Type *
                      </label>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="max-w-xs">
                      <Select id="reportType" {...register('reportType')}>
                        {reportTypeOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </Select>
                    </div>
                    {selectedReportType === 'Final' ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={downloadPreparedDocument}
                        disabled={!preparedBlob || isRunningCheck}
                        className="inline-flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Updated Document
                      </Button>
                    ) : null}
                  </div>
                      {errors.reportType ? (
                        <p className="mt-2 text-sm text-red-600">{errors.reportType.message}</p>
                      ) : null}
                    </Card>

                    <ReportUploadCard file={selectedFile} onPickFile={onFileSelection} error={errors.reportFile?.message} />

                    {!selectedFile ? (
                      <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        Upload a Word report.
                      </p>
                    ) : null}

                    <div className="pt-1">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isRunningCheck || !selectedFile}
                        title={!selectedFile ? 'Upload a .docx file to enable' : undefined}
                        className="w-full sm:w-auto"
                      >
                        {isRunningCheck ? 'Running Checks...' : 'Run Quality Check'}
                      </Button>
                    </div>

                    {submitMessage ? (
                      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {submitMessage}
                      </p>
                    ) : null}

                    {runError ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {runError}
                      </p>
                    ) : null}

                    {isRunningCheck ? (
                      <QualityCheckProcessing
                        steps={processingSteps}
                        currentStep={processingStep}
                      />
                    ) : null}

                    {result ? (
                      <QualityCheckSummary
                        result={result}
                        sourceFile={selectedFile}
                        onPreparedDocument={onPreparedDocument}
                      />
                    ) : null}
                  </form>
            </div>
          </Card>
        </section>
      </section>
    </main>
  )
}
