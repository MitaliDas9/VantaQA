# VantaQA - Instructions

## 1. Purpose

VantaQA converts a Jira story into:

1. Requirement-gap analysis
2. Test-layer identification
3. Manual test cases as **Jira sub-tasks**
4. Jira-specific Playwright page objects
5. Jira-specific Playwright automation test scripts
6. Test data and generation metadata

The framework also contains shared reusable components, GitHub Actions execution, failure evidence, defect-triage scaffolding, and Gmail reporting.

---

# 2. Important Rules

## Rule 1 - Jira number is mandatory

Do not generate feature automation without a Jira issue key.

Correct:

```bash
npm run jira:generate -- SCRUM-123
```

Incorrect:

```bash
npm run jira:generate
```

The second command fails and does not generate a Jira-specific page object or test.

---

## Rule 2 - Manual test cases are created in Jira

Manual test cases are **not** created as files inside the automation framework.

For:

```text
SCRUM-123
```

the generator creates Jira sub-tasks such as:

```text
SCRUM-123
 ├── [Manual Test] SCRUM-123 - Verify valid user flow
 ├── [Manual Test] SCRUM-123 - Verify invalid input
 └── [Manual Test] SCRUM-123 - Verify validation message
```

Each manual test sub-task contains:

- Parent Jira story
- Scenario
- Preconditions
- Test steps
- Expected result
- Test layers
- Automation feasibility
- Requirement gaps

---

## Rule 3 - Automation files are created in the repository

For Jira issue `SCRUM-123`, automation is generated under:

```text
tests/jira/SCRUM-123/
```

Expected structure:

```text
tests/
└── jira/
    └── SCRUM-123/
        ├── pages/
        │   └── <Feature>Page.js
        ├── specs/
        │   └── SCRUM-123.spec.js
        ├── data/
        │   └── test-data.json
        └── README.md
```

---

## Rule 4 - Login is shared

Login is a reusable component.

It exists only under:

```text
tests/shared/
├── pages/
│   └── LoginPage.js
└── tests/
    └── login.spec.js
```

Do **not** create another LoginPage or login test under every Jira ticket.

Feature automation should reuse the shared login component.

---

# 3. Prerequisites

Install:

- Node.js 20+
- npm
- Git
- Jira Cloud/API access
- Playwright-supported browser
- A test environment for the application

Verify Node:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

---

# 4. Install the Framework

Extract the VantaQA framework and open a terminal in the project directory.

Run:

```bash
npm install
```

Install Playwright Chromium:

```bash
npx playwright install --with-deps chromium
```

On Windows, if `--with-deps` is not required:

```bash
npx playwright install chromium
```

---

# 5. Configure Environment Variables

Copy:

```text
.env.example
```

to:

```text
.env
```

Windows:

```bash
copy .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Update the values.

Example:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=automation-bot@example.com
JIRA_API_TOKEN=your-jira-api-token
JIRA_PROJECT_KEY=SCRUM
JIRA_TEST_SUBTASK_ISSUE_TYPE=Sub-task

BASE_URL=https://your-application.example.com
TEST_USER_EMAIL=testuser@example.com
TEST_USER_PASSWORD=your-test-password

AI_PROVIDER=none
AI_API_KEY=
AI_MODEL=

REPORT_EMAIL_TO=qa-team@example.com
REPORT_EMAIL_FROM=automation-bot@example.com
GMAIL_USER=automation-bot@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
```

Never commit `.env`.

The repository already ignores it through `.gitignore`.

---

# 6. Jira Configuration

The Jira API account needs permission to:

- Browse/view the Jira project
- Read Jira issues
- Create sub-tasks
- Create issues of the configured sub-task type

For Jira Cloud, create an API token and use the Jira account email associated with that token.

Verify:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-jira-email
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=SCRUM
```

The project key must match the project containing the Jira story.

---

# 7. Generate Manual + Automation Tests from a Jira Story

This is the main command.

Example:

```bash
npm run jira:generate -- SCRUM-123
```

The framework performs the following flow:

```text
SCRUM-123
   |
   v
Fetch Jira Story
   |
   v
