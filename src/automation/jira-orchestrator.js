require('dotenv').config();

const { JiraClient } = require('../jira/jira-client');
const { normalizeIssue } = require('../jira/jira-mapper');
const { analyzeRequirement } = require('../analysis/requirement-analyzer');
const { AIProvider } = require('../analysis/ai-provider');
const { JiraTestCaseService } = require('../jira/jira-testcase-service');
const { FrameworkGenerator } = require('../generation/framework-generator');
const { GitService } = require('../git/git-service');
const { GitHubClient } = require('../github/github-client');
const { review } = require('../review/code-reviewer');
const { runPlaywright } = require('../ci/pipeline-orchestrator');

function validateJiraKey(key) {
  return /^[A-Z][A-Z0-9]+-\d+$/.test(key || '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForChecks(github, sha, timeoutMs = 15 * 60 * 1000) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const [status, checks] = await Promise.all([
      github.getCombinedStatus(sha),
      github.getCheckRuns(sha)
    ]);

    const statusComplete =
      !status.total_count ||
      status.statuses.every(s => ['success', 'failure', 'error'].includes(s.state));

    const checksComplete =
      checks.total_count === 0 ||
      checks.check_runs.every(c =>
        ['completed'].includes(c.status)
      );

    const statusesPass =
      status.statuses.every(s => s.state === 'success');

    const checksPass =
      checks.check_runs.every(c => c.conclusion === 'success' || c.conclusion === 'neutral' || c.conclusion === 'skipped');

    if (statusComplete && checksComplete) {
      return {
        pass: statusesPass && checksPass,
        status,
        checks
      };
    }

    console.log('Waiting for GitHub Actions checks...');
    await sleep(15_000);
  }

  throw new Error('Timed out waiting for GitHub Actions checks.');
}

async function main(issueKey, locatorConfig = {}) {
  if (!validateJiraKey(issueKey)) {
    throw new Error('Usage: npm run jira:generate -- SCRUM-123');
  }

  const jira = new JiraClient();
  const github = new GitHubClient();
  const git = new GitService();

  console.log(`\n=== VantaQA automation orchestration: ${issueKey} ===`);

  // 1. Fetch Jira and analyze.
  const issue = normalizeIssue(await jira.getIssue(issueKey));
  const deterministic = analyzeRequirement(issue);
  const analysis = await new AIProvider().enrich(issue, deterministic);

  console.log(JSON.stringify({
    issue: issue.key,
    summary: issue.summary,
    layers: analysis.layers,
    gaps: analysis.gaps,
    testCases: analysis.testCases.map(t => `${t.id} [${t.layer}] ${t.title}`),
    automationFeasible: analysis.automationFeasible
  }, null, 2));

  // 2. Create branch from origin/main BEFORE changing/generating files.
  const branch = git.prepareBranch(issueKey);
  console.log(`Created branch from main: ${branch}`);

  // 3. Manual tests are created in Jira; automation is generated in the repository.
  const testcaseService = new JiraTestCaseService(jira);
  const manualTests = await testcaseService.createManualTestSubtasks(issue, analysis, false);
  const generated = new FrameworkGenerator().generate(issue, analysis, locatorConfig);

  // 4. Automated code review before commit/PR.
  const reviewResult = review();
  if (reviewResult.status !== 'PASS') {
    throw new Error('Code review failed. Fix the generated automation before creating the PR.');
  }

  // 5. Run generated automation locally before creating PR.
  // This is a hard gate. A test failure stops the workflow and prevents automatic merge.
  runPlaywright(issueKey);

  // 6. Commit and push branch.
  git.commitAndPush(branch, issueKey);

  // 7. Create PR.
  const pr = await github.createPullRequest({
    head: branch,
    title: `[VantaQA] ${issueKey} - ${issue.summary}`,
    body: [
      `## VantaQA automated change`,
      ``,
      `Jira: ${issueKey}`,
      `Branch: ${branch}`,
      ``,
      `### STLC layers`,
      analysis.layers.map(l => `- ${l}`).join('\n'),
      ``,
      `### Generated test cases`,
      analysis.testCases.map(tc => `- ${tc.id} [${tc.layer}] ${tc.title}`).join('\n'),
      ``,
      `### Manual test cases`,
      `Created/updated as Jira sub-tasks: ${manualTests.length}`,
      ``,
      `### Automated gates`,
      `- Requirement analysis: PASS`,
      `- Code review: PASS`,
      `- Playwright execution: PASS`,
      `- Automatic merge: enabled only after GitHub checks pass`
    ].join('\n')
  });

  console.log(`PR created: ${pr.html_url}`);

  // Optional GitHub reviewer request.
  const reviewers = (process.env.GITHUB_REVIEWERS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);

  if (reviewers.length) {
    await github.requestReviewers(pr.number, reviewers);
    console.log(`Requested GitHub reviewers: ${reviewers.join(', ')}`);
  }

  // The PR branch must pass GitHub Actions before automatic merge.
  const checkResult = await waitForChecks(github, pr.head.sha);

  if (!checkResult.pass) {
    throw new Error(`GitHub checks failed. PR ${pr.html_url} will not be auto-merged.`);
  }

  // 8. Automatic merge after all gates pass.
  const mergeResult = await github.mergePullRequest(pr.number, 'squash');

  if (!mergeResult.merged) {
    throw new Error(`GitHub did not merge PR automatically: ${mergeResult.message || 'unknown reason'}`);
  }

  console.log(`PR #${pr.number} merged successfully.`);
  console.log('Merge to main will trigger the main-branch CI pipeline and report workflow.');

  // 9. Save orchestration evidence.
  const fs = require('fs');
  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync(
    'artifacts/vantaqa-run.json',
    JSON.stringify({
      jiraKey: issueKey,
      branch,
      pullRequest: {
        number: pr.number,
        url: pr.html_url,
        merged: true
      },
      layers: analysis.layers,
      testCases: analysis.testCases,
      manualTestCount: manualTests.length,
      codeReview: reviewResult,
      localPlaywright: 'PASS',
      generated
    }, null, 2),
    'utf8'
  );
}

if (require.main === module) {
  const issueKey = process.argv.find(a => validateJiraKey(a));
  main(issueKey).catch(error => {
    console.error('\n[VantaQA FAILED]');
    console.error(error.response?.data || error.stack || error.message);
    process.exit(1);
  });
}

module.exports = { main };