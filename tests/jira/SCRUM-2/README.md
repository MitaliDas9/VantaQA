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

1. [AC-01-FUNCTIONAL][Functional] Verify access Employee List (Functional)
   - Expected: Access Employee List
2. [AC-01-VALIDATION][Validation] Verify access Employee List (Validation)
   - Expected: Access Employee List
3. [AC-02-FUNCTIONAL][Functional] Verify display Employee Records (Functional)
   - Expected: Display Employee Records
4. [AC-02-VALIDATION][Validation] Verify display Employee Records (Validation)
   - Expected: Display Employee Records
5. [FUNC-002][Functional] Verify employee search using Employee Id 0400
   - Expected: The Employee List displays the employee record matching Employee Id 0400.
6. [VAL-001][Validation] Verify employee search validation for an invalid Employee Id
   - Expected: No employee record is displayed for the invalid Employee Id.

## Requirement Gaps

- Negative/boundary scenarios are not explicit.

## Generated Automation

The generated automation uses executable Playwright assertions.

Only Functional and Validation Jira scenarios are generated.

Security, Performance and Compatibility scenarios are intentionally excluded.

The generated feature test does not duplicate login functionality.
