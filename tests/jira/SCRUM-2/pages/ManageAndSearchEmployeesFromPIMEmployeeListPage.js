const { expect } = require('@playwright/test');

/**
 * Jira: SCRUM-2
 * Summary:  Manage and Search Employees from PIM Employee List
 *
 * This page object contains feature-specific PIM Employee List
 * functionality only.
 *
 * Authentication is supplied by:
 *   tests/shared/fixtures/authenticated.js
 *
 * PIM navigation is supplied by:
 *   tests/shared/pages/PIMPage.js
 */
class ManageAndSearchEmployeesFromPIMEmployeeListPage {

  constructor(page) {

    this.page = page;

    this.employeeIdInput =
      page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Employee Id' })
      .locator('input')
      .first();

    this.searchInput =
      page.getByPlaceholder('Search');

    this.searchButton =
      page.getByRole('button', { name: /Search/i });

    this.resetButton =
      page.getByRole('button', { name: /Reset/i });

    this.employeeRows =
      page.locator('.oxd-table-body .oxd-table-card');

    this.employeeTable =
      page.locator('.oxd-table');

    this.noRecordsMessage =
      page.getByText(/No Records Found/i);
  }

  /**
   * Search the Employee List by Employee Id.
   */
async searchByEmployeeId(value) {

  await expect(
    this.employeeIdInput,
    'Employee Id input should be visible before searching.'
  ).toBeVisible({
    timeout: 30000
  });

  await this.employeeIdInput.fill(
    String(value)
  );

  await expect(
    this.searchButton,
    'Search button should be visible before searching.'
  ).toBeVisible({
    timeout: 30000
  });

  await this.searchButton.click();
}

  /**
   * Search the Employee List by name.
   */
  async searchByName(value) {

  await expect(
    this.searchInput,
    'Employee search input should be visible before searching.'
  ).toBeVisible({
    timeout: 30000
  });

  await this.searchInput.fill(
    String(value)
  );

  await expect(
    this.searchButton,
    'Search button should be visible before searching.'
  ).toBeVisible({
    timeout: 30000
  });

  await this.searchButton.click();
}

  /**
   * Clear the current Employee List search criteria.
   */
  async resetSearch() {

  await expect(
    this.resetButton,
    'Reset button should be visible before clicking.'
  ).toBeVisible({
    timeout: 30000
  });

  await this.resetButton.click();
}

  /**
   * Return the number of displayed employee records.
   */
  async getEmployeeRowCount() {

    return this.employeeRows.count();
  }

  /**
   * Assert that the Employee List table is visible.
   */
  async expectEmployeeTableVisible() {

    await expect(
      this.employeeTable,
      'Expected Employee List table to be visible.'
    ).toBeVisible();
  }

  /**
   * Assert that at least one employee record is displayed.
   */
  async expectEmployeeRecordsDisplayed() {

    await expect(
      this.employeeRows.first(),
      'Expected at least one employee record to be displayed.'
    ).toBeVisible();
  }

  /**
   * Assert that no employee records are displayed.
   */
  async expectNoEmployeeRecords() {

    const rowCount =
      await this.getEmployeeRowCount();

    if (rowCount === 0) {

      await expect(
        this.noRecordsMessage,
        'Expected "No Records Found" message.'
      ).toBeVisible();

      return;
    }

    await expect(
      this.employeeRows.first(),
      'Expected no employee records after the search.'
    ).not.toBeVisible();
  }

  /**
   * Assert that an employee record containing
   * the supplied value is visible.
   */
  async expectEmployeeRecordVisible(
    value
  ) {

    const matchingRow =
      this.employeeRows
        .filter({
          hasText: String(value)
        })
        .first();

    await expect(
      matchingRow,
      `Expected employee record "${value}" to be visible.`
    ).toBeVisible();
  }

  /**
   * Assert that the Employee Id field
   * contains the supplied value.
   */
  async expectEmployeeIdValue(
    value
  ) {

    await expect(
      this.employeeIdInput,
      'Expected the Employee Id field to contain the search value.'
    ).toHaveValue(value);
  }

  /**
   * Assert that the generic search field
   * contains the supplied value.
   */
  async expectSearchValue(
    value
  ) {

    await expect(
      this.searchInput,
      'Expected the employee search field to contain the search value.'
    ).toHaveValue(value);
  }

}

module.exports = {
  ManageAndSearchEmployeesFromPIMEmployeeListPage
};
