const fs = require('fs');
const path = require('path');

function createTriagePayload({ issueKey, error, reportPath = 'playwright-report' }) {
  const payload = {
    issueKey: issueKey || null,
    status: 'FAILED',
    rootCause: 'Pending automated analysis',
    severity: 'Medium',
    evidencePackage: {
      reportPath,
      screenshots: 'test-results/**',
      traces: 'test-results/**/trace.zip',
      videos: 'test-results/**/*.webm'
    },
    error: error?.message || 'Unknown Playwright failure',
    recommendation: 'Inspect trace, screenshot and application logs before creating a Jira defect.'
  };

  fs.mkdirSync(path.dirname('artifacts/defect-triage.json'), { recursive: true });
  fs.writeFileSync(
    'artifacts/defect-triage.json',
    JSON.stringify(payload, null, 2),
    'utf8'
  );

  return payload;
}

module.exports = { createTriagePayload };
