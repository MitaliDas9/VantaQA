const { expect } = require('@playwright/test');

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
    await expect(this.page).not.toHaveURL(/\/login(?:$|[/?])/);
  }

  async expectValidationMessage(message) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}

module.exports = { LoginPage };
