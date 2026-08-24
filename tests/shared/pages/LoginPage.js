const { expect } = require('@playwright/test');
require('dotenv').config();

/**
 * Shared Login Page Object.
 *
 * IMPORTANT:
 * LoginPage.goto() ONLY opens the login page.
 * Authentication is explicitly performed by login().
 *
 * This prevents duplicate login attempts when the shared
 * authenticated fixture is used by feature tests.
 */
class LoginPage {
  constructor(page) {
    this.page = page;

    this.usernameInput = page.locator(
      'input[name="username"], input[name="txtUsername"], input[name="email"], input[placeholder*="User"], input[placeholder*="Email"], input[type="text"]'
    ).first();

    this.passwordInput = page.locator(
      'input[name="password"], input[name="txtPassword"], input[type="password"]'
    ).first();

    this.loginButton = page.getByRole('button', {
      name: /login|log in|sign in/i
    }).first();
  }

  async goto() {
    const baseUrl =
      process.env.BASE_URL && process.env.BASE_URL.trim()
        ? process.env.BASE_URL.trim()
        : 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/login';

    await this.page.goto(baseUrl, {
      waitUntil: 'domcontentloaded'
    });

    await this.page.waitForLoadState('networkidle').catch(() => {});
  }

  async login(username, password) {
    if (!username || !password) {
      throw new Error(
        'Username and password are required for authentication.'
      );
    }

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    const usernameInput = this.page.locator(
      'input[name="username"], input[name="txtUsername"], input[name="email"], input[placeholder*="User"], input[placeholder*="Email"], input[type="text"]'
    ).first();

    const passwordInput = this.page.locator(
      'input[name="password"], input[name="txtPassword"], input[type="password"]'
    ).first();

    await expect(
      usernameInput,
      'Username input should be visible on the login page.'
    ).toBeVisible({ timeout: 15000 });

    await expect(
      passwordInput,
      'Password input should be visible on the login page.'
    ).toBeVisible({ timeout: 15000 });

    await usernameInput.fill(username);
    await passwordInput.fill(password);

    console.log(
      `DEBUG: LoginPage.login - username=${username} passwordPresent=${!!password}`
    );

    const loginButton = this.page.getByRole('button', {
      name: /login|log in|sign in/i
    }).first();

    await expect(
      loginButton,
      'Login button should be visible.'
    ).toBeVisible({ timeout: 15000 });

    await loginButton.click();

    await this.page.waitForLoadState('networkidle').catch(() => {});

    await expect(this.page).toHaveURL(
      /\/web\/index\.php\/(dashboard|pim|admin|leave|time|ess|performance)/,
      {
        timeout: 20000
      }
    );
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(
      /\/web\/index\.php\/auth\/login/,
      {
        timeout: 15000
      }
    );
  }

  async expectValidationMessage(message) {
    await expect(
      this.page.getByText(message)
    ).toBeVisible();
  }
}

module.exports = {
  LoginPage
};