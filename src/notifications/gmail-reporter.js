const fs = require('fs');
const nodemailer = require('nodemailer');

function buildSummary() {
  const reportPath = 'artifacts/playwright-report.json';

  if (!fs.existsSync(reportPath)) {
    return {
      status: 'UNKNOWN',
      summary: 'Playwright JSON report was not found.'
    };
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const stats = report.stats || {};
  const passed = stats.expected ?? stats.passed ?? 0;
  const failed = stats.unexpected ?? stats.failed ?? 0;
  const skipped = stats.skipped ?? 0;

  return {
    status: failed > 0 ? 'FAILED' : 'PASSED',
    summary: `Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`
  };
}

async function sendReportEmail() {
  const {
    GMAIL_USER,
    GMAIL_APP_PASSWORD,
    REPORT_EMAIL_TO,
    REPORT_EMAIL_FROM
  } = process.env;

  if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !REPORT_EMAIL_TO) {
    console.log('Gmail notification skipped: required environment variables are missing.');
    return;
  }

  const result = buildSummary();
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });

  const attachments = [];
  if (fs.existsSync('playwright-report')) {
    // GitHub Actions should upload the full report as an artifact.
    // Email contains the summary and optional JSON evidence to keep messages small.
  }
  if (fs.existsSync('artifacts/playwright-report.json')) {
    attachments.push({
      filename: 'playwright-report.json',
      path: 'artifacts/playwright-report.json'
    });
  }
  if (fs.existsSync('artifacts/defect-triage.json')) {
    attachments.push({
      filename: 'defect-triage.json',
      path: 'artifacts/defect-triage.json'
    });
  }

  await transporter.sendMail({
    from: REPORT_EMAIL_FROM || GMAIL_USER,
    to: REPORT_EMAIL_TO,
    subject: `[VantaQA] Playwright ${result.status}`,
    text: `VantaQA GitHub Actions execution\n\n${result.summary}\n\nStatus: ${result.status}`,
    attachments
  });

  console.log(`Gmail report sent to ${REPORT_EMAIL_TO}`);
}

if (require.main === module) {
  require('dotenv').config();
  sendReportEmail().catch(error => {
    console.error('Gmail notification failed:', error.message);
    process.exit(1);
  });
}

module.exports = { sendReportEmail, buildSummary };
