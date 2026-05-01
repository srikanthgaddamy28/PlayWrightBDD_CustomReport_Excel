# PlayWrightBDD_CustomReport_Excel
This framework implementing realtime bdd excel data extraction from excel test data files and custom report
# Playwright BDD Excel Demo

Created and maintained by automation-Playtester26.

This project demonstrates a Playwright + `playwright-bdd` automation setup where:

- feature files are written in Gherkin
- `Examples` tables can reference Excel workbooks and sheets instead of inline data
- a runtime runner expands Excel-backed examples before execution
- execution can be filtered by tags from an Excel run-selector file
- browser selection can be passed from the command line
- PDF evidence and Playwright report attachments are generated during test execution

## Project Layout

- `playwright.config.ts`: Playwright configuration and BDD generation setup
- `test-runner.ts`: runtime orchestration for feature expansion, tag filtering, browser selection, and cleanup
- `tests/features/`: Gherkin feature files
- `tests/step-definitions/`: BDD step definitions and hooks
- `tests/pages/`: page objects
- `tests/selectors/`: selector data in JSON
- `tests/credentials/`: credential data in JSON
- `tests/data/`: Excel test data workbooks
- `tests/runner-config/`: Excel run-selector workbook
- `tests/common-utils/`: Excel, screenshot, and PDF evidence utilities

## Prerequisites

- Node.js 18+
- npm

Install dependencies with:

```bash
npm install
```

Install Playwright browsers if needed:

```bash
npx playwright install
```

## How It Works

### 1. Excel-backed examples

Scenario outlines can keep only Excel metadata in the original feature file:

```gherkin
Examples:
    | excelFile      | sheetName          |
    | testData1.xlsx | LoginRoundTripData |
```

At runtime, the runner expands those metadata rows into real example rows using the Excel sheet headers and data rows.

### 2. Tag-based execution from Excel

The workbook at `tests/runner-config/run-selector.xlsx` controls which tags are enabled.

If a tag row is marked `yes`, it is included in the generated BDD tag expression. If marked `no`, it is excluded from the run.

### 3. Runtime orchestration

`test-runner.ts` does the following:

1. finds feature files
2. expands Excel-backed feature examples into `.runtime-features`
3. clears stale generated tests from `.features-gen`
4. reads enabled tags from `tests/runner-config/run-selector.xlsx`
5. runs `bddgen`
6. runs Playwright for the selected browser
7. clears runtime-expanded feature files afterward

## Running Tests

Run with Chromium:

```bash
npx ts-node test-runner.ts chromium
```

Run with Firefox:

```bash
npx ts-node test-runner.ts firefox
```

Run with WebKit:

```bash
npx ts-node test-runner.ts webkit
```

You can also forward extra Playwright CLI arguments after the browser name.

Example:

```bash
npx ts-node test-runner.ts chromium --headed
```

## Evidence and Reporting

The project includes two evidence utilities:

- `ScreenshotTaker`
- `PdfEvidenceGenerator`

Current behavior:

- screenshots can be attached directly to the Playwright report
- screenshots can be queued as evidence steps for PDF generation
- the generated PDF includes the scenario name, timestamp, step text, and screenshots
- the first page allows one screenshot
- subsequent pages allow two screenshots each
- the generated PDF is attached to the Playwright report

## Example Scenarios

The repository currently includes examples for:

- login validation
- secure-area content variants
- login/logout round trip with multiple Excel rows

## Useful Commands

Type-check the project:

```bash
npx tsc --noEmit
```

Run Playwright directly if needed:

```bash
npx playwright test --project=chromium
```

Open the HTML report:

```bash
npx playwright show-report
```

## License

This project is licensed under the Apache License 2.0. See the `LICENSE` file for details.
# PlayWrightBDD_CustomReport_Excel
