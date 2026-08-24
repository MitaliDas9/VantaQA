const { expect } = require('@playwright/test');

class PIMPage {
  constructor(page) {
    this.page = page;

    this.pimMenu = page
      .getByRole('link', { name: 'PIM', exact: true })
      .first();

    this.employeeListMenu = page
      .getByRole('link', {
        name: 'Employee List',
        exact: true
      })
      .first();

    this.employeeListTable = page.locator('.oxd-table');
  }

  async openEmployeeList() {
    await expect(
      this.page
    ).not.toHaveURL(
      /\/web\/index\.php\/auth\/login/,
      {
        timeout: 15000
      }
    );

    await this.page.waitForLoadState('domcontentloaded').catch(() => {});

    await expect(
      this.pimMenu,
      'PIM menu should be visible after authentication.'
    ).toBeVisible({
      timeout: 15000
    });

    await this.pimMenu.click();

    await expect(
      this.employeeListMenu,
      'Employee List menu should be visible after opening PIM.'
    ).toBeVisible({
      timeout: 15000
    });

    await this.employeeListMenu.click();

    await expect(this.page).toHaveURL(
      /\/web\/index\.php\/pim\/viewEmployeeList/,
      {
        timeout: 20000
      }
    );

    await expect(
      this.employeeListTable,
      'Employee List table should be visible.'
    ).toBeVisible({
      timeout: 15000
    });
  }
}

module.exports = {
  PIMPage
};