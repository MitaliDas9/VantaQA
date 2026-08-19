const fs = require('fs');
const path = require('path');

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'playwright-report', 'test-results'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function review(root = process.cwd()) {
  const sourceFiles = walk(path.join(root, 'tests'))
    .filter(f => /\.(js|json)$/.test(f));

  const findings = [];

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');

    if (/password\s*=\s*['"][^'"]+['"]/i.test(content)) {
      findings.push({ severity: 'BLOCKER', file, message: 'Possible hard-coded password.' });
    }
    if (/api[_-]?token\s*=\s*['"][^'"]+['"]/i.test(content)) {
      findings.push({ severity: 'BLOCKER', file, message: 'Possible hard-coded API token.' });
    }
    if (/replace[- ]?me/i.test(content) && /tests[\\/](jira|shared)/.test(file)) {
      findings.push({ severity: 'BLOCKER', file, message: 'Generated automation still contains placeholder selector/URL.' });
    }
  }

  const report = {
    status: findings.some(f => f.severity === 'BLOCKER') ? 'FAIL' : 'PASS',
    findings,
    reviewedAt: new Date().toISOString(),
    policy: [
      'No hard-coded credentials or tokens',
      'No placeholder selectors/URLs in runnable generated tests',
      'Shared reusable components must remain under tests/shared'
    ]
  };

  fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'artifacts', 'code-review.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  return report;
}

if (require.main === module) {
  const report = review();
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'PASS' ? 0 : 1;
}

module.exports = { review };
