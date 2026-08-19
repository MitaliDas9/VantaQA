# VantaQA — Playwright + JavaScript + Jira Automation Framework

This scaffold implements the hackathon STLC flow shown in the supplied VantaQA architecture:

1. **Jira story intake**
2. **Requirement-gap detection**
3. **Test-layer identification**
4. **Automation-feasibility analysis**
5. **Jira sub-task creation for manual test cases**
6. **Branch naming: `EH-<jira-number>`**
7. **Page-object and test-script generation**
8. **Playwright execution**
9. **Failure evidence + retry/healing hooks**
10. **Defect-triage payload generation**
11. **GitHub Actions CI/CD**
12. **HTML/JSON report + Gmail notification**

## Important generation rules

- The generator accepts a Jira key, for example `SCRUM-123`.
- **No Jira key = no page object and no test file generation.**
- Ticket-specific automation is generated under `tests/jira/SCRUM-123/`.
- **Reusable components go under `tests/shared/`.**
- Login is treated as a reusable shared component:
  - `tests/shared/pages/LoginPage.js`
  - `tests/shared/tests/login.spec.js`
- The generator does **not** create login functionality inside any Jira ticket folder.
- Manual test cases are created as **Jira sub-tasks**, not stored as manual-test files in the automation repository.
- Ticket-specific test scripts are generated only for the provided Jira issue.
- The Jira story itself is not modified unless the configured API user has permission to create sub-tasks.

## Folder layout

```text
tests/
  shared/
    pages/
      LoginPage.js
    tests/
      login.spec.js
  jira/
    SCRUM-123/
      pages/
        <Feature>Page.js
      specs/
        SCRUM-123.spec.js
      data/
        test-data.json
      README.md

src/
  cli/
    generate-from-jira.js
  jira/
    jira-client.js
    jira-testcase-service.js
    jira-mapper.js
  analysis/
    requirement-analyzer.js
    ai-provider.js
  generation/
    framework-generator.js
    templates.js
  healing/
    locator-healer.js
  triage/
    defect-triage.js
  notifications/
    gmail-reporter.js

.github/workflows/playwright.yml
```

## Setup

```bash
npm install
npx playwright install
copy .env.example .env
```

Set the Jira and application values in `.env`.

For Jira Cloud, create an API token and use the Atlassian account email associated with it.

## Generate automation from Jira

```bash
npm run jira:generate -- SCRUM-123
```

Dry run:

```bash
npm run jira:dry-run -- SCRUM-123
```

The command:

- validates the Jira key
- fetches the Jira story
- analyzes acceptance criteria
- identifies test layers
- creates manual test-case sub-tasks in Jira
- generates ticket-specific page objects/test scripts
- leaves shared LoginPage/login test untouched unless they are absent

## GitHub Actions

Add these repository secrets:

- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `BASE_URL`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `REPORT_EMAIL_TO`
- `REPORT_EMAIL_FROM`

The workflow can also receive a Jira key manually through **workflow_dispatch**.

It runs:

```text
Generate from Jira
      ↓
Playwright tests
      ↓
HTML + JSON report
      ↓
Defect triage payload on failure
      ↓
Email summary to Gmail
      ↓
Upload Playwright report artifact
```

## Shared login policy

Login is intentionally centralized. Feature tests should call:

```js
await loginPage.login(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
```

Do not copy login locators into ticket-specific page objects.

## AI integration

`src/analysis/ai-provider.js` is an adapter point. The scaffold works without an AI key using deterministic parsing. A provider can be added later to perform richer:

- requirement gap detection
- Gherkin generation
- feasibility tagging
- test-layer classification
- page/locator suggestions

The framework never creates ticket-specific files without a Jira key.

## Healing and triage

`src/healing/locator-healer.js` provides a safe retry hook. It deliberately does not silently change application behavior. `src/triage/defect-triage.js` creates a structured evidence package from failed Playwright runs.

For a production implementation, the healing adapter can be connected to your preferred model/tool-calling service and governed by an approval policy.

## Manual test cases

The manual test-case output is a Jira sub-task such as:

```text
Summary: [Manual Test] SCRUM-123 - Verify <scenario>
Parent: SCRUM-123
Description:
  Preconditions
  Test steps
  Expected results
  Test layer
  Automation feasibility
```

No manual-test-case markdown/json is created in the automation framework.

## Demo flow

```bash
npm run jira:dry-run -- SCRUM-123
npm run jira:generate -- SCRUM-123
npm test
npm run report
```


## STLC five-layer rule

The generator now produces coverage for all five layers shown in the VantaQA STLC diagram:

1. Functional
2. Validation
3. Compatibility
4. Security
5. Performance

If Jira explicitly describes a layer, the generated case is marked `Requirement` or `STLC Layer`.

If Jira does not explicitly describe a layer, the generator creates a baseline case marked:

```text
STLC Recommended Coverage
```

This prevents missing coverage merely because the Jira story is short.

Requirement gaps also create concrete test cases. For example:

```text
Gap: Negative/boundary scenarios are not explicit.

Generated:
[Validation] Verify invalid and boundary input validation...
```

The same generated test case is represented in both places:

```text
Jira:
  Manual Test Sub-task

Repository:
  Playwright test
```

The generator is also idempotent for manual sub-tasks: if the exact generated manual-test summary already exists under the Jira parent, it skips creating a duplicate.


## Automated Git/PR/CI flow

The standard command:

```bash
npm run jira:generate -- SCRUM-123
```

now orchestrates:

```text
origin/main
   ↓
EH-SCRUM-123
   ↓
Jira manual test sub-tasks
   ↓
Automation generation
   ↓
Automated code review
   ↓
Local Playwright gate
   ↓
Push branch
   ↓
Create GitHub PR
   ↓
GitHub Actions checks
   ↓
Automatic PR merge
   ↓
main branch pipeline
   ↓
Playwright report
   ↓
Gmail notification
```

The process stops on any failed quality gate; it does not auto-merge failed automation.
