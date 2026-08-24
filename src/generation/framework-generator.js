'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const {
  pascalCase,
  pageObjectTemplate,
  specTemplate,
  sharedLoginPageTemplate,
  sharedLoginSpecTemplate,
  dataTemplate,
  filterAllowedTestCases,
  normalizeLayer
} = require('./templates');

class FrameworkGenerator {

  constructor(
    rootDir = process.cwd()
  ) {
    this.rootDir = rootDir;
  }

  /**
   * ----------------------------------------------------------
   * MAIN GENERATION ENTRY
   * ----------------------------------------------------------
   */

  generate(
    issue,
    analysis = {},
    locatorConfig = {}
  ) {
    if (!issue?.key) {
      throw new Error(
        'Jira issue key is required. No files will be generated without a Jira key.'
      );
    }

    /**
     * Login is reusable.
     *
     * Only an explicitly identified reusable login Jira
     * requirement can generate the shared LoginPage.
     *
     * Normal feature Jira tickets MUST NOT generate:
     *
     * tests/jira/<KEY>/pages/LoginPage.js
     * tests/jira/<KEY>/specs/login.spec.js
     */

    if (
      analysis?.reusableComponent === true &&
      this.isLoginRequirement(
        issue,
        analysis
      )
    ) {
      return this.generateSharedLogin(
        issue,
        analysis
      );
    }

    return this.generateFeature(
      issue,
      analysis,
      locatorConfig
    );
  }

  /**
   * ----------------------------------------------------------
   * FEATURE GENERATION
   * ----------------------------------------------------------
   */

