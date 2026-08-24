'use strict';

/**
 * ------------------------------------------------------------
 * GENERAL HELPERS
 * ------------------------------------------------------------
 */

const ALLOWED_TEST_LAYERS = new Set([
  'functional',
  'validation'
]);

function normalizeLayer(value) {
  const layer =
    String(value || 'Functional')
      .trim()
      .toLowerCase();

  if (layer === 'functional') {
    return 'Functional';
  }

  if (layer === 'validation') {
    return 'Validation';
  }

  return null;
}

function isAllowedTestLayer(testCase) {
  const layer =
    String(
      testCase?.layer || 'Functional'
    )
      .trim()
      .toLowerCase();

  return ALLOWED_TEST_LAYERS.has(layer);
}

function filterAllowedTestCases(testCases) {
  if (!Array.isArray(testCases)) {
    return [];
  }

  return testCases.filter(
    isAllowedTestLayer
  );
}

function pascalCase(value) {
  return String(value || '')
    .replace(
      /[^a-zA-Z0-9]+(.)?/g,
      (_, c) =>
        c ? c.toUpperCase() : ''
    )
    .replace(
      /^[a-z]/,
      c => c.toUpperCase()
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ''
    ) || 'Feature';
}

function escapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function escapeTemplateComment(value) {
  return String(value ?? '')
    .replace(/\*\//g, '*\\/')
    .replace(/\r?\n/g, ' ');
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function lowerText(value) {
  return normalizeText(value).toLowerCase();
}

function isPerformanceLayer(testCase) {
  return (
    lowerText(testCase?.layer) ===
    'performance'
  );
}

function testCaseText(testCase) {
  return [
    testCase?.title,
    testCase?.name,
    testCase?.expected,
    testCase?.expectedResult,
    ...(Array.isArray(testCase?.steps)
      ? testCase.steps
      : [])
  ]
    .filter(Boolean)
    .join(' ');
}

function hasAny(text, values) {
  const value = lowerText(text);

  return values.some(item =>
    value.includes(
      String(item).toLowerCase()
    )
  );
}

/**
 * ------------------------------------------------------------
 * FEATURE PAGE OBJECT
 * ------------------------------------------------------------
 *
 * Login is NOT implemented here.
 *
 * Authentication is provided by:
 *
 *   tests/shared/fixtures/authenticated.js
 *
 * PIM navigation is provided by:
 *
 *   tests/shared/pages/PIMPage.js
 *
 * This page contains feature-specific functionality only.
 */

function pageObjectTemplate(
  className,
  issueKey,
  summary,
  locatorConfig = {}
) {
  const locator = (
    name,
    fallback
  ) => {
    const value =
      locatorConfig?.[name] ||
      locatorConfig?.[
        name?.toLowerCase?.()
      ];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    return fallback;
  };

  const employeeIdLocator = locator(
    'employeeIdInput',
    "page.getByLabel('Employee Id', { exact: true })"
  );

  const searchLocator = locator(
    'searchInput',
    "page.getByPlaceholder('Search')"
  );

  const searchButtonLocator = locator(
    'searchButton',
    "page.getByRole('button', { name: /Search/i })"
  );

  const resetButtonLocator = locator(
    'resetButton',
    "page.getByRole('button', { name: /Reset/i })"
  );

  const tableLocator = locator(
    'tableRows',
    "page.locator('table tbody tr')"
  );

  return `const { expect } = require('@playwright/test');

/**
 * Generated from ${issueKey}: ${summary}
 *
 * This Page Object contains only feature-specific interactions.
 * Reusable functionality such as login belongs under tests/shared.
 */

class ${className} {

  constructor(page) {

    this.page = page;

    this.employeeIdInput =
      ${employeeIdLocator};

    this.searchInput =
      ${searchLocator};

    this.searchInput = ${searchLocator};
    this.searchButton = ${searchButtonLocator};
    this.resetButton = ${resetButtonLocator};

    this.employeeRows = ${tableLocator};
  }

  async goto() {
    await this.page.goto('/');
    await this.pimMenu.click();

    await this.page.waitForURL(
      /\\/web\\/index\\.php\\/pim\\/viewEmployeeList/
    );
  }

  async openPim() {
    await this.page.goto('/');
    await this.pimMenu.click();

    await this.page.waitForURL(
      /\\/web\\/index\\.php\\/pim\\/viewEmployeeList/
    );
  }

  /**
   * Search employee by Employee Id.
   *
   * Default generated test data:
   *   0400
   */
  async searchByEmployeeId(value) {

    await this.employeeIdInput.fill(
      value
    );

    await this.searchButton.click();
  }

  /**
   * Search employee by name.
   *
   * Kept available for feature reuse.
   */
  async searchByName(value) {

    await this.searchInput.fill(
      value
    );

    await this.searchButton.click();
  }

  async resetSearch() {

    await this.resetButton.click();
  }

  async getEmployeeRowCount() {

    return this.employeeRows.count();
  }

  /**
   * Assert that the Employee List table is visible.
   */
  async expectEmployeeTableVisible() {

    await expect(
      this.employeeTable,
      'Expected Employee List table to be visible.'
    ).toBeVisible();
  }

  /**
   * Assert that at least one employee record exists.
   */
  async expectEmployeeRecordsDisplayed() {

    await expect(
      this.employeeRows.first(),
      'Expected at least one employee record to be displayed.'
    ).toBeVisible();
  }

  /**
   * Assert that no employee records are displayed.
   */
  async expectNoEmployeeRecords() {

    const rowCount =
      await this.getEmployeeRowCount();

    if (rowCount > 0) {

      await expect(
        this.employeeRows.first(),
        'Expected no employee records after the search.'
      ).not.toBeVisible();

      return;
    }

    await expect(
      this.noRecordsMessage,
      'Expected "No Records Found" message.'
    ).toBeVisible();
  }

  /**
   * Assert that a matching employee record is visible.
   *
   * OrangeHRM renders employee records as:
   *   .oxd-table-body .oxd-table-card
   */
  async expectEmployeeRecordVisible(
    value
  ) {

    const matchingRow =
      this.employeeRows
        .filter({
          hasText: value
        })
        .first();

    await expect(
      matchingRow,
      \`Expected employee record "\\${value}" to be visible.\`
    ).toBeVisible();
  }

  /**
   * Assert that the search input contains the supplied value.
   */
  async expectSearchValue(value) {

    await expect(
      this.searchInput,
      'Expected the employee search field to contain the search value.'
    ).toHaveValue(value);
  }

}

module.exports = { ${className} };
`;
}

/**
 * ------------------------------------------------------------
 * SCENARIO ACTION GENERATION
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Only Functional and Validation scenarios are generated.
 *
 * Performance, Security and Compatibility scenarios
 * are deliberately rejected here as a second layer of
 * protection.
 */

function scenarioActions(
  testCase,
  pageClass,
  requiresPIMNavigation = false
) {
  if (!isAllowedTestLayer(testCase)) {
    return '';
  }

  const text =
    lowerText(
      testCaseText(testCase)
    );

  const lines = [];

  const needsEmployeeList =
    requiresPIMNavigation ||
    hasAny(text, [
      'employee list',
      'employee records',
      'employee record',
      'pim',
      'employee search',
      'search employee',
      'search employees',
      'display employee'
    ]);

  const isSearch =
    hasAny(text, [
      'search employee',
      'search employees',
      'search employee name',
      'search by name',
      'search by employee id',
      'employee id',
      'search functionality',
      'matching employee',
      'matching employees'
    ]);

  const isReset =
    hasAny(text, [
      'reset',
      'clear search',
      'clear the search',
      'clear search criteria'
    ]);

  const isNoResults =
    hasAny(text, [
      'no search results',
      'no results',
      'no employee found',
      'no employees found',
      'no records',
      'invalid search',
      'unmatched employee'
    ]);

  const isEmployeeRecords =
    hasAny(text, [
      'employee records',
      'display employee',
      'records displayed',
      'records are displayed',
      'employee record is displayed',
      'employee information'
    ]);

  const isAccessEmployeeList =
    hasAny(text, [
      'access employee list',
      'navigate to employee list',
      'open employee list',
      'employee list access'
    ]);

  const isValidation =
    hasAny(text, [
      'validation',
      'validation message',
      'error message',
      'required field',
      'invalid input',
      'mandatory'
    ]);

  const isVisible =
    hasAny(text, [
      'visible',
      'displayed',
      'display',
      'shown',
      'available'
    ]);

  /**
   * ----------------------------------------------------------
   * STANDARD AUTHENTICATED NAVIGATION
   * ----------------------------------------------------------
   */

  if (needsEmployeeList) {

    lines.push(`
      await pimPage.openEmployeeList();

    // Security coverage validates that the protected feature is reachable
    // only through the expected authenticated application flow.
    await featurePage.verifyLoaded();
`;
  }

  /**
   * ----------------------------------------------------------
   * EMPLOYEE ID SEARCH
   * ----------------------------------------------------------
   *
   * Employee Id 0400 is stored in testData.
   */

  if (isSearch) {

    lines.push(`
      const employeeId =
        testData.employeeId;

      await featurePage.searchByEmployeeId(
        employeeId
      );
`);

    if (isNoResults) {

      lines.push(`
      await featurePage.expectNoEmployeeRecords();
`);
    } else {

      lines.push(`
      await featurePage.expectEmployeeRecordVisible(
        employeeId
      );
`);
    }

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * RESET / CLEAR SEARCH
   * ----------------------------------------------------------
   */

  if (isReset) {

    lines.push(`
      const employeeId =
        testData.employeeId;

      await featurePage.searchByEmployeeId(
        employeeId
      );

      await featurePage.resetSearch();

      await expect(
        featurePage.employeeIdInput,
        'Expected the Employee Id search field to be cleared after Reset.'
      ).toHaveValue('');
`);

    if (isEmployeeRecords) {

      lines.push(`
      await featurePage.expectEmployeeRecordsDisplayed();
`);
    }

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * EMPLOYEE RECORD DISPLAY
   * ----------------------------------------------------------
   */

  if (isEmployeeRecords) {

    lines.push(`
      await featurePage.expectEmployeeRecordsDisplayed();
`);

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * EMPLOYEE LIST ACCESS
   * ----------------------------------------------------------
   */

  if (isAccessEmployeeList) {

    lines.push(`
      await featurePage.expectEmployeeTableVisible();
`);

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * VALIDATION SCENARIOS
   * ----------------------------------------------------------
   */

  if (isValidation) {

    lines.push(`
      const validationMessage =
        testData.validationMessage;

      if (validationMessage) {

        await expect(
          page.getByText(
            validationMessage,
            {
              exact: false
            }
          ).first(),
          \`Expected validation message: \\${validationMessage}\`
        ).toBeVisible();

      } else {

        await expect(
          page.locator(
            '.oxd-input-field-error-message, .oxd-input-group__message'
          ).first(),
          'Expected a validation message to be displayed.'
        ).toBeVisible();
      }
`);

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * GENERIC VISIBILITY ASSERTION
   * ----------------------------------------------------------
   */

  if (isVisible) {

    lines.push(`
      await expect(
        featurePage.employeeTable,
        'Expected the feature content to be visible.'
      ).toBeVisible();
`);

    return lines.join('\n');
  }

  /**
   * ----------------------------------------------------------
   * SAFE FALLBACK
   * ----------------------------------------------------------
   */

  lines.push(`
      await expect(
        page
      ).toHaveURL(
        /\\/web\\/index\\.php\\//
      );
`);

  return lines.join('\n');
}

/**
 * ------------------------------------------------------------
 * UNIQUE TEST TITLE
 * ------------------------------------------------------------
 */

function buildTestTitle(
  testCase,
  scenarioIndex
) {
  const id =
    normalizeText(
      testCase?.id || 'TC'
    );

  const layer =
    normalizeText(
      testCase?.layer || 'Functional'
    );

  const title =
    normalizeText(
      testCase?.title ||
      testCase?.name ||
      'Generated test'
    );

    expect(
      elapsedMs,
      \`Feature load exceeded \${thresholdMs}ms\`
    ).toBeLessThanOrEqual(thresholdMs);
`;
  }

  if (layer === 'compatibility') {
    return `
    await featurePage.goto();
    await featurePage.verifyLoaded();

    // Browser coverage is provided by Playwright projects
    // configured in playwright.config.js.
`;
  }

  if (title.includes('search')) {
    return `
    await featurePage.goto();
    await featurePage.verifyLoaded();

    await featurePage.searchByName('Admin');
`;
  }

  if (title.includes('clear') || title.includes('reset')) {
    return `
    await featurePage.goto();
    await featurePage.verifyLoaded();

    await featurePage.searchByName('Admin');
    await featurePage.resetSearch();
`;
  }

  return `
    await featurePage.goto();
    await featurePage.verifyLoaded();
`;
}

/**
 * ------------------------------------------------------------
 * SCENARIO TEST
 * ------------------------------------------------------------
 */

function scenarioTestTemplate({
  issueKey,
  testCase,
  pageClass,
  dataImport,
  scenarioIndex,
  requiresPIMNavigation
}) {

  /**
   * Never generate a scenario for a disallowed layer.
   */
  if (!isAllowedTestLayer(testCase)) {
    return '';
  }

  const steps =
    Array.isArray(testCase?.steps)
      ? testCase.steps
      : [];

  const stepComments =
    steps.length
      ? steps
          .map(
            (step, index) =>
              `      // ${index + 1}. ${escapeTemplateComment(step)}`
          )
          .join('\n')
      : '      // Jira scenario steps are represented by the generated actions below.';

  const actions =
    scenarioActions(
      testCase,
      pageClass,
      requiresPIMNavigation
    );

  const title =
    buildTestTitle(
      testCase,
      scenarioIndex
    );

  const expected =
    testCase?.expectedResult ||
    testCase?.expected ||
    testCase?.title ||
    'Expected business outcome';

  return `
  test(
    '[${escapeString(testCase.id)}][${escapeString(
      testCase.layer
    )}] ${escapeString(testCase.title)}',
    async ({ page }) => {

      const featurePage =
        new ${pageClass}(page);

      ${
        requiresPIMNavigation
          ? `const pimPage =
        new PIMPage(page);`
          : ''
      }

      // Jira: ${escapeTemplateComment(issueKey)}

      // Jira scenario:
${stepComments}

${actions}

      // Expected result:
      // ${escapeString(testCase.expected || 'Expected behavior is satisfied.')}
    }
  );
`;
}

/**
 * ------------------------------------------------------------
 * FEATURE SPEC
 * ------------------------------------------------------------
 *
 * Only Functional and Validation test cases are generated.
 *
 * Security, Performance and Compatibility are explicitly
 * excluded.
 */

function specTemplate({
  issueKey,
  summary,
  testCases,
  pageClass,
  dataImport,
  testCases = [],
  layers = [],
  requiresPIMNavigation = false
}) {

  /**
   * ----------------------------------------------------------
   * DEFENSIVE TEST CASE FILTER
   * ----------------------------------------------------------
   *
   * This prevents stale or incorrectly classified Jira
   * analysis from generating unwanted tests.
   */

  const filteredTestCases =
    filterAllowedTestCases(
      testCases
    );

  const grouped = {};

  for (
    const testCase
    of filteredTestCases
  ) {

    const layer =
      normalizeLayer(
        testCase?.layer
      ) || 'Functional';

    if (!groups[layer]) {
      groups[layer] = [];
    }

    grouped[layer].push(
      testCase
    );
  }

  const preferredLayerOrder = [
    'Functional',
    'Validation'
  ];

  const orderedLayers = [
    ...preferredLayerOrder.filter(
      layer => grouped[layer]
    ),
    ...Object.keys(grouped).filter(
      layer =>
        !preferredLayerOrder.includes(
          layer
        )
    )
  ];

  const sections =
    orderedLayers
      .map(layer => {

        const cases =
          grouped[layer] || [];

        const tests =
          cases
            .map(
              (testCase, index) =>
                scenarioTestTemplate({
                  issueKey,
                  testCase,
                  pageClass,
                  dataImport,
                  scenarioIndex: index,
                  requiresPIMNavigation
                })
            )
            .filter(Boolean)
            .join('\n');

        if (!tests.trim()) {
          return '';
        }

        return `
  test.describe(
    '${escapeString(layer)}',
    () => {

${tests}

    }
  );
`;
      })
      .filter(Boolean)
      .join('\n');

  const filteredLayers =
    [
      ...new Set(
        filteredTestCases
          .map(testCase =>
            normalizeLayer(
              testCase?.layer
            )
          )
          .filter(Boolean)
      )
    ];

  const layerComment =
    filteredLayers.length
      ? filteredLayers
          .map(layer =>
            escapeTemplateComment(layer)
          )
          .join(', ')
      : 'Functional';

  const pimImport =
    requiresPIMNavigation
      ? `
const {
  PIMPage
} = require('../../../shared/pages/PIMPage');
`
      : '';

  return `const {
  test,
  expect
} = require('../../../shared/fixtures/authenticated');

const {
  ${pageClass}
} = require('${pageImport}');

const testData =
  require('${dataImport}');

${pimImport}

/**
 * Jira: ${issueKey}
 * Summary: ${escapeString(summary)}
 *
 * STLC layers:
 * ${Object.keys(groups).join(', ')}
 *
 * Allowed generated layers:
 *   Functional
 *   Validation
 *
 * Excluded generated layers:
 *   Security
 *   Performance
 *   Compatibility
 *
 * Authentication:
 *   tests/shared/fixtures/authenticated.js
 *
 * Reusable PIM navigation:
 *   tests/shared/pages/PIMPage.js
 *
 * Feature-specific functionality:
 *   tests/jira/${escapeTemplateComment(issueKey)}
 *
 * Test data:
 *   ${escapeTemplateComment(dataImport)}
 *
 * Only the current allowed Jira scenarios are generated.
 */

test.describe(
  '${escapeString(issueKey)} - ${escapeString(summary)}',
  () => {

${sections}

  }
);
`;
}

/**
 * ------------------------------------------------------------
 * SHARED LOGIN PAGE
 * ------------------------------------------------------------
 *
 * This remains available for explicit shared-login Jira
 * functionality.
 *
 * Normal feature Jira generation does NOT generate this page.
 */

function sharedLoginPageTemplate() {

  return `const { expect } = require('@playwright/test');

/**
 * Shared Login Page Object.
 *
 * Login is intentionally maintained under tests/shared
 * because authentication is a reusable application component.
 */

class LoginPage {

  constructor(page) {

    this.page = page;

    this.usernameInput = page.getByLabel(
      /email|username/i
    );

    this.passwordInput = page.getByLabel(
      /password/i
    );

    this.loginButton = page.getByRole(
      'button',
      {
        name: /log in|login|sign in/i
      }
    );
  }

  async goto() {

    const baseUrl =
      process.env.BASE_URL;

    if (!baseUrl) {

      throw new Error(
        'BASE_URL is required for LoginPage.goto().'
      );
    }

    await this.page.goto(
      baseUrl
    );
  }

  async login(
    username,
    password
  ) {

    await this.usernameInput.fill(
      username
    );

    await this.passwordInput.fill(
      password
    );

    await this.loginButton.click();
  }

  async expectLoggedIn() {

    await expect(
      this.page
    ).not.toHaveURL(
      /\\/auth\\/login|\\/login/
    );
  }

  async expectValidationMessage(
    message
  ) {

    await expect(
      this.page.getByText(message)
    ).toBeVisible();
  }
}

module.exports = { LoginPage };
`;
}

/**
 * ------------------------------------------------------------
 * SHARED LOGIN SPEC
 * ------------------------------------------------------------
 *
 * Kept only for explicit reusable-login Jira functionality.
 *
 * Normal feature Jira generation does NOT call this.
 */

function sharedLoginSpecTemplate(
  issueKey,
  testCases = []
) {

  const allowedTestCases =
    filterAllowedTestCases(
      testCases
    );

  const groups = {};

  for (
    const testCase
    of allowedTestCases
  ) {

    const layer =
      normalizeLayer(
        testCase?.layer
      ) || 'Functional';

    if (!groups[layer]) {
      groups[layer] = [];
    }

    groups[layer].push(
      testCase
    );
  }

  const sections =
    Object.entries(groups)
      .map(
        ([layer, cases]) => {

          const tests =
            cases
              .map(
                (testCase, index) => {

                  const title =
                    buildTestTitle(
                      testCase,
                      index
                    );

                  const expected =
                    testCase?.expectedResult ||
                    testCase?.expected ||
                    testCase?.title ||
                    'Expected login outcome';

                  return `
    test(
      '[${escapeString(testCase.id)}][${escapeString(
        testCase.layer
      )}] ${escapeString(testCase.title)}',
      async ({ page }) => {

        const loginPage =
          new LoginPage(page);

        await loginPage.goto();

        // Authentication credentials must come from environment variables.
        const username = process.env.JIRA_TEST_USERNAME;
        const password = process.env.JIRA_TEST_PASSWORD;

        if (!username || !password) {

          throw new Error(
            'JIRA_TEST_USERNAME and JIRA_TEST_PASSWORD must be configured.'
          );
        }

        await loginPage.login(username, password);
        await loginPage.expectLoggedIn();

        // Expected:
        // ${escapeString(testCase.expected || 'User is successfully authenticated.')}
      }
    );
`;
                }
              )
              .join('\n');

          return `
  test.describe(
    '${escapeString(layer)}',
    () => {

${tests}

    }
  );
`;
        }
      )
      .join('\n');

  return `const { test } = require('@playwright/test');

const { LoginPage } = require('../pages/LoginPage');

/**
 * Shared Login Coverage
 *
 * Jira:
 *   ${escapeTemplateComment(issueKey)}
 *
 * Only Functional and Validation scenarios are generated.
 */

test.describe(
  'Shared Login - ${escapeString(issueKey)}',
  () => {

${sections}

  }
);
`;
}

/**
 * ------------------------------------------------------------
 * DATA TEMPLATE
 * ------------------------------------------------------------
 *
 * IMPORTANT:
 *
 * Business test data belongs in the generated Jira data file.
 *
 * Employee search uses Employee Id 0400.
 */

function dataTemplate({
  issueKey,
  summary
}) {

  return `/**
 * Test data for:
 *
 * Jira:
 *   ${escapeTemplateComment(issueKey)}
 *
 * Summary:
 *   ${escapeTemplateComment(summary)}
 *
 * Feature-specific business test data belongs in this file.
 *
 * Employee names, Employee Ids and other functional test
 * values should NOT be stored in .env.
 */

module.exports = {

  issueKey:
    '${escapeString(issueKey)}',

  summary:
    '${escapeString(summary)}',

  /**
   * Employee Id used by PIM Employee List search.
   */
  employeeId:
    '0400',

  /**
   * Kept for backward compatibility with existing
   * generated feature templates.
   */
  employeeName:
    'Admin',

  invalidEmployeeName:
    'INVALID_EMPLOYEE_999999',

  validationMessage:
    ''
};
`;
}

/**
 * ------------------------------------------------------------
 * MODULE EXPORTS
 * ------------------------------------------------------------
 */

module.exports = {

  pascalCase,

  pageObjectTemplate,

  scenarioActions,

  scenarioTestTemplate,

  specTemplate,

  sharedLoginPageTemplate,

  sharedLoginSpecTemplate,

  /**
   * These are intentionally null here if they are supplied
   * from another generation module.
   */
  authenticatedFixtureTemplate:
    null,

  sharedPIMPageTemplate:
    null,

  dataTemplate,

  escapeString,

  escapeTemplateComment,

  /**
   * Layer filtering helpers.
   */
  ALLOWED_TEST_LAYERS,

  normalizeLayer,

  isAllowedTestLayer,

  filterAllowedTestCases
};