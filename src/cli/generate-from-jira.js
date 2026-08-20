#!/usr/bin/env node

require('dotenv').config();
const { JiraClient } = require('../jira/jira-client');
const { normalizeIssue } = require('../jira/jira-mapper');
const { analyzeRequirement } = require('../analysis/requirement-analyzer');
const { AIProvider } = require('../analysis/ai-provider');
const { JiraTestCaseService } = require('../jira/jira-testcase-service');
const { FrameworkGenerator } = require('../generation/framework-generator');

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function validateJiraKey(key) {
  return /^[A-Z][A-Z0-9]+-\d+$/.test(key || '');
}

async function dryRun(issueKey) {
  const jira = new JiraClient();
  const issue = normalizeIssue(await jira.getIssue(issueKey));
  const analysis = await new AIProvider().enrich(issue, analyzeRequirement(issue));

  console.log(JSON.stringify({
    issue: issue.key,
    summary: issue.summary,
    acceptanceCriteriaCount: (analysis.acceptanceCriteria || []).length,
    acceptanceCriteria: analysis.acceptanceCriteria || [],
    layers: analysis.layers,
    gaps: analysis.gaps,
    testCases: analysis.testCases,
    automationFeasible: analysis.automationFeasible,
    reusableComponent: analysis.reusableComponent
  }, null, 2));

  const mappedTitles = (analysis.testCases || []).map(tc => `${tc.id} [${tc.layer}] ${tc.title}`);
  console.log(`Mapped ${mappedTitles.length} generated tests from acceptance criteria / derived coverage:`);
  mappedTitles.forEach(title => console.log(` - ${title}`));

  const coverageSummary = {
    acceptanceCriteriaCount: (analysis.acceptanceCriteria || []).length,
    gaps: analysis.gaps || [],
    missingCoverageByCategory: {
      validation: !(analysis.acceptanceCriteria || []).some(c => /error|invalid|negative|boundary|empty|required|exception/i.test(c)),
      security: !(analysis.acceptanceCriteria || []).some(c => /security|permission|role|access|authentication|authorization|login|credential|password|session|unauthori/i.test(c)),
      compatibility: !(analysis.acceptanceCriteria || []).some(c => /browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/i.test(c)),
      performance: !(analysis.acceptanceCriteria || []).some(c => /performance|latency|load|response time|throughput|concurrent|under .* second|seconds?/i.test(c))
    },
    reusableComponent: analysis.reusableComponent
  };

  console.log('Coverage gap summary:', JSON.stringify(coverageSummary, null, 2));

  const service = new JiraTestCaseService(jira);
  const subtasks = await service.createManualTestSubtasks(issue, analysis, true);
  console.log(`Dry-run manual test cases: ${subtasks.length}`);

  const generated = new FrameworkGenerator().generate(issue, analysis);
  console.log(`Dry-run automation generated at: ${generated.ticketDir || generated.pageFile}`);
}

async function main() {
  const issueKey = getArg('--issue') || process.argv.find(a => validateJiraKey(a));
  const dryRunFlag = process.argv.includes('--dry-run');

  if (!issueKey || !validateJiraKey(issueKey)) {
    throw new Error('A valid Jira key is required. Example: npm run jira:generate -- SCRUM-123');
  }

  if (dryRunFlag) {
    return dryRun(issueKey);
  }

  // Real generation runs the complete STLC automation orchestration:
  // main -> EH-<jira> branch -> Jira manual subtasks -> automation -> code review
  // -> local Playwright -> push -> PR -> GitHub checks -> auto merge -> main pipeline.
  return require('../automation/jira-orchestrator').main(issueKey);
}

main().catch(error => {
  console.error(error.response?.data || error.stack || error.message);
  process.exit(1);
});
