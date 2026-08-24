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

/**
 * Only these STLC layers are allowed to generate
 * Playwright tests for a normal Jira feature.
 *
 * Security, Performance and Compatibility are intentionally
 * excluded.
 */
const ALLOWED_TEST_LAYERS = new Set([
  'functional',
  'validation'
]);

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
     * Login is a reusable component.
     *
     * Only an explicitly identified reusable-login Jira
     * requirement is allowed to generate the shared login
     * component.
     *
     * Normal feature Jira tickets MUST NOT create:
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

  /**
   * ----------------------------------------------------------
   * FILTER TEST CASES
   * ----------------------------------------------------------
   *
   * This is the first defensive layer.
   *
   * Even if the Jira analysis contains:
   *
   *   Security
   *   Performance
   *   Compatibility
   *
   * they are removed before any files are generated.
   */

  filterTestCases(
    testCases
  ) {

    const filtered =
      filterAllowedTestCases(
        testCases
      );

    return filtered.filter(
      testCase => {

        const layer =
          String(
            testCase?.layer ||
            'Functional'
          )
            .trim()
            .toLowerCase();

        return ALLOWED_TEST_LAYERS.has(
          layer
        );
      }
    );
  }

  /**
   * ----------------------------------------------------------
   * NORMALIZE LAYERS
   * ----------------------------------------------------------
   */

  normalizeLayers(
    testCases
  ) {

    return [
      ...new Set(
        testCases
          .map(testCase =>
            normalizeLayer(
              testCase?.layer
            )
          )
          .filter(Boolean)
      )
    ];
  }

  /**
   * ----------------------------------------------------------
   * FEATURE GENERATION
   * ----------------------------------------------------------
   */

  generateFeature(
    issue,
    analysis,
    locatorConfig = {}
  ) {

    const ticketDir =
      path.join(
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

    for (
      const dir
      of [
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

    const pageFile = path.join(
      pagesDir,
      `${className}.js`
    );

    const specFile = path.join(
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
     * DEFENSIVE TEST CASE FILTER
     * --------------------------------------------------------
     *
     * Only Functional and Validation are allowed.
     */

    const rawTestCases =
      Array.isArray(
        analysis?.testCases
      )
        ? analysis.testCases
        : [];

    const testCases =
      this.filterTestCases(
        rawTestCases
      );

    /**
     * Layers are calculated ONLY from the filtered test cases.
     *
     * This prevents stale Security/Performance/Compatibility
     * values from appearing in generated metadata.
     */

    const layers =
      this.normalizeLayers(
        testCases
      );

    /**
     * --------------------------------------------------------
     * PIM NAVIGATION DETECTION
     * --------------------------------------------------------
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
      {
        ...analysis,

        /**
         * IMPORTANT:
         *
         * Store ONLY the filtered test cases/layers.
         */
        testCases,

        layers,

        requiresPIMNavigation
      }
    );

    /**
     * --------------------------------------------------------
     * JAVASCRIPT VALIDATION
     * --------------------------------------------------------
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
      type: 'jira-feature',
      ticketDir,
      pageFile,
      specFile,
      layers: analysis.layers || [],
      testCases:
        testCases.length,

      /**
       * Return the actual generated test cases so the
       * caller can verify that unwanted layers were removed.
       */
      generatedTestCases:
        testCases,

      requiresPIMNavigation
    };
  }

  generateSharedLogin(
    issue,
    analysis,
    locatorConfig = {}
  ) {

    const sharedPagesDir =
      path.join(
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

    const rawTestCases =
      Array.isArray(
        analysis?.testCases
      )
        ? analysis.testCases
        : [];

    const testCases =
      this.filterTestCases(
        rawTestCases
      );

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

    const layers =
      this.normalizeLayers(
        testCases
      );

    fs.writeFileSync(
      sharedMetadata,
      [
        '# Shared Login Coverage',
        '',
        `Source Jira: ${issue.key}`,
        '',
        `Layers: ${layers.join(', ') || 'Functional'}`,
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
     * Defensive filtering is repeated here so README
     * metadata cannot report Security/Performance/
     * Compatibility as generated coverage.
     */

    const testCases =
      this.filterTestCases(
        Array.isArray(
          analysis?.testCases
        )
          ? analysis.testCases
          : []
      );

    const layers =
      this.normalizeLayers(
        testCases
      );

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

      '## STLC Layers',

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

    if (requirements.length) {

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
   */

  validateJavaScript(
    filePath
  ) {

    if (
      !fs.existsSync(
        filePath
      )
    ) {

      throw new Error(
        `Unable to validate generated JavaScript: ${result.error.message}`
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