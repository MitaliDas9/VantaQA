const fs = require('fs');
const path = require('path');
const {
  pascalCase,
  pageObjectTemplate,
  specTemplate,
  sharedLoginPageTemplate,
  sharedLoginSpecTemplate
} = require('./templates');

class FrameworkGenerator {
  constructor(rootDir = process.cwd()) {
    this.rootDir = rootDir;
  }

  generate(issue, analysis, locatorConfig = {}) {
    if (!issue?.key) {
      throw new Error('Jira issue key is required. No files will be generated without a Jira key.');
    }

    // Reusable functionality is stored in shared and must never be duplicated
    // under a Jira ticket folder. Login is currently the shared reusable component.
    if (analysis.reusableComponent) {
      return this.generateSharedLogin(issue, analysis, locatorConfig);
    }

    return this.generateFeature(issue, analysis, locatorConfig);
  }

  generateFeature(issue, analysis, locatorConfig = {}) {
    const ticketDir = path.join(this.rootDir, 'tests', 'jira', issue.key);
    const pagesDir = path.join(ticketDir, 'pages');
    const specsDir = path.join(ticketDir, 'specs');
    const dataDir = path.join(ticketDir, 'data');

    for (const dir of [pagesDir, specsDir, dataDir]) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const className = `${pascalCase(issue.summary)}Page`;
    const pageFile = path.join(pagesDir, `${className}.js`);
    const specFile = path.join(specsDir, `${issue.key}.spec.js`);

    fs.writeFileSync(
      pageFile,
      pageObjectTemplate(className, issue.key, issue.summary, locatorConfig),
      'utf8'
    );

    fs.writeFileSync(
      specFile,
      specTemplate(
        issue.key,
        issue.summary,
        analysis.testCases,
        className,
        `../pages/${className}`
      ),
      'utf8'
    );

    this.writeMetadata(ticketDir, issue, analysis);

    return {
      type: 'jira-feature',
      ticketDir,
      pageFile,
      specFile,
      layers: analysis.layers,
      testCases: analysis.testCases.length
    };
  }

  generateSharedLogin(issue, analysis, locatorConfig = {}) {
    const sharedPagesDir = path.join(this.rootDir, 'tests', 'shared', 'pages');
    const sharedSpecsDir = path.join(this.rootDir, 'tests', 'shared', 'tests');
    fs.mkdirSync(sharedPagesDir, { recursive: true });
    fs.mkdirSync(sharedSpecsDir, { recursive: true });

    const pageFile = path.join(sharedPagesDir, 'LoginPage.js');
    const specFile = path.join(sharedSpecsDir, 'login.spec.js');

    // Only the reusable component is generated here. No tests/jira/<key>/ files.
    fs.writeFileSync(pageFile, sharedLoginPageTemplate(), 'utf8');
    fs.writeFileSync(
      specFile,
      sharedLoginSpecTemplate(issue.key, analysis.testCases),
      'utf8'
    );

    const sharedMetadata = path.join(
      this.rootDir,
      'tests',
      'shared',
      'LOGIN-COVERAGE.md'
    );

    fs.writeFileSync(
      sharedMetadata,
      `# Shared Login Coverage\n\nSource Jira: ${issue.key}\n\n` +
      `Layers: ${analysis.layers.join(', ')}\n\n` +
      `Generated test cases: ${analysis.testCases.length}\n\n` +
      analysis.testCases.map(tc =>
        `- [${tc.id}][${tc.layer}] ${tc.title} — ${tc.source}`
      ).join('\n') +
      '\n',
      'utf8'
    );

    return {
      type: 'shared-component',
      ticketDir: null,
      pageFile,
      specFile,
      layers: analysis.layers,
      testCases: analysis.testCases.length
    };
  }

  writeMetadata(ticketDir, issue, analysis) {
    fs.writeFileSync(
      path.join(ticketDir, 'data', 'test-data.json'),
      JSON.stringify({
        jiraKey: issue.key,
        layers: analysis.layers,
        gaps: analysis.gaps,
        testCases: analysis.testCases
      }, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(ticketDir, 'README.md'),
      `# ${issue.key}\n\n${issue.summary}\n\n` +
      `## STLC Test Layers\n${analysis.layers.map(l => `- ${l}`).join('\n')}\n\n` +
      `## Requirement Gaps\n${analysis.gaps.map(g => `- ${g}`).join('\n') || '- None'}\n\n` +
      `## Test Cases\n${analysis.testCases.map(tc => `- [${tc.id}][${tc.layer}] ${tc.title} (${tc.source})`).join('\n')}\n`,
      'utf8'
    );
  }
}

module.exports = { FrameworkGenerator };