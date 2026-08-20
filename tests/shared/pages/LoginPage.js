const { expect } = require('@playwright/test');
require('dotenv').config();

/**
 * Shared Login Page Object.
 * Source requirement: reusable login/authentication functionality.
 */
class LoginPage {
  constructor(page) {
    this.page = page;
    this.usernameInput = null;
    this.passwordInput = null;
    this.loginButton = null;
  }

  async goto() {
    const target = process.env.BASE_URL && process.env.BASE_URL.trim()
      ? process.env.BASE_URL.trim()
      : '/login';
    await this.page.goto(target);
    // If TEST_USER_EMAIL and TEST_USER_PASSWORD are provided, perform an automatic login.
    const user = process.env.TEST_USER_EMAIL;
    const pass = process.env.TEST_USER_PASSWORD;
    if (user && pass) {
      const findFirstVisible = async (selectors) => {
        for (const s of selectors) {
          try {
            const loc = this.page.locator(s).first();
            if (await loc.count() && await loc.isVisible()) return loc;
          } catch (e) {
            // ignore invalid selector
          }
        }
        return null;
      };

      try {
        const usernameCandidates = [
          'input[name="username"]',
          'input[name="txtUsername"]',
          'input[name="email"]',
          'input[placeholder*="User"]',
          'input[placeholder*="Email"]',
          'input[type="text"]',
          "xpath=//input[contains(@id,'user') or contains(@name,'user') or contains(@placeholder,'User') or contains(@placeholder,'Email')]",
        ];

        const passwordCandidates = [
          'input[name="password"]',
          'input[name="txtPassword"]',
          'input[type="password"]',
          "xpath=//input[contains(@id,'pass') or contains(@name,'pass') or contains(@placeholder,'Pass')]",
        ];

        const username = await findFirstVisible(usernameCandidates);
        const password = await findFirstVisible(passwordCandidates);
        if (username && password) {
          await username.fill(user);
          await password.fill(pass);
          const submit = await findFirstVisible(['button[type="submit"]', 'button:has-text("Login")', 'button:has-text("Log in")', 'input[type="submit"]']);
          if (submit) await submit.click();
          else await this.page.keyboard.press('Enter');
          await this.page.waitForLoadState('networkidle');
        }
      } catch (e) {
        // ignore login errors, allow manual handling in tests
      }
    }
  }

  async login(username, password) {
    const findFirstVisible = async (selectors) => {
      for (const s of selectors) {
        try {
          const loc = this.page.locator(s).first();
          if (await loc.count() && await loc.isVisible()) return loc;
        } catch (e) {
          // ignore
        }
      }
      return null;
    };

    const usernameCandidates = [
      'input[name="username"]',
      'input[name="txtUsername"]',
      'input[name="email"]',
      'input[placeholder*="User"]',
      'input[placeholder*="Email"]',
      'input[type="text"]',
      "xpath=//input[contains(@id,'user') or contains(@name,'user') or contains(@placeholder,'User') or contains(@placeholder,'Email')]",
    ];

    const passwordCandidates = [
      'input[name="password"]',
      'input[name="txtPassword"]',
      'input[type="password"]',
      "xpath=//input[contains(@id,'pass') or contains(@name,'pass') or contains(@placeholder,'Pass')]",
    ];

    this.usernameInput = await findFirstVisible(usernameCandidates);
    this.passwordInput = await findFirstVisible(passwordCandidates);

    if (!this.usernameInput || !this.passwordInput) {
      // Try role/label based as last resort
      const byLabelUser = this.page.getByLabel(/email|username|user/i).first();
      const byLabelPass = this.page.getByLabel(/password|pass/i).first();
      if (await byLabelUser.count() && await byLabelUser.isVisible()) this.usernameInput = byLabelUser;
      if (await byLabelPass.count() && await byLabelPass.isVisible()) this.passwordInput = byLabelPass;
    }

    if (this.usernameInput) await this.usernameInput.fill(username);
    if (this.passwordInput) await this.passwordInput.fill(password);

    // Debug output to confirm values were read (mask password)
    try {
      // eslint-disable-next-line no-console
      console.log(`DEBUG: LoginPage.login - username=${username} passwordPresent=${!!password}`);
    } catch (e) {}

    const submitCandidates = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Log in")',
      'button:has-text("Sign in")',
      '.oxd-button',
      'button'
    ];
    const submit = await findFirstVisible(submitCandidates);
    // Diagnostics: log counts for each candidate to help debug
    try {
      const statuses = {};
      for (const s of submitCandidates) {
        try {
          const loc = this.page.locator(s).first();
          const cnt = await loc.count();
          const vis = cnt ? await loc.isVisible() : false;
          statuses[s] = { count: cnt, visible: vis };
        } catch (e) {
          statuses[s] = { error: e.message };
        }
      }
      // eslint-disable-next-line no-console
      console.log('DEBUG: submit candidate statuses:', JSON.stringify(statuses));
    } catch (e) {}

    if (submit) {
      await submit.click();
    } else {
      // fallback to role-based if present
      const roleBtn = this.page.getByRole('button', { name: /log in|login|sign in/i }).first();
      if (await roleBtn.count()) await roleBtn.click();
      else {
        // eslint-disable-next-line no-console
        console.log('DEBUG: No submit button found by candidates or role; cannot click');
      }
    }
  }

  async expectLoggedIn() {
    await expect(this.page).not.toHaveURL(/\/login(?:$|[/?])/);
  }

  async expectValidationMessage(message) {
    await expect(this.page.getByText(message)).toBeVisible();
  }
}

module.exports = { LoginPage };
