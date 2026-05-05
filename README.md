# Audit Report Quality Check UI

Enterprise-style **Audit Report Quality Check (AI-Assisted Review Tool)** for prompt-based analysis.

## What This App Does

- Lets users upload an audit report in `.docx` format.
- Extracts report text in the browser.
- Sends extracted text to a server-side Gemini endpoint.
- Runs prompt-based quality checks configured as data in `shared/qualityRules.ts`.
- Displays issue counts for each check plus overall issue total.
- Supports clickable quick filters from issue-count badges.
- Shows AI processing animation with step-by-step status messages while checks run.
- Shows a detailed results table with page/section/line/confidence/severity/original/recommended/rationale columns.
- Lets users select recommendations with checkboxes, apply them in place to the uploaded `.docx`, and download the updated document.

## Assignment Requirement Mapping

- **Report type dropdown:** includes `Draft` and `Final`.
- **File upload visibility:** always visible, independent of report type.
- **Quality check trigger:** appears once a file is uploaded.
- **AI processing feedback:** spinner + step list while review is running.
- **Quality check results:** per-rule issue counts plus findings table.
- **Quick filters:** clickable issue counts and severity filters.
- **Result columns:** page number, section, line, confidence, severity, original text, recommended text, rationale.
- **Recommendation selection:** row checkboxes + select-all + apply action.
- **Apply changes:** selected recommendations are merged into DOCX XML text runs.
- **Download updated document:** produced after apply operation.

## Quality Rules

Rules are centralized in `shared/qualityRules.ts` and consumed by:

- `server/quality/promptTemplate.ts` for model instructions.
- `server/quality/resultSchema.ts` for response validation.
- `server/routes/qualityCheck.ts` for server-side check coverage/completion behavior.

To add or update a rule, edit only `shared/qualityRules.ts`.

## Tech Stack

- Frontend: `React` + `TypeScript` + `Vite` + `Tailwind CSS`
- Form/validation: `react-hook-form` + `zod`
- `.docx` extraction: `mammoth`
- Backend API: `Express` + `@google/genai`
- Quality tooling: `ESLint` + `Prettier`

## Project Structure

```text
server/
  index.ts
  routes/
    qualityCheck.ts
  quality/
    promptTemplate.ts
    resultSchema.ts
shared/
  qualityRules.ts
src/
  features/audit/
    api/
      qualityCheckClient.ts
    components/
      QualityCheckSummary.tsx
      ReportUploadCard.tsx
      ReportTabs.tsx
      StageSidebar.tsx
      TopActionBar.tsx
    pages/
      AuditReportPage.tsx
    utils/
      wordTextExtractor.ts
  types/
    audit.ts
```

## Environment Setup

Create a `.env` file in project root:

```bash
GEMINI_API_KEY=your_gemini_api_key
SERVER_PORT=8787
```

You can copy from `.env.example`.

## Run Locally

Install dependencies:

```bash
npm install
```

Start backend server:

```bash
npm run dev:server
```

Start frontend Vite app (in another terminal):

```bash
npm run dev
```

Open: `http://localhost:5173`

## API Response Contract

Backend returns:

- `overallIssueCount: number`
- `abbreviatedMonthsScore: number`
- `coverage?: Array<{ checkId, status, reason, evidenceCount }>`
- `checks: Array<{ id, label, issueCount, examples, confidence? }>`
- `findings: Array<{ id, checkId, pageNumber, section, line, confidenceScore, severity, originalText, recommendedText, rationale }>`
- `modelSummary: string`

## Verification

```bash
npm run lint
npm run build
```

## Notes

- Gemini API key is server-side only.
- If Gemini returns malformed JSON, the backend responds with a safe parse error.
- Current AI quality flow supports `.docx` files only.
- In-place updates preserve run-level formatting as much as possible when replacing text in editable DOCX XML text runs.
- Quality checks are prompt-based and configurable; they are not hardcoded in route logic.
