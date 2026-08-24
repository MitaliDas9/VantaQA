'use strict';

/**
 * ------------------------------------------------------------
 * ALLOWED TEST LAYERS
 * ------------------------------------------------------------
 *
 * Only Functional and Validation automation is generated.
 *
 * Security, Performance and Compatibility are intentionally
 * excluded even when Jira analysis contains those layers.
 */

const ALLOWED_TEST_LAYERS = new Set([
  'functional',
  'validation'
]);

function normalizeLayer(value) {
  const layer = String(value || '')
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
  const layer = String(testCase?.layer || '')
    .trim()
    .toLowerCase();

  return ALLOWED_TEST_LAYERS.has(layer);
}

function filterAllowedTestCases(testCases) {
  if (!Array.isArray(testCases)) {
    return [];
  }

  return testCases.filter(
    testCase => isAllowedTestLayer(testCase)
  );
}

/**
 * ------------------------------------------------------------
 * GENERAL HELPERS
 * ------------------------------------------------------------
 */

function pascalCase(value) {
  return String(value || '')
    .replace(
      /[^a-zA-Z0-9]+(.)?/g,
      (_, character) =>
        character
          ? character.toUpperCase()
          : ''
    )
    .replace(
      /^[a-z]/,
      character =>
        character.toUpperCase()
    )
    .replace(
      /[^a-zA-Z0-9]/g,
      ''
    ) || 'Feature';
}

function escapeString(value) {
  return String(value ?? '')
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

  return values.some(
    item =>
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
 * Authentication:
 *   tests/shared/fixtures/authenticated.js
 *
 * PIM navigation:
 *   tests/shared/pages/PIMPage.js
 *
 * Employee search:
 *   Employee Id = 0400
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

    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value;
    }

    return fallback;
  };

  const employeeIdLocator =
    locator(
      'employeeIdInput',
      "page.getByLabel('Employee Id', { exact: true })"
    );

  const searchLocator =
    locator(
      'searchInput',
      "page.getByPlaceholder('Search')"
    );

  const searchButtonLocator =
    locator(
      'searchButton',
      "page.getByRole('button', { name: /Search/i })"
    );

  const resetButtonLocator =
    locator(
      'resetButton',
      "page.getByRole('button', { name: /Reset/i })"
    );

  const tableRowsLocator =
    locator(
      'tableRows',
      "page.locator('.oxd-table-body .oxd-table-card')"
    );

  const tableLocator =
    locator(
      'table',
      "page.locator('.oxd-table')"
    );

  const noRecordsLocator =
    locator(
      'noRecords',
      "page.getByText(/No Records Found/i)"
    );

  return `const { expect } = require('@playwright/test');

/**
 * Jira: ${escapeTemplateComment(issueKey)}
 * Summary: ${escapeTemplateComment(summary)}
 *
 * Feature-specific PIM Employee List Page Object.
 *
 * Authentication:
 *   tests/shared/fixtures/authenticated.js
 *
 * PIM navigation:
 *   tests/shared/pages/PIMPage.js
 *
 * Employee Id used for search:
 *   0400
 */

class ${className} {

  constructor(page) {
    this.page = page;

    this.employeeIdInput =
      ${employeeIdLocator};

    this.searchInput =
      ${searchLocator};

    this.searchButton =
      ${searchButtonLocator};

    this.resetButton =
      ${resetButtonLocator};

    this.employeeRows =
      ${tableRowsLocator};

    this.employeeTable =
      ${tableLocator};

    this.noRecordsMessage =
      ${noRecordsLocator};
  }

  /**
   * Search Employee List using Employee Id.
   */
  async searchByEmployeeId(value) {
    await this.employeeIdInput.fill(
      value
    );

    await this.searchButton.click();
  }

  /**
   * Search Employee List by name.
   *
   * Kept available for reusable feature functionality.
   */
  async searchByName(value) {
    await this.searchInput.fill(
      value
    );

    await this.searchButton.click();
  }

  /**
   * Clear Employee List search criteria.
   */
  async resetSearch() {
    await this.resetButton.click();
  }

  /**
   * Return displayed employee row count.
   */
  async getEmployeeRowCount() {
    return this.employeeRows.count();
  }

  /**
   * Assert Employee List table is visible.
   */
  async expectEmployeeTableVisible() {
    await expect(
      this.employeeTable,
      'Expected Employee List table to be visible.'
    ).toBeVisible();
  }

  /**
   * Assert at least one employee record is displayed.
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

    if (rowCount === 0) {
      await expect(
        this.noRecordsMessage,
        'Expected "No Records Found" message.'
      ).toBeVisible();

      return;
    }

    await expect(
      this.employeeRows.first(),
      'Expected no employee records after the search.'
    ).not.toBeVisible();
  }

  /**
   * Assert matching employee record is visible.
   */
  async expectEmployeeRecordVisible(value) {
    const matchingRow =
      this.employeeRows
        .filter({
          hasText: String(value)
        })
        .first();

    await expect(
      matchingRow,
      \`Expected employee record "\${value}" to be visible.\`
    ).toBeVisible();
  }

  /**
   * Assert Employee Id field contains supplied value.
   */
  async expectEmployeeIdValue(value) {
    await expect(
      this.employeeIdInput,
      'Expected Employee Id field to contain the search value.'
    ).toHaveValue(value);
  }

  /**
   * Assert generic search field contains supplied value.
   */
  async expectSearchValue(value) {
    await expect(
      this.searchInput,
      'Expected search field to contain the search value.'
    ).toHaveValue(value);
  }
}

module.exports = {
  ${className}
};
`;
}

