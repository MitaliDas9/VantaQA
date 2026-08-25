const { expect } = require('@playwright/test');

class PIMPage {

  constructor(page) {

    this.page = page;

    this.pimMenu = page
      .getByRole('link', {
        name: 'PIM',
        exact: true
      })
      .first();

    this.employeeListMenu = page
      .getByRole('link', {
        name: 'Employee List',
        exact: true
      })
      .first();

    this.employeeListTable = page.locator('.oxd-table');

    // Employee List search controls.
    this.employeeIdInput = page
      .locator('.oxd-input-group')
      .filter({
        hasText: 'Employee Id'
      })
      .locator('input')
      .first();

    this.searchInput = page
      .getByPlaceholder('Search')
      .first();

    this.searchButton = page
      .getByRole('button', {
        name: /Search/i
      })
      .first();
  }

  async openEmployeeList() {

    // Make sure authentication completed.
    await expect(
      this.page
    ).not.toHaveURL(
      /\/web\/index\.php\/auth\/login/,
      {
        timeout: 30000
      }
    );

    // Wait for the PIM navigation item.
    await expect(
      this.pimMenu,
      'PIM menu should be visible after authentication.'
    ).toBeVisible({
      timeout: 30000
    });

    await this.pimMenu.click();

    // Wait for Employee List navigation item.
    await expect(
      this.employeeListMenu,
      'Employee List menu should be visible after opening PIM.'
    ).toBeVisible({
      timeout: 30000
    });

    await this.employeeListMenu.click();

    // Wait for the Employee List URL.
    await expect(this.page).toHaveURL(
      /\/web\/index\.php\/pim\/viewEmployeeList/,
      {
        timeout: 30000
      }
    );

    // Wait for actual page content.
    await expect(
      this.employeeListTable,
      'Employee List table should be visible.'
    ).toBeVisible({
      timeout: 30000
    });

    // Wait for search controls to render.
    await expect(
      this.searchButton,
      'Employee List Search button should be visible.'
    ).toBeVisible({
      timeout: 30000
    });

    await expect(
      this.searchInput,
      'Employee List search input should be visible.'
    ).toBeVisible({
      timeout: 30000
    });

    // Employee ID is needed by SCRUM-2 scenarios.
    await expect(
      this.employeeIdInput,
      'Employee Id input should be visible on Employee List.'
    ).toBeVisible({
      timeout: 30000
    });
  }
}

module.exports = {
  PIMPage
};