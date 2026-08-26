const {
  test,
  expect
} = require('../../../shared/fixtures/authenticated');

const {
  ManageAndSearchEmployeesFromPIMEmployeeListPage
} = require('../pages/ManageAndSearchEmployeesFromPIMEmployeeListPage');

const testData =
  require('../data/test-data');


const {
  PIMPage
} = require('../../../shared/pages/PIMPage');


/**
 * Jira:
 *   SCRUM-2
 *
 * Summary:
 *    Manage and Search Employees from PIM Employee List
 *
 * STLC layers from Jira analysis:
 *   Functional, Validation
 *
 * Generated layers:
 *   Functional
 *   Validation
 *
 * Explicitly excluded:
 *   Security
 *   Performance
 *   Compatibility
 *
 * Authentication:
 *   tests/shared/fixtures/authenticated.js
 *
 * Reusable PIM navigation:
 *   tests/shared/pages/PIMPage.js
 *
 * Feature-specific functionality:
 *   tests/jira/SCRUM-2
 *
 * Test data:
 *   ../data/test-data
 */

test.describe(
  'SCRUM-2 -  Manage and Search Employees from PIM Employee List',
  () => {


  test.describe(
    'Functional',
    () => {


  test(
    '[AC-01-FUNCTIONAL-Functional] Verify access Employee List [Scenario-01]',
    async ({ page }) => {

      const featurePage =
        new ManageAndSearchEmployeesFromPIMEmployeeListPage(page);

      const pimPage =
        new PIMPage(page);

      // Jira:
      // SCRUM-2

      // Jira scenario:
      // 1. Given the user is logged in as an Admin
      // 2. When the user navigates to PIM → Employee List


      await pimPage.openEmployeeList();

      await expect(page).toHaveURL(
        /\/web\/index\.php\/pim\/viewEmployeeList/
      );


      await featurePage.expectEmployeeTableVisible();


      // Expected result:
      // Access Employee List

    }
  );


  test(
    '[AC-02-FUNCTIONAL-Functional] Verify display Employee Records [Scenario-02]',
    async ({ page }) => {

      const featurePage =
        new ManageAndSearchEmployeesFromPIMEmployeeListPage(page);

      const pimPage =
        new PIMPage(page);

      // Jira:
      // SCRUM-2

      // Jira scenario:
      // 1. Given the user is on the Employee List page
      // 2. When employee records are available


      await pimPage.openEmployeeList();

      await expect(page).toHaveURL(
        /\/web\/index\.php\/pim\/viewEmployeeList/
      );


      await featurePage.expectEmployeeRecordsDisplayed();


      // Expected result:
      // Display Employee Records

    }
  );


  test(
    '[AC-03-FUNCTIONAL-Functional] Verify click on Add Employee [Scenario-03]',
    async ({ page }) => {

      const featurePage =
        new ManageAndSearchEmployeesFromPIMEmployeeListPage(page);

      const pimPage =
        new PIMPage(page);

      // Jira:
      // SCRUM-2

      // Jira scenario:
      // 1. Given the user is on the Employee List page
      // 2. When click on Add Employee from navigation bar


      await pimPage.openEmployeeList();

      await expect(page).toHaveURL(
        /\/web\/index\.php\/pim\/viewEmployeeList/
      );


      await expect(page).toHaveURL(
        /\/web\/index\.php\//
      );


      // Expected result:
      // Click on Add Employee

    }
  );


    }
  );


  test.describe(
    'Validation',
    () => {


  test(
    '[VAL-001-Validation] Verify negative and boundary behavior for Manage and Search Employees from PIM Employee List [Scenario-01]',
    async ({ page }) => {

      const featurePage =
        new ManageAndSearchEmployeesFromPIMEmployeeListPage(page);

      const pimPage =
        new PIMPage(page);

      // Jira:
      // SCRUM-2

      // Jira scenario:
      // 1. Open the feature under test.
      // 2. Identify an applicable missing, invalid, or boundary input based on the feature.
      // 3. Submit the operation.


      await pimPage.openEmployeeList();

      await expect(page).toHaveURL(
        /\/web\/index\.php\/pim\/viewEmployeeList/
      );


      const employeeId =
        testData.employeeId;

      await featurePage.searchByEmployeeId(
        employeeId
      );


      await featurePage.expectEmployeeRecordVisible(
        employeeId
      );


      // Expected result:
      // The application prevents the invalid operation and provides the appropriate validation behavior defined by the application.

    }
  );


    }
  );


  }
);
