const { expect } = require('@playwright/test');

require('dotenv').config();

/**
 * Shared Login Page Object.
 *
 * IMPORTANT:
 * LoginPage.goto() ONLY opens the login page.
 * Authentication is explicitly performed by login().
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

    // Allow slower environments such as CI/GitHub Actions.
    this.page.setDefaultNavigationTimeout(60000);

    await this.page.goto(baseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Do NOT depend on networkidle for this SPA.
    // Wait for the actual login UI instead.
    await expect(
      this.usernameInput,
      'Username input should appear after opening the login page.'
    ).toBeVisible({
      timeout: 30000
    });

    await expect(
      this.passwordInput,
      'Password input should appear after opening the login page.'
    ).toBeVisible({
      timeout: 30000
    });
  }

  async login(username, password) {

    if (!username || !password) {
      throw new Error(
        'Username and password are required for authentication.'
      );
    }

    // Explicitly wait for login controls.
    await expect(
      this.usernameInput,
      'Username input should be visible on the login page.'
    ).toBeVisible({
      timeout: 30000
    });

    await expect(
      this.passwordInput,
      'Password input should be visible on the login page.'
    ).toBeVisible({
      timeout: 30000
    });

    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);

    console.log(
      `DEBUG: LoginPage.login - username=${username} passwordPresent=${!!password}`
    );

    await expect(
      this.loginButton,
      'Login button should be visible.'
    ).toBeVisible({
      timeout: 30000
    });

    await this.loginButton.click();

    // Wait for the actual post-login URL rather than networkidle.
    await expect(this.page).toHaveURL(
      /\/web\/index\.php\/(dashboard|pim|admin|leave|time|ess|performance)/,
      {
        timeout: 30000
      }
    );
  }

  async expectLoggedIn() {

    await expect(this.page).not.toHaveURL(
      /\/web\/index\.php\/auth\/login/,
      {
        timeout: 30000
      }
    );
  }

  async expectValidationMessage(message) {

    await expect(
      this.page.getByText(message)
    ).toBeVisible({
      timeout: 15000
    });
  }
}

module.exports = {
  LoginPage
};