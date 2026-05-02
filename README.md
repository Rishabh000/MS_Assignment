# Audit Report Quality Check UI

Enterprise-style **Audit Report Quality Check (AI-Assisted Review Tool)** for prompt-based analysis.

## What This App Does

- Lets users upload an audit report in `.docx` format.
- Extracts report text in the browser.
- Sends extracted text to a server-side Gemini endpoint.
- Runs all 9 quality checks from `Quality_Check_Rules.xlsx`.
- Displays issue counts for each check plus overall issue total.
- Supports clickable quick filters from issue-count badges.
- Shows a detailed results table with page/section/line/confidence/severity/text/rationale columns.
- Lets users select recommendations with checkboxes, apply them in place to the uploaded `.docx`, and download the updated document.

## 9 Implemented Quality Checks

1. Front page title uppercase validation.
2. Observation title/body word overlap (minimum 50%).
3. Heavy jargon detection with simplification suggestions.
4. Stop/bad words frequency check.
5. Month abbreviation policy enforcement.
6. UK number format consistency checks.
7. Currency symbol policy checks.
8. UK spelling quality checks.
9. Double/triple spaces detection.

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
- In-place updates preserve original formatting where text matches are found inside editable DOCX XML text runs.
