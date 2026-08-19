const { test } = require('@playwright/test');
const { LoginPage } = require('../pages/LoginPage');

test.describe('Shared Login', () => {
  test('login with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(
      process.env.TEST_USER_EMAIL,
      process.env.TEST_USER_PASSWORD
    );
    await loginPage.expectLoggedIn();
  });
});