Requirement Analysis
   |
   +----> Requirement Gaps
   |
   +----> Test Layer Identification
   |
   +----> Automation Feasibility
   |
   v
Create Manual Test Sub-tasks in Jira
   |
   v
Generate Automation Page Object
   |
   v
Generate Playwright Test Spec
   |
   v
Generate Test Data
```

---

# 8. Dry Run - Recommended Before Creating Jira Sub-tasks

Before actually creating Jira sub-tasks, use:

```bash
npm run jira:dry-run -- SCRUM-123
```

This:

- Fetches the Jira story
- Performs analysis
- Shows the manual-test scenarios
- Does not create the Jira sub-tasks
- Generates the Jira-specific automation scaffold

Review the output before running the real generation command.

---

# 9. Actual Generation

After validating the dry run:

```bash
npm run jira:generate -- SCRUM-123
```

The framework creates:

## In Jira

Manual test sub-tasks:

```text
[Manual Test] SCRUM-123 - <scenario>
```

## In the automation repository

```text
tests/jira/SCRUM-123/
```

containing:

```text
pages/
specs/
data/
README.md
```

---

# 10. What Happens to Login?

Login is already available as:

```text
tests/shared/pages/LoginPage.js
```

and:

```text
tests/shared/tests/login.spec.js
```

The generator does not create:

```text
tests/jira/SCRUM-123/pages/LoginPage.js
```

and does not create:

```text
tests/jira/SCRUM-123/specs/login.spec.js
```

This prevents duplicate login functionality.

---

# 11. Using the Shared Login Page

A feature test should use the shared page object.

Example:

```js
const { test } = require('@playwright/test');
const { LoginPage } = require('../../shared/pages/LoginPage');

test('feature after login', async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();

  await loginPage.login(
    process.env.TEST_USER_EMAIL,
    process.env.TEST_USER_PASSWORD
  );

  await loginPage.expectLoggedIn();

  // Feature-specific steps go here.
});
```

The exact relative import depends on the location of the test file.

---

# 12. Run All Playwright Tests

Run:

```bash
npm test
```

Run with browser visible:

```bash
npm run test:headed
```

Run in debug mode:

```bash
npm run test:debug
```

Open Playwright UI mode:

```bash
npm run test:ui
```

---

# 13. Run the Generated Jira Test

After generating:

```text
SCRUM-123
```

run:

```bash
npx playwright test tests/jira/SCRUM-123/specs/SCRUM-123.spec.js
```

Run headed:

```bash
npx playwright test tests/jira/SCRUM-123/specs/SCRUM-123.spec.js --headed
```

Run with a specific browser project:

```bash
npx playwright test tests/jira/SCRUM-123/specs/SCRUM-123.spec.js --project=chromium
```

---

# 14. Important: Generated Tests Are Scaffolds

The generated page object contains placeholder selectors and URLs.

For example:

```js
this.heading = page.getByRole('heading', { name: /replace me/i });
```

and:

```js
await this.page.goto('/replace-me');
```

These are intentional placeholders.

During the hackathon, the AI/MCP generation layer can replace these with real:

- URLs
- Roles
- Labels
- Test IDs
- CSS selectors
- Page actions
- Assertions

Do not treat placeholder selectors as production application selectors.

---

# 15. Test Layers

VantaQA identifies these layers:

```text
Functional
Validation
Compatibility
Security
Performance
```

The analyzer automatically adds layers based on Jira requirement keywords.

Examples:

```text
"Verify invalid email"
```

may produce:

```text
Functional
Validation
```

A requirement mentioning browser compatibility may produce:

```text
Functional
Compatibility
```

A requirement mentioning roles/permissions may produce:

```text
Functional
Security
```

A requirement mentioning latency/load may produce:

```text
Functional
Performance
```

---

# 16. Requirement Gap Detection

The analyzer looks for missing requirements such as:

- Missing acceptance criteria
- Missing expected behavior
- Missing negative scenarios
- Missing boundary conditions

Example:

```text
Requirement:
User should be able to submit the form.
```

Possible gap:

```text
Negative/boundary scenarios are not explicit.
```

These gaps are included in the generated analysis and manual Jira sub-task.

---

# 17. Branch Naming

The VantaQA architecture uses:

```text
EH-<jira-number>
```

Example:

```text
EH-SCRUM-123
```

Generate the branch name with:

```bash
node scripts/create-branch-name.js SCRUM-123
```

Output:

```text
EH-SCRUM-123
```

Then create the branch:

```bash
git checkout -b EH-SCRUM-123
```

---

# 18. Recommended Hackathon Demo Flow

Use this exact flow during the demo.

## Step 1 - Select Jira story

Example:

```text
SCRUM-123
```

## Step 2 - Dry run

```bash
npm run jira:dry-run -- SCRUM-123
```

Show:

```text
Requirement gaps
Test layers
Automation feasibility
Scenarios
```

## Step 3 - Generate

```bash
npm run jira:generate -- SCRUM-123
```

Show Jira:

```text
SCRUM-123
   |
   +-- Manual Test Sub-task
   +-- Manual Test Sub-task
   +-- Manual Test Sub-task