  generateFeature(
    issue,
    analysis = {},
    locatorConfig = {}
  ) {
    const ticketDir =
      path.join(
        this.rootDir,
        'tests',
        'jira',
        issue.key
      );

    const pagesDir =
      path.join(
        ticketDir,
        'pages'
      );

    const specsDir =
      path.join(
        ticketDir,
        'specs'
      );

    const dataDir =
      path.join(
        ticketDir,
        'data'
      );

    for (
      const dir of [
        pagesDir,
        specsDir,
        dataDir
      ]
    ) {
      fs.mkdirSync(
        dir,
        {
          recursive: true
        }
      );
    }

    const className =
      `${pascalCase(issue.summary)}Page`;

    const pageFile =
      path.join(
        pagesDir,
        `${className}.js`
      );

    const specFile =
      path.join(
        specsDir,
        `${issue.key}.spec.js`
      );

    const dataFile =
      path.join(
        dataDir,
        'test-data.js'
      );

    /**
     * --------------------------------------------------------
     * DEFENSIVE TEST CASE FILTERING
     * --------------------------------------------------------
     *
     * Jira analysis may still contain:
     *
     * Security
     * Performance
     * Compatibility
     *
     * Those cases are discarded here before they reach
     * the templates.
     */

    const rawTestCases =
      Array.isArray(
        analysis?.testCases
      )
        ? analysis.testCases
        : [];

    const testCases =
      filterAllowedTestCases(
        rawTestCases
      );

    /**
     * Layers are derived from the filtered test cases.
     *
     * We deliberately do NOT trust analysis.layers because
     * that array may contain Security/Performance/Compatibility.
     */

    const layers = [
      ...new Set(
        testCases
          .map(
            testCase =>
              normalizeLayer(
                testCase?.layer
              )
          )
          .filter(Boolean)
      )
    ];

    /**
     * Shared PIM navigation.
     */

    const requiresPIMNavigation =
      this.requiresPIMNavigation(
        issue,
        {
          ...analysis,
          testCases
        }
      );

    /**
     * --------------------------------------------------------
     * PAGE OBJECT
     * --------------------------------------------------------
     */

    const pageSource =
      pageObjectTemplate(
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

    /**
     * --------------------------------------------------------
     * FEATURE SPEC
     * --------------------------------------------------------
     */

    const specSource =
      specTemplate({
        issueKey:
          issue.key,

        summary:
          issue.summary,

        pageImport:
          `../pages/${className}`,

        pageClass:
          className,

        dataImport:
          `../data/test-data`,

        testCases,

        layers,

        requiresPIMNavigation
      });

    fs.writeFileSync(
      specFile,
      specSource,
      'utf8'
    );

    /**
     * --------------------------------------------------------
     * DATA
     * --------------------------------------------------------
     */

    fs.writeFileSync(
      dataFile,
      dataTemplate({
        issueKey:
          issue.key,

        summary:
          issue.summary
      }),
      'utf8'
    );

    /**
     * --------------------------------------------------------
     * METADATA
     * --------------------------------------------------------
     */

    this.writeMetadata(
      ticketDir,
      issue,
      {
        ...analysis,
        testCases,
        layers,
        requiresPIMNavigation
      }
    );

    /**
     * --------------------------------------------------------
     * JAVASCRIPT VALIDATION
     * --------------------------------------------------------
     *
     * This must happen after all generated files exist.
     */

    this.validateJavaScript(
      pageFile
    );

    this.validateJavaScript(
      specFile
    );

    this.validateJavaScript(
      dataFile
    );

    return {
      type:
        'jira-feature',

      ticketDir,

      pageFile,

      specFile,

      dataFile,

      layers,

      testCases:
        testCases.length,

      requiresPIMNavigation
    };
  }

  /**
   * ----------------------------------------------------------
   * SHARED LOGIN GENERATION
   * ----------------------------------------------------------
   */

  generateSharedLogin(
    issue,
    analysis = {}
  ) {
    const sharedPagesDir =
      path.join(
        this.rootDir,
        'tests',
        'shared',
        'pages'
      );

    const sharedTestsDir =
      path.join(
        this.rootDir,
        'tests',
        'shared',
        'tests'
      );

    fs.mkdirSync(
      sharedPagesDir,
      {
        recursive: true
      }
    );

    fs.mkdirSync(
      sharedTestsDir,
      {
        recursive: true
      }
    );

    const pageFile =
      path.join(
        sharedPagesDir,
        'LoginPage.js'
      );

    const specFile =
      path.join(
        sharedTestsDir,
        'login.spec.js'
      );

    const testCases =
      filterAllowedTestCases(
        Array.isArray(
          analysis?.testCases
        )
          ? analysis.testCases
          : []
      );

    const layers = [
      ...new Set(
        testCases
          .map(
            testCase =>
              normalizeLayer(
                testCase?.layer
              )
          )
          .filter(Boolean)
      )
    ];

    fs.writeFileSync(
      pageFile,
      sharedLoginPageTemplate(),
      'utf8'
    );

    fs.writeFileSync(
      specFile,
      sharedLoginSpecTemplate(
        issue.key,
        testCases
      ),
      'utf8'
    );

    this.validateJavaScript(
      pageFile
    );

    this.validateJavaScript(
      specFile
    );

    const metadataFile =
      path.join(
        this.rootDir,
        'tests',
        'shared',
        'LOGIN-COVERAGE.md'
      );

    const coverageLines =
      testCases.map(
        testCase =>
          `- [${testCase?.id || 'TC'}][${testCase?.layer || 'Functional'}] ${testCase?.title || 'Generated login test'}`
      );

    const metadata =
      [
        '# Shared Login Coverage',
        '',
        `Source Jira: ${issue.key}`,
        '',
        `Layers: ${layers.join(', ') || 'Functional'}`,
        '',
        'Allowed layers:',
        '- Functional',
        '- Validation',
        '',
        'Excluded layers:',
        '- Security',
        '- Performance',
        '- Compatibility',
        '',
        `Generated test cases: ${testCases.length}`,
        '',
        ...coverageLines,
        ''
      ].join('\n');

    fs.writeFileSync(
      metadataFile,
      metadata,
      'utf8'
    );

    this.validateJavaScript(
      pageFile
    );

    this.validateJavaScript(
      specFile
    );

    return {
      type:
        'shared-component',

      ticketDir:
        null,

      pageFile,

      specFile,

      metadataFile,

      layers,

      testCases:
        testCases.length
    };
  }

  /**
   * ----------------------------------------------------------
   * LOGIN REQUIREMENT DETECTION
   * ----------------------------------------------------------
   */

  isLoginRequirement(
    issue,
    analysis = {}
  ) {
    const text =
      [
        issue?.summary,
        issue?.description,
        analysis?.summary,
        analysis?.feature,
        analysis?.component,

        ...(Array.isArray(
          analysis?.testCases
        )
          ? analysis.testCases.flatMap(
              testCase => [
                testCase?.title,
                testCase?.expected,
                testCase?.expectedResult,
                ...(Array.isArray(
                  testCase?.steps
                )
                  ? testCase.steps
                  : [])
              ]
            )
          : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return (
      text.includes('login') ||
      text.includes('log in') ||
      text.includes('authentication') ||
      text.includes('authenticate') ||
      text.includes('sign in')
    );
  }

  /**
   * ----------------------------------------------------------
   * PIM DETECTION
   * ----------------------------------------------------------
   */

  requiresPIMNavigation(
    issue,
    analysis = {}
  ) {
    const text =
      [
        issue?.summary,
        issue?.description,
        analysis?.summary,
        analysis?.feature,
        analysis?.component,

        ...(Array.isArray(
          analysis?.testCases
        )
          ? analysis.testCases.flatMap(
              testCase => [
                testCase?.title,
                testCase?.expected,
                testCase?.expectedResult,
                ...(Array.isArray(
                  testCase?.steps
                )
                  ? testCase.steps
                  : [])
              ]
            )
          : [])
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    return (
      text.includes('pim') ||
      text.includes('employee list') ||
      text.includes('employee records') ||
      text.includes('employee search') ||
      text.includes('search employee') ||
      text.includes('employee from pim')
    );
  }

  /**
   * ----------------------------------------------------------
   * METADATA
   * ----------------------------------------------------------
   */

  writeMetadata(
    ticketDir,
    issue,
    analysis = {}
  ) {
    const metadataFile =
      path.join(
        ticketDir,
        'README.md'
      );

    /**
     * Defensive filtering again.
     *
     * README must never report excluded layers as
     * generated automation.
     */

    const testCases =
      filterAllowedTestCases(
        Array.isArray(
          analysis?.testCases
        )
          ? analysis.testCases
          : []
      );

    const layers = [
      ...new Set(
        testCases
          .map(
            testCase =>
              normalizeLayer(
                testCase?.layer
              )
          )
          .filter(Boolean)
      )
    ];

    const requirements =
      Array.isArray(
        analysis?.requirementGaps
      )
        ? analysis.requirementGaps
        : [];

    const lines = [
      `# ${issue.key} - ${issue.summary || ''}`,

      '',

      '## Jira',

      '',

      `Issue: ${issue.key}`,

      '',

      `Summary: ${issue.summary || ''}`,

      '',

      '## Generated STLC Layers',

      '',

      layers.length
        ? layers
            .map(
              layer =>
                `- ${layer}`
            )
            .join('\n')
        : '- Functional',

      '',

      '## Allowed Test Layers',

      '',

      '- Functional',

      '- Validation',

      '',

      '## Excluded Test Layers',

      '',

      '- Security',

      '- Performance',

      '- Compatibility',

      '',

      '## Authentication',

      '',

      'Authentication is supplied by:',

      '',

      '`tests/shared/fixtures/authenticated.js`',

      '',

      '## Shared Components',

      '',

      'Reusable PIM navigation is supplied by:',

      '',

      '`tests/shared/pages/PIMPage.js`',

      '',

      '## PIM Search Data',

      '',

      'Employee Id used by generated PIM search:',

      '',

      '`0400`',

      '',

      '## Test Cases',

      ''
    ];

    for (
      let index = 0;
      index < testCases.length;
      index += 1
    ) {
      const testCase =
        testCases[index];

      lines.push(
        `${index + 1}. [${testCase?.id || 'TC'}][${testCase?.layer || 'Functional'}] ${testCase?.title || 'Generated test'}`
      );

      if (
        testCase?.expected ||
        testCase?.expectedResult
      ) {
        lines.push(
          `   - Expected: ${testCase.expectedResult || testCase.expected}`
        );
      }
    }

    lines.push(
      '',
      '## Requirement Gaps',
      ''
    );

    if (
      requirements.length
    ) {
      lines.push(
        ...requirements.map(
          gap =>
            `- ${gap}`
        )
      );
    } else {
      lines.push(
        '- None identified.'
      );
    }

    lines.push(
      '',
      '## Generated Automation',
      '',
      'The generated automation uses executable Playwright assertions.',
      '',
      'Only Functional and Validation Jira scenarios are generated.',
      '',
      'Security, Performance and Compatibility scenarios are intentionally excluded.',
      '',
      'Employee search uses Employee Id 0400.',
      '',
      'The generated feature test does not duplicate login functionality.',
      ''
    );

    fs.writeFileSync(
      metadataFile,
      lines.join('\n'),
      'utf8'
    );

    return metadataFile;
  }

  /**
   * ----------------------------------------------------------
   * JAVASCRIPT VALIDATION
   * ----------------------------------------------------------
   *
   * FIX:
   *
   * The previous implementation attempted to reference
   * `result` before it had been initialized.
   *
   * The spawnSync call MUST happen first.
   */

  validateJavaScript(
    filePath
  ) {
    if (
      !fs.existsSync(filePath)
    ) {
      throw new Error(
        `Cannot validate missing JavaScript file: ${filePath}`
      );
    }

    const result =
      spawnSync(
        process.execPath,
        [
          '--check',
          filePath
        ],
        {
          encoding: 'utf8'
        }
      );

    if (
      result.error
    ) {
      throw new Error(
        [
          'Unable to execute Node.js syntax validation.',
          `File: ${filePath}`,
          '',
          result.error.message
        ].join('\n')
      );
    }

    if (
      result.status !== 0
    ) {
      const output =
        [
          result.stdout,
          result.stderr
        ]
          .filter(Boolean)
          .join('\n');

      throw new Error(
        [
          'Generated JavaScript syntax validation failed.',
          `File: ${filePath}`,
          '',
          output
        ].join('\n')
      );
    }

    return true;
  }
}

module.exports = {
  FrameworkGenerator
};