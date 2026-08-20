const { expect } = require('@playwright/test');

/**
 * Generated from SCRUM-2:  Manage and Search Employees from PIM Employee List
 * Replace placeholder selectors with stable application selectors.
 */
class ManageAndSearchEmployeesFromPIMEmployeeListPage {
  constructor(page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: /replace me/i });
    this.pimMenuLink = page.getByRole('link', { name: /PIM/i });
  }

  async goto() {
    // Navigate directly to the PIM Employee List page
    await this.page.goto('https://opensource-demo.orangehrmlive.com/web/index.php/pim/viewEmployeeList');
  }

  async gotoViaMenu() {
    // Open the application root and click the PIM menu item
    await this.page.goto('/');
    await this.clickPIM();
  }

  async clickPIM() {
    await this.pimMenuLink.click();
    await this.page.waitForURL(/\/web\/index.php\/pim\/(viewEmployeeList|viewPimModule)/);
  }

  async verifyLoaded() {
    await expect(this.heading).toBeVisible();
  }
}

module.exports = { ManageAndSearchEmployeesFromPIMEmployeeListPage };