```

Then show the repository:

```text
tests/jira/SCRUM-123/
```

## Step 4 - Show shared login

Show:

```text
tests/shared/pages/LoginPage.js
```

Explain:

> Login is a reusable component, so it is created once and reused by all Jira automation.

## Step 5 - Run the generated test

```bash
npx playwright test tests/jira/SCRUM-123/specs/SCRUM-123.spec.js --headed
```

## Step 6 - Show report

```bash
npm run report
```

## Step 7 - Show GitHub Actions

Push the branch:

```bash
git push origin EH-SCRUM-123
```

GitHub Actions runs the suite.

## Step 8 - Show Gmail

The workflow sends the execution summary to:

```text
REPORT_EMAIL_TO
```

---

# 19. GitHub Actions

Workflow:

```text
.github/workflows/playwright.yml
```

The workflow supports:

- Push
- Pull request
- Manual workflow execution

For manual workflow execution, provide:

```text
jira_key = SCRUM-123
```

The workflow then runs:

```text
Checkout
   ↓
Node setup
   ↓
npm ci
   ↓
Playwright installation
   ↓
Jira generation
   ↓
Playwright execution
   ↓
Defect triage
   ↓
Gmail notification
   ↓
Upload reports
```

---

# 20. GitHub Secrets

Configure these under:

```text
GitHub
→ Repository
→ Settings
→ Secrets and variables
→ Actions
→ New repository secret
```

Required:

```text
JIRA_BASE_URL
JIRA_EMAIL
JIRA_API_TOKEN
JIRA_PROJECT_KEY
JIRA_TEST_SUBTASK_ISSUE_TYPE

BASE_URL
TEST_USER_EMAIL
TEST_USER_PASSWORD

GMAIL_USER
GMAIL_APP_PASSWORD
REPORT_EMAIL_TO
REPORT_EMAIL_FROM
```

Do not place secrets directly inside:

```text
playwright.config.js
source files
test files
GitHub workflow YAML
```

---

# 21. Gmail Configuration

For Gmail notification, use a Google App Password.

Recommended setup:

```text
Google Account
   ↓
Enable 2-Step Verification
   ↓
Create App Password
   ↓
Use App Password as GMAIL_APP_PASSWORD
```

Example:

```env
GMAIL_USER=automation-bot@gmail.com
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
REPORT_EMAIL_TO=qa-team@example.com
REPORT_EMAIL_FROM=automation-bot@gmail.com
```

The workflow sends:

```text
Subject:
[VantaQA] Playwright PASSED
```

or:

```text
Subject:
[VantaQA] Playwright FAILED
```

The JSON execution report and defect-triage JSON are attached when available.

---

# 22. Reports

Playwright generates:

```text
playwright-report/
```

JSON:

```text
artifacts/playwright-report.json
```

Failure triage:

```text
artifacts/defect-triage.json
```

Test evidence:

```text
test-results/
```

Open the HTML report:

```bash
npm run report
```

---

# 23. Failure / Defect Triage Flow

When a Playwright test fails:

```text
Test Failure
     ↓
Screenshot
     ↓
Trace
     ↓
Video
     ↓
Defect Triage
     ↓
