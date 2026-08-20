function pascalCase(value) {
  return value
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
    .replace(/^[a-z]/, c => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '') || 'Feature';
}

function pageObjectTemplate(className, issueKey, summary, locatorConfig = {}) {
  const locator = (name, fallback) => {
    const value = locatorConfig?.[name] || locatorConfig?.[name.toLowerCase()];
    if (typeof value === 'string' && value.trim()) return value;
    return fallback;
  };

  const pimLocator = locator('pim', "page.getByRole('link', { name: /PIM/i })");
  const searchLocator = locator('searchInput', "page.getByPlaceholder('Search')");
  const searchButtonLocator = locator('searchButton', "page.getByRole('button', { name: /Search/i })");
  const resetButtonLocator = locator('resetButton', "page.getByRole('button', { name: /Reset/i })");
  const tableLocator = locator('tableRows', "page.locator('table tbody tr')");

  return `const { expect } = require('@playwright/test');

/**
 * Generated from ${issueKey}: ${summary}
 * Runtime locators can be injected with --locators or --live-locators.
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
    await this.page.waitForURL(/\/web\/index.php\/pim\/viewEmployeeList/);
  }

  async openPim() {
    await this.page.goto('/');
    await this.pimMenu.click();
    await this.page.waitForURL(/\/web\/index.php\/pim\/viewEmployeeList/);
  }

  async searchByName(value) {
    await this.searchInput.fill(value);
    await this.searchButton.click();
  }

  async resetSearch() {
    await this.resetButton.click();
  }

  async verifyLoaded() {
    await expect(this.page).toHaveURL(/\/pim\/viewEmployeeList/);
    await expect(this.heading).toBeVisible();
  }
}

module.exports = { ${className} };
`;
}

function scenarioTestTemplate(issueKey, testCase, pageImport, pageClass) {
  const steps = testCase.steps.map((s, i) => `    // ${i + 1}. ${s}`).join('\n');
  return `
  test('[${testCase.id}][${testCase.layer}] ${escapeString(testCase.title)}', async ({ page }) => {
    const featurePage = new ${pageClass}(page);
${steps}
    // TODO: Replace the generated scaffold actions with real application interactions.
    await featurePage.goto();
    await featurePage.verifyLoaded();
    // Expected: ${escapeString(testCase.expected)}
  });`;
}

function specTemplate(issueKey, summary, testCases, pageClass, pageRelativeImport) {
  const groups = {};
  for (const tc of testCases) {
    (groups[tc.layer] ||= []).push(tc);
  }

  const sections = Object.entries(groups).map(([layer, cases]) => {
    const tests = cases.map(tc =>
      scenarioTestTemplate(issueKey, tc, pageRelativeImport, pageClass)
    ).join('\n');
    return `
  test.describe('${escapeString(layer)}', () => {${tests}
  });`;
  }).join('\n');

  return `const { test } = require('@playwright/test');
const { ${pageClass} } = require('${pageRelativeImport}');

/**
 * ${issueKey}: ${escapeString(summary)}
 *
 * STLC test layers:
 * ${Object.keys(groups).join(', ')}
 *
 * Each test case below maps to a manual Jira sub-task.
 */
test.describe('${issueKey} - ${escapeString(summary)}', () => {${sections}
});
`;
}

function sharedLoginSpecTemplate(issueKey, testCases) {
  const groups = {};
  for (const tc of testCases) (groups[tc.layer] ||= []).push(tc);

  const sections = Object.entries(groups).map(([layer, cases]) => {
    return `
  test.describe('${layer}', () => {
${cases.map(tc => `
    test('[${tc.id}][${tc.layer}] ${escapeString(tc.title)}', async ({ page }) => {
      const loginPage = new LoginPage(page);
${tc.steps.map((s, i) => `      // ${i + 1}. ${s}`).join('\n')}
      await loginPage.goto();
      // TODO: Replace with application-specific data/actions.
      // Expected: ${escapeString(tc.expected)}
    });`).join('\n')}
  });`;
  }).join('\n');

  return `const { test } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

/**
 * Shared login automation generated/updated from ${issueKey}.
 * Login is a reusable component and therefore lives under tests/shared.
 */
test.describe('Shared Login - ${issueKey}', () => {${sections}
});
`;
}

function sharedLoginPageTemplate() {
  return `const { expect } = require('@playwright/test');

/**
 * Shared Login Page Object.
 * Source requirement: reusable login/authentication functionality.
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = page.getByLabel(/email|username/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.loginButton = page.getByRole('button', { name: /log in|login|sign in/i });
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
    await expect(this.page).not.toHaveURL(/\\/login(?:$|[/?])/);
  }

  async expectValidationMessage(message) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}

module.exports = { LoginPage };
`;
}

function escapeString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

module.exports = {
  pascalCase,
  pageObjectTemplate,
  specTemplate,
  sharedLoginPageTemplate,
  sharedLoginSpecTemplate
};
