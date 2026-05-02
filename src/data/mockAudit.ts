import type { AuditSummary } from '../types/audit'

export const mockAuditSummary: AuditSummary = {
  stage: {
    current: 1,
    total: 4,
    label: 'Create Draft',
  },
  metadata: {
    title: 'Capital Equipment Operational Audit',
    startDate: '12/08/2021',
    endDate: '-',
    auditManager: 'IAD Audit Manager3',
    leadAuditor: 'IAD Lead Auditor3',
  },
  completionPercent: 100,
}