Root Cause
     ↓
Severity
     ↓
Evidence Package
```

The current scaffold creates:

```text
artifacts/defect-triage.json
```

Example structure:

```json
{
  "status": "FAILED",
  "rootCause": "Pending automated analysis",
  "severity": "Medium",
  "evidencePackage": {
    "reportPath": "playwright-report",
    "screenshots": "test-results/**",
    "traces": "test-results/**/trace.zip",
    "videos": "test-results/**/*.webm"
  }
}
```

The AI/MCP layer can later enrich root cause and severity.

---

# 24. Auto-Healing

The healing scaffold is located at:

```text
src/healing/locator-healer.js
```

The current implementation intentionally fails safely and logs the healing opportunity.

Recommended production flow:

```text
Locator Failure
     ↓
Capture DOM
     ↓
Capture screenshot
     ↓
Capture current locator
     ↓
AI/MCP analysis
     ↓
Suggest replacement locator
     ↓
Validate replacement
     ↓
Retry
     ↓
Persist only if approved
```

Do not allow an AI agent to silently rewrite locators without validation.

---

# 25. AI / MCP Integration

The adapter is:

```text
src/analysis/ai-provider.js
```

Currently:

```env
AI_PROVIDER=none
```

This means the deterministic analyzer is used.

During the hackathon, this can be replaced with an AI/MCP implementation that performs:

```text
Jira requirement
      ↓
AI analysis
      ↓
Gap identification
      ↓
Gherkin
      ↓
Test layer classification
      ↓
Automation feasibility
      ↓
Page object design
      ↓
Playwright code
```

Possible providers/tools can be integrated behind the adapter without changing the Jira or Playwright layers.

---

# 26. Complete Command Reference

Install:

```bash
npm install
```

Install browser:

```bash
npx playwright install chromium
```

Dry-run Jira generation:

```bash
npm run jira:dry-run -- SCRUM-123
```

Generate manual Jira sub-tasks + automation:

```bash
npm run jira:generate -- SCRUM-123
```

Run all tests:

```bash
npm test
```

Run headed:

```bash
npm run test:headed
```

Debug:

```bash
npm run test:debug
```

UI mode:

```bash
npm run test:ui
```

Open report:

```bash
npm run report
```

Create branch name:

```bash
node scripts/create-branch-name.js SCRUM-123
```

Lint:

```bash
npm run lint
```

Format:

```bash
npm run format
```

---

# 27. End-to-End Example

Suppose Jira contains:

```text
SCRUM-101
Summary:
User can search products

Acceptance criteria:
- User can enter a product name
- Matching products are displayed
- Invalid searches display a validation message
```

Run:

```bash
npm run jira:dry-run -- SCRUM-101
```

Then:

```bash
npm run jira:generate -- SCRUM-101
```

Jira receives manual test sub-tasks.

The repository receives:

```text
tests/jira/SCRUM-101/
├── pages/
│   └── UserCanSearchProductsPage.js
├── specs/
│   └── SCRUM-101.spec.js
├── data/
│   └── test-data.json
└── README.md
```

Shared login remains:

```text
tests/shared/pages/LoginPage.js
tests/shared/tests/login.spec.js
```

Run:

```bash
npx playwright test tests/jira/SCRUM-101/specs/SCRUM-101.spec.js
```

Then:

```bash
npm run report
```

---

# 28. Final Architecture

```text
                       JIRA
                         |
                         v
                +----------------+
                | Jira API / MCP |
                +----------------+
                         |
                         v
               Requirement Analysis
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
           Gaps      Test Layers   Feasibility
             |           |           |
             +-----------+-----------+
                         |
              +----------+----------+
              |                     |
              v                     v
       Jira Manual Tests       Automation Code
         as Sub-tasks             |
                                  v
                         tests/jira/<KEY>/
                         +----------------+
                         | Page Objects   |
                         | Playwright     |
                         | Test Data      |
                         +----------------+
                                  |
                                  v
                         Shared Components
                         tests/shared/
                         +--------------+
                         | LoginPage    |
                         +--------------+
                                  |
                                  v
                           GitHub Actions
                                  |
                  +---------------+---------------+
                  |               |               |
                  v               v               v
               Execute         Heal/Triage      Reports
                                                  |
                                                  v
                                               Gmail
