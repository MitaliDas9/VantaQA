class JiraTestCaseService {
  constructor(jiraClient) {
    this.jiraClient = jiraClient;
  }

  async createManualTestSubtasks(issue, analysis, dryRun = false) {
    const results = [];

    const existingSummaries = new Set((issue.subtasks || []).map(s => s.summary));
    for (const testCase of analysis.testCases) {
      const summary = `[Manual Test][${testCase.layer}] ${issue.key} - ${testCase.title}`.slice(0, 255);
      if (existingSummaries.has(summary)) {
        results.push({ skipped: true, summary, reason: 'Manual test sub-task already exists.' });
        continue;
      }
      const description = [
        `Parent Jira Story: ${issue.key}`,
        `Test Case ID: ${testCase.id}`,
        `Test Layer: ${testCase.layer}`,
        `Source: ${testCase.source}`,
        `Scenario: ${testCase.title}`,
        `Automation Feasibility: ${analysis.automationFeasible ? 'Automatable' : 'Manual Only'}`,
        '',
        'Preconditions:',
        '- Application environment is available.',
        '- Required test data is available.',
        '',
        'Test Steps:',
        ...testCase.steps.map((step, index) => `${index + 1}. ${step}`),
        '',
        'Expected Result:',
        testCase.expected,
        '',
        'Requirement Gap / STLC Rationale:',
        testCase.source === 'Requirement'
          ? 'Derived directly from the Jira requirement.'
          : testCase.source === 'Requirement Gap'
            ? 'Generated to close a requirement gap identified during analysis.'
            : 'Generated because the VantaQA STLC model requires coverage for this test layer.',
        '',
        `Identified gaps: ${analysis.gaps.join(' | ') || 'None'}`
      ].join('\n');

      if (dryRun) {
        results.push({ dryRun: true, summary, description, layer: testCase.layer });
      } else {
        results.push(await this.jiraClient.createSubtask(issue.key, summary, description));
      }
    }

    return results;
  }
}

module.exports = { JiraTestCaseService };
