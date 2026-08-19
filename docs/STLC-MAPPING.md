# VantaQA STLC Mapping

| VantaQA flow | Framework implementation |
|---|---|
| Jira Story intake | `src/jira/jira-client.js` |
| MCP/tool orchestration | `src/analysis/ai-provider.js` adapter |
| Gap identification | `src/analysis/requirement-analyzer.js` |
| Test layer tagging | `identifyLayers()` |
| Script generation | `src/generation/framework-generator.js` |
| Jira task creation | `JiraTestCaseService` |
| Branch convention | `EH-<jira-number>` |
| Execution | Playwright |
| Auto-healing | `src/healing/locator-healer.js` |
| Defect triage | `src/triage/defect-triage.js` |
| Notifications | `src/notifications/gmail-reporter.js` |
| CI/CD | `.github/workflows/playwright.yml` |
| Test layers | Functional, Validation, Compatibility, Security, Performance |

## Shared component rule

A capability used across stories belongs in `tests/shared`.

Login is the first shared component:

```text
tests/shared/pages/LoginPage.js
tests/shared/tests/login.spec.js
```

A Jira-specific feature must never copy those files into its ticket directory.

## Generation gate

The only generation entry point is:

```bash
npm run jira:generate -- SCRUM-123
```

Therefore a ticket key is mandatory before ticket-specific pages/specs are created.
