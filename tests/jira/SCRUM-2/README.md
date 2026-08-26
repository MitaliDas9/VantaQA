# SCRUM-2 -  Manage and Search Employees from PIM Employee List

## Jira

Issue: SCRUM-2

Summary:  Manage and Search Employees from PIM Employee List

## STLC Layers

- Functional
- Validation

## Allowed Test Layers

- Functional
- Validation

## Excluded Test Layers

- Security
- Performance
- Compatibility

## Authentication

Authentication is supplied by:

`tests/shared/fixtures/authenticated.js`

## Shared Components

Reusable PIM navigation is supplied by:

`tests/shared/pages/PIMPage.js`

## Test Cases

1. [AC-01-FUNCTIONAL][Functional] Verify access Employee List
   - Expected: Access Employee List
2. [AC-02-FUNCTIONAL][Functional] Verify display Employee Records
   - Expected: Display Employee Records
3. [AC-03-FUNCTIONAL][Functional] Verify click on Add Employee
   - Expected: Click on Add Employee
4. [VAL-001][Validation] Verify negative and boundary behavior for  Manage and Search Employees from PIM Employee List
   - Expected: The application prevents the invalid operation and provides the appropriate validation behavior defined by the application.

## Requirement Gaps

- Negative/boundary scenarios are not explicit.
- Security/access-control coverage is not explicit.
- Compatibility/browser coverage is not explicit.
- Performance/response-time coverage is not explicit.

## Generated Automation

The generated automation uses executable Playwright assertions.

Only Functional and Validation Jira scenarios are generated.

Security, Performance and Compatibility scenarios are intentionally excluded.

The generated feature test does not duplicate login functionality.