```

---

# 29. Golden Rule

For every new Jira story:

```bash
npm run jira:generate -- <JIRA-KEY>
```

For example:

```bash
npm run jira:generate -- SCRUM-123
```

This is the single entry point for creating:

```text
Jira manual test sub-tasks
+
Jira-specific automation page objects
+
Jira-specific Playwright tests
```

Reusable functionality such as Login remains in:

```text
tests/shared/
```

and is never duplicated inside individual Jira folders.


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


---

# 30. FULL AUTOMATED JIRA -> BRANCH -> PR -> MERGE FLOW

The normal command now runs the complete VantaQA orchestration:

```bash
npm run jira:generate -- SCRUM-1
```

The sequence is:

```text
Jira SCRUM-1
      |
      v
Fetch requirement
      |
      v
Requirement gap analysis
      |
      v
Generate STLC test matrix
      |
      +------------------------------+
      |                              |
      v                              v
Create manual tests             Generate automation
as Jira sub-tasks               in repository
                                     |
                                     v
                         Create EH-SCRUM-1 from main
                                     |
                                     v
                              Automated code review
                                     |
                           +---------+---------+
                           |                   |
                         FAIL                 PASS
                           |                   |
                         STOP                  v
                                       Run Playwright
                                           |
                                  +--------+--------+
                                  |                 |
                                FAIL              PASS
                                  |                 |
                                STOP                v
                                             Commit + Push
                                                  |
                                                  v
                                             Create PR
                                                  |
                                                  v
                                      GitHub Actions / Checks
                                                  |
                                        +---------+---------+
                                        |                   |
                                      FAIL                PASS
                                        |                   |
                                       STOP                 v
                                                   Automatic PR merge
                                                           |
                                                           v
                                                  Merge into main
                                                           |
                                                           v
                                                 Main CI pipeline
                                                           |
                                             +-------------+-------------+
                                             |                           |
                                             v                           v
                                      Playwright report             Gmail email
```

## Required GitHub variables/secrets

Add:

```text
GITHUB_TOKEN
GITHUB_OWNER
GITHUB_REPO
GITHUB_BASE_BRANCH
GITHUB_REVIEWERS (optional)
```

`GITHUB_TOKEN` must be allowed to create pull requests and merge them. If your repository uses a fine-grained token, grant repository permissions for:

```text
Contents: Read and write
Pull requests: Read and write
Checks: Read
Actions: Read
```

The repository/workflow may also require:

```text
Settings
→ Actions
→ General
→ Workflow permissions
→ Read and write permissions
```

If your repository requires approving reviews before merge, configure an actual GitHub reviewer in:

```text
GITHUB_REVIEWERS=reviewer-username
```

The automation will request that reviewer. The generated code-review gate still runs before the PR is created.

## Automatic merge policy

Automatic merge happens only after:

1. Requirement analysis succeeds.
2. Automation is generated.
3. Automated code review passes.
4. Local Playwright tests pass.
5. PR is successfully created.
6. GitHub checks report success.
7. GitHub accepts the merge request.

If any gate fails, the process stops and the PR is not automatically merged.

## Important: generated placeholder tests

The code reviewer intentionally blocks generated automation containing:

```text
replace-me
```

or hard-coded credentials/tokens.

Therefore, for a real application, the AI/MCP generator must replace placeholder selectors/URLs before the automatic PR flow can pass.

This is intentional: the framework must not claim that unimplemented automation has passed.

## What happens after merge?

The merge to `main` triggers:

```text
.github/workflows/playwright.yml
```

The pipeline then:

- installs dependencies
- installs Playwright
- runs the test suite
- creates Playwright HTML/JSON reports
- creates defect-triage evidence on failure
- uploads reports as GitHub artifacts
- sends the execution summary to the configured email

## Safe branch behavior

The orchestrator refuses to start if the local Git working tree contains uncommitted changes.

It also refuses to overwrite an existing local:

```text
EH-<jira-number>
```

branch.

This prevents accidental loss of developer work.
