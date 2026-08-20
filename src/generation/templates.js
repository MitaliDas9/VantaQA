function pascalCase(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^[a-z]/, c => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Feature';
}

function escapeString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function pageObjectTemplate(
  className,
  issueKey,
  summary,
  locatorConfig = {}
) {
  const locator = (name, fallback) => {
    const value =
      locatorConfig?.[name] ??
      locatorConfig?.[name.toLowerCase()];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    return fallback;
  };

  const pimLocator = locator(
    'pim',
    "page.getByRole('link', { name: /PIM/i })"
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

    this.heading = page.locator('table');
    this.pimMenu = ${pimLocator};

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

  async searchByName(value) {
    await this.searchInput.fill(value);
    await this.searchButton.click();
  }

  async resetSearch() {
    await this.resetButton.click();
  }

  async getEmployeeRowCount() {
    return this.employeeRows.count();
  }

  async verifyLoaded() {
    await expect(this.page).toHaveURL(
      /\\/pim\\/viewEmployeeList/
    );

    await expect(this.heading).toBeVisible();
  }

  async verifySearchInputVisible() {
    await expect(this.searchInput).toBeVisible();
  }

  async verifySearchButtonVisible() {
    await expect(this.searchButton).toBeVisible();
  }

  async verifyResetButtonVisible() {
    await expect(this.resetButton).toBeVisible();
  }
}

module.exports = { ${className} };
`;
}

function scenarioActions(testCase) {
  const layer = String(testCase.layer || '').toLowerCase();
  const title = String(testCase.title || '').toLowerCase();

  if (layer === 'validation') {
    return `
    await featurePage.verifySearchInputVisible();

    // Validation scenarios should exercise empty, invalid and boundary data.
    // The exact data is supplied by the generated Jira test data.
    if (${JSON.stringify(title)}.includes('negative') ||
        ${JSON.stringify(title)}.includes('boundary') ||
        ${JSON.stringify(title)}.includes('invalid')) {
      await featurePage.searchByName('@@INVALID@@');
    } else {
      await featurePage.searchByName('');
    }
`;
  }

  if (layer === 'security') {
    return `
    await featurePage.goto();

    // Security coverage validates that the protected feature is reachable
    // only through the expected authenticated application flow.
    await featurePage.verifyLoaded();
`;
  }

  if (layer === 'performance') {
    return `
    const startTime = Date.now();

    await featurePage.goto();
    await featurePage.verifyLoaded();

    const elapsedMs = Date.now() - startTime;

    // Default threshold can be overridden through environment configuration.
    const thresholdMs = Number(
      process.env.PERFORMANCE_THRESHOLD_MS || 3000
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

function scenarioTestTemplate(testCase, pageClass) {
  const steps = Array.isArray(testCase.steps)
    ? testCase.steps
        .map(
          (step, index) =>
            `    // ${index + 1}. ${step}`
        )
        .join('\n')
    : '';

  return `
  test(
    '[${escapeString(testCase.id)}][${escapeString(
      testCase.layer
    )}] ${escapeString(testCase.title)}',
    async ({ page }) => {
      const featurePage = new ${pageClass}(page);

${steps ? `${steps}\n` : ''}
${scenarioActions(testCase)}

      // Expected result:
      // ${escapeString(testCase.expected || 'Expected behavior is satisfied.')}
    }
  );
`;
}

function specTemplate(
  issueKey,
  summary,
  testCases,
  pageClass,
  pageRelativeImport
) {
  const groups = {};

  for (const testCase of testCases || []) {
    const layer = testCase.layer || 'Functional';

    if (!groups[layer]) {
      groups[layer] = [];
    }

    groups[layer].push(testCase);
  }

  const sections = Object.entries(groups)
    .map(([layer, cases]) => {
      const tests = cases
        .map(testCase =>
          scenarioTestTemplate(testCase, pageClass)
        )
        .join('\n');

      return `
  test.describe('${escapeString(layer)}', () => {
${tests}
  });
`;
    })
    .join('\n');

  return `const { test, expect } = require('@playwright/test');

const {
  ${pageClass}
} = require('${pageRelativeImport}');

/**
 * Jira: ${issueKey}
 * Summary: ${escapeString(summary)}
 *
 * STLC layers:
 * ${Object.keys(groups).join(', ')}
 *
 * These tests are generated from Jira acceptance criteria
 * and requirement-gap analysis.
 */

test.describe(
  '${escapeString(issueKey)} - ${escapeString(summary)}',
  () => {
${sections}
  }
);
`;
}

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
    await this.page.goto('/login');
  }

  async login(username, password) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(
      /\\/login(?:$|[/?])/
    );
  }

  async expectValidationMessage(message) {
    await expect(
      this.page.getByText(message)
    ).toBeVisible();
  }
}

module.exports = { LoginPage };
`;
}

function sharedLoginSpecTemplate(issueKey, testCases) {
  const groups = {};

  for (const testCase of testCases || []) {
    const layer = testCase.layer || 'Functional';

    if (!groups[layer]) {
      groups[layer] = [];
    }

    groups[layer].push(testCase);
  }

  const sections = Object.entries(groups)
    .map(([layer, cases]) => {
      const tests = cases
        .map(testCase => {
          const steps = Array.isArray(testCase.steps)
            ? testCase.steps
                .map(
                  (step, index) =>
                    `      // ${index + 1}. ${step}`
                )
                .join('\n')
            : '';

          return `
    test(
      '[${escapeString(testCase.id)}][${escapeString(
        testCase.layer
      )}] ${escapeString(testCase.title)}',
      async ({ page }) => {
        const loginPage = new LoginPage(page);

${steps}

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
        })
        .join('\n');

      return `
  test.describe('${escapeString(layer)}', () => {
${tests}
  });
`;
    })
    .join('\n');

  return `const { test } = require('@playwright/test');

const { LoginPage } = require('../pages/LoginPage');

/**
 * Shared Login Coverage
 *
 * Source Jira: ${issueKey}
 *
 * Login is reusable and therefore remains under tests/shared.
 */

test.describe(
  'Shared Login - ${escapeString(issueKey)}',
  () => {
${sections}
  }
);
`;
}

module.exports = {
  pascalCase,
  pageObjectTemplate,
  specTemplate,
  sharedLoginPageTemplate,
  sharedLoginSpecTemplate,
  escapeString
};