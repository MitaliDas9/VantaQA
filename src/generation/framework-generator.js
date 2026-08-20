const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
      throw new Error(
        'Jira issue key is required. No files will be generated without a Jira key.'
      );
    }

    if (analysis?.reusableComponent) {
      return this.generateSharedLogin(
        issue,
        analysis,
        locatorConfig
      );
    }

    return this.generateFeature(
      issue,
      analysis,
      locatorConfig
    );
  }

  generateFeature(
    issue,
    analysis,
    locatorConfig = {}
  ) {
    const ticketDir = path.join(
      this.rootDir,
      'tests',
      'jira',
      issue.key
    );

    const pagesDir = path.join(
      ticketDir,
      'pages'
    );

    const specsDir = path.join(
      ticketDir,
      'specs'
    );

    const dataDir = path.join(
      ticketDir,
      'data'
    );

    for (const directory of [
      pagesDir,
      specsDir,
      dataDir
    ]) {
      fs.mkdirSync(directory, {
        recursive: true
      });
    }

    const className =
      `${pascalCase(issue.summary)}Page`;

    const pageFile = path.join(
      pagesDir,
      `${className}.js`
    );

    const specFile = path.join(
      specsDir,
      `${issue.key}.spec.js`
    );

    /*
     * ---------------------------------------------------------
     * PAGE OBJECT
     * ---------------------------------------------------------
     */

    const pageSource = pageObjectTemplate(
      className,
      issue.key,
      issue.summary,
      locatorConfig
    );

    fs.writeFileSync(
      pageFile,
      pageSource,
      'utf8'
    );

    // Fail immediately if generated Page Object is invalid.
    this.validateJavaScript(pageFile);

    /*
     * ---------------------------------------------------------
     * SPECIFICATION
     * ---------------------------------------------------------
     */

    const specSource = specTemplate(
      issue.key,
      issue.summary,
      analysis.testCases || [],
      className,
      `../pages/${className}`
    );

    fs.writeFileSync(
      specFile,
      specSource,
      'utf8'
    );

    // Fail immediately if generated spec is invalid.
    this.validateJavaScript(specFile);

    /*
     * ---------------------------------------------------------
     * METADATA
     * ---------------------------------------------------------
     */

    this.writeMetadata(
      ticketDir,
      issue,
      analysis
    );

    return {
      type: 'jira-feature',
      ticketDir,
      pageFile,
      specFile,
      layers: analysis.layers || [],
      testCases:
        analysis.testCases?.length || 0
    };
  }

  generateSharedLogin(
    issue,
    analysis,
    locatorConfig = {}
  ) {
    const sharedPagesDir = path.join(
      this.rootDir,
      'tests',
      'shared',
      'pages'
    );

    const sharedSpecsDir = path.join(
      this.rootDir,
      'tests',
      'shared',
      'tests'
    );

    fs.mkdirSync(
      sharedPagesDir,
      { recursive: true }
    );

    fs.mkdirSync(
      sharedSpecsDir,
      { recursive: true }
    );

    const pageFile = path.join(
      sharedPagesDir,
      'LoginPage.js'
    );

    const specFile = path.join(
      sharedSpecsDir,
      'login.spec.js'
    );

    /*
     * Login is reusable.
     * Never create tests/jira/<issue>/ for login.
     */

    fs.writeFileSync(
      pageFile,
      sharedLoginPageTemplate(
        locatorConfig
      ),
      'utf8'
    );

    this.validateJavaScript(
      pageFile
    );

    fs.writeFileSync(
      specFile,
      sharedLoginSpecTemplate(
        issue.key,
        analysis.testCases || []
      ),
      'utf8'
    );

    this.validateJavaScript(
      specFile
    );

    const sharedMetadata =
      path.join(
        this.rootDir,
        'tests',
        'shared',
        'LOGIN-COVERAGE.md'
      );

    const testCases =
      analysis.testCases || [];

    fs.writeFileSync(
      sharedMetadata,
      [
        '# Shared Login Coverage',
        '',
        `Source Jira: ${issue.key}`,
        '',
        `Layers: ${(analysis.layers || []).join(', ')}`,
        '',
        `Generated test cases: ${testCases.length}`,
        '',
        ...testCases.map(
          tc =>
            `- [${tc.id}][${tc.layer}] ${tc.title} — ${tc.source || 'Jira'}`
        ),
        ''
      ].join('\n'),
      'utf8'
    );

    return {
      type: 'shared-component',
      ticketDir: null,
      pageFile,
      specFile,
      layers: analysis.layers || [],
      testCases: testCases.length
    };
  }

  validateJavaScript(filePath) {
    const result = spawnSync(
      process.execPath,
      ['--check', filePath],
      {
        encoding: 'utf8'
      }
    );

    if (result.error) {
      throw new Error(
        `Unable to validate generated JavaScript: ${result.error.message}`
      );
    }

    if (result.status !== 0) {
      const output = [
        result.stdout,
        result.stderr
      ]
        .filter(Boolean)
        .join('\n')
        .trim();

      throw new Error(
        [
          'Generated JavaScript syntax validation failed.',
          `File: ${filePath}`,
          '',
          output
        ].join('\n')
      );
    }
  }

  writeMetadata(
    ticketDir,
    issue,
    analysis
  ) {
    const testCases =
      analysis.testCases || [];

    const layers =
      analysis.layers || [];

    const gaps =
      analysis.gaps || [];

    fs.writeFileSync(
      path.join(
        ticketDir,
        'data',
        'test-data.json'
      ),
      JSON.stringify(
        {
          jiraKey: issue.key,
          layers,
          gaps,
          testCases
        },
        null,
        2
      ),
      'utf8'
    );

    const readme = [
      `# ${issue.key}`,
      '',
      issue.summary,
      '',
      '## STLC Test Layers',
      ...layers.map(
        layer => `- ${layer}`
      ),
      '',
      '## Requirement Gaps',
      gaps.length
        ? gaps.map(
            gap => `- ${gap}`
          )
        : ['- None'],
      '',
      '## Test Cases',
      testCases.length
        ? testCases.map(
            tc =>
              `- [${tc.id}][${tc.layer}] ${tc.title} (${tc.source || 'Jira'})`
          )
        : ['- None'],
      ''
    ].join('\n');

    fs.writeFileSync(
      path.join(
        ticketDir,
        'README.md'
      ),
      readme,
      'utf8'
    );
  }
}

module.exports = {
  FrameworkGenerator
};