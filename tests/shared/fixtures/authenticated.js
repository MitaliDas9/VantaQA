const { test: base, expect } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');
require('dotenv').config();

/**
 * Shared authenticated fixture.
 *
 * Every Playwright test receives a fresh page.
 * The fixture authenticates that page before the test starts.
 *
 * Feature tests must NOT perform login themselves.
 */
const test = base.extend({
  page: async ({ page }, use) => {
    const username =
      process.env.TEST_USER_EMAIL ||
      process.env.ADMIN_USERNAME;

    const password =
      process.env.TEST_USER_PASSWORD ||
      process.env.ADMIN_PASSWORD;

    if (!username || !password) {
      throw new Error(
        'TEST_USER_EMAIL/TEST_USER_PASSWORD or ADMIN_USERNAME/ADMIN_PASSWORD must be configured.'
      );
    }

    const loginPage = new LoginPage(page);

    console.log(
      `AUTH FIXTURE: authenticating user ${username}`
    );

    await loginPage.goto();

    await loginPage.login(
      username,
      password
    );

    await loginPage.expectLoggedIn();

    console.log(
      `AUTH FIXTURE: authentication successful for ${username}`
    );

    await use(page);
  }
});

module.exports = {
  test,
  expect
};