/**
 * ------------------------------------------------------------
 * SCENARIO ACTION GENERATION
 * ------------------------------------------------------------
 *
 * Defensive rule:
 *
 * Only Functional and Validation scenarios can reach here.
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
      'display employee',
      'employee information'
    ]);

  const isSearch =
    hasAny(text, [
      'search employee',
      'search employees',
      'search employee name',
      'search by name',
      'search by employee id',
      'employee id',
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
      'mandatory',
      'negative',
      'boundary'
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
   * PIM NAVIGATION
   * ----------------------------------------------------------
   */

  if (needsEmployeeList) {
    lines.push(`
      await pimPage.openEmployeeList();

      await expect(
        page
      ).toHaveURL(
        /\\/web\\/index\\.php\\/pim\\/viewEmployeeList/
      );
`);
  }

  /**
   * ----------------------------------------------------------
   * EMPLOYEE ID SEARCH
   * ----------------------------------------------------------
   *
   * The actual value comes from:
   *
   *   testData.employeeId
   *
   * which is 0400.
   */

  if (isSearch) {
    lines.push(`
      const employeeId =
        testData.employeeId;

      await featurePage.searchByEmployeeId(
        employeeId
      );

      await featurePage.expectEmployeeIdValue(
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
        'Expected Employee Id search field to be cleared after Reset.'
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
   * VALIDATION
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
          \`Expected validation message: \${validationMessage}\`
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
      await featurePage.expectEmployeeTableVisible();
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

  return `[${id}-${layer}] ${title} [Scenario-${String(
    scenarioIndex + 1
  ).padStart(2, '0')}]`;
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
  scenarioIndex = 0,
  requiresPIMNavigation = false
}) {
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
      : '      // Jira scenario steps are represented by generated actions below.';

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
    '${escapeString(title)}',
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
      // ${escapeTemplateComment(expected)}
    }
  );
`;
}

/**
 * ------------------------------------------------------------
 * FEATURE SPEC
 * ------------------------------------------------------------
 *
 * Defensive filtering is applied BEFORE grouping.
 *
 * Generated:
 *   Functional
 *   Validation
 *
 * Excluded:
 *   Security
 *   Performance
 *   Compatibility
 */

function specTemplate({
  issueKey,
  summary,
  pageImport,
  pageClass,
  dataImport,
  testCases = [],
  layers = [],
  requiresPIMNavigation = false
}) {
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

    if (!grouped[layer]) {
      grouped[layer] = [];
    }

    grouped[layer].push(
      testCase
    );
  }

  const preferredLayerOrder = [
    'Functional',
    'Validation'
  ];

  const orderedLayers =
    preferredLayerOrder.filter(
      layer =>
        grouped[layer] &&
        grouped[layer].length > 0
    );

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

  const generatedLayers =
    orderedLayers.length
      ? orderedLayers.join(', ')
      : 'Functional, Validation';

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
 * Jira: ${escapeTemplateComment(issueKey)}
 * Summary: ${escapeTemplateComment(summary)}
 *
 * Generated test layers:
 *   ${escapeTemplateComment(generatedLayers)}
 *
 * Allowed:
 *   Functional
 *   Validation
 *
 * Excluded:
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
 * Employee search test data:
 *   Employee Id = 0400
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
 * Only generated when the Jira issue itself is explicitly
 * identified as reusable login functionality.
 */

function sharedLoginPageTemplate() {
  return `const { expect } = require('@playwright/test');

/**
 * Shared Login Page Object.
 *
 * This component is reusable across Jira automation.
 */

class LoginPage {

  constructor(page) {
    this.page = page;

    this.usernameInput =
      page.getByLabel(
        /email|username/i
      );

    this.passwordInput =
      page.getByLabel(
        /password/i
      );

    this.loginButton =
      page.getByRole(
        'button',
        {
          name: /login|log in|sign in/i
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
      this.page.getByText(
        message,
        {
          exact: false
        }
      )
    ).toBeVisible();
  }
}

module.exports = {
  LoginPage
};
`;
}

/**
 * ------------------------------------------------------------
 * SHARED LOGIN SPEC
 * ------------------------------------------------------------
 */

function sharedLoginSpecTemplate(
  issueKey,
  testCases = []
) {
  const filteredTestCases =
    filterAllowedTestCases(
      testCases
    );

  const groups = {};

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
      '${escapeString(title)}',
      async ({ page }) => {

        const loginPage =
          new LoginPage(page);

        await loginPage.goto();

        const username =
          process.env.JIRA_TEST_USERNAME ||
          process.env.TEST_USER_EMAIL ||
          process.env.ADMIN_USERNAME;

        const password =
          process.env.JIRA_TEST_PASSWORD ||
          process.env.TEST_USER_PASSWORD ||
          process.env.ADMIN_PASSWORD;

        if (!username || !password) {
          throw new Error(
            'JIRA_TEST_USERNAME/JIRA_TEST_PASSWORD or TEST_USER_EMAIL/TEST_USER_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD must be configured.'
          );
        }

        await loginPage.login(
          username,
          password
        );

        await loginPage.expectLoggedIn();

        // Expected result:
        // ${escapeTemplateComment(expected)}
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

  return `const {
  test
} = require('@playwright/test');

const {
  LoginPage
} = require('../pages/LoginPage');

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
 * Employee Id 0400 is the functional PIM search value.
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
 * Employee Id 0400 is the business test value used
 * by PIM Employee List search.
 *
 * Business data must not be stored in .env.
 */

module.exports = {

  issueKey:
    '${escapeString(issueKey)}',

  summary:
    '${escapeString(summary)}',

  employeeId:
    '0400',

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

  authenticatedFixtureTemplate:
    null,

  sharedPIMPageTemplate:
    null,

  dataTemplate,

  escapeString,

  escapeTemplateComment,

  ALLOWED_TEST_LAYERS,

  normalizeLayer,

  isAllowedTestLayer,

  filterAllowedTestCases
};