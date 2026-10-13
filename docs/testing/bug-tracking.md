# Bug Tracking

Use **GitHub Issues** (labels below) and a Project board with columns: Backlog → In progress → In review → Ready to test → Done.

## 1. Severity

| Sev   | Meaning                                          | Examples                                                      | Target                          |
| ----- | ------------------------------------------------ | ------------------------------------------------------------- | ------------------------------- |
| Sev-1 | Data loss, privacy/security breach, app unusable | Student sees others' photos; deadline bypass; crash on launch | Fix immediately; blocks release |
| Sev-2 | Core flow broken, no workaround                  | Upload always fails; push never arrives; cannot approve       | Fix before release              |
| Sev-3 | Feature degraded, workaround exists              | Filter count off; retry needs two taps                        | Fix if time                     |
| Sev-4 | Cosmetic/text                                    | Misaligned chip, typo                                         | Backlog                         |

## 2. Labels

`bug`, `sev-1…sev-4`, `area:auth|events|upload|gallery|review|browse|reports|notifications|ui|api|db|infra`, `platform:android|ios`, `needs-repro`, `blocked`, `wontfix`.

## 3. Workflow

1. Reporter opens an issue with the template below; adds severity guess + area.
2. Triage (daily in week 7): confirm severity, assign owner.
3. Fix on a branch `fix/<issue>-<slug>`, PR references `Fixes #id`, includes a regression test when feasible.
4. QA verifies on a device; closes the issue.
5. Release notes list fixed Sev-1/2 bugs.

## 4. Issue template (paste into `.github/ISSUE_TEMPLATE/bug_report.md` in the repo)

```
**Summary**
**Build / version / device (Android version)**
**Account role (student/admin)**
**Steps to reproduce**
1.
2.
**Expected result**
**Actual result**
**Evidence** (screenshot / screen recording / request id from `x-request-id`)
**Related test case / requirement** (e.g. TC-UP-10, FR-UP-07)
**Severity guess**
```

## 5. Rules

- Never paste real student photos, emails, or tokens in issues; use test accounts.
- Security issues: label `sev-1`, mark the issue private/confidential (or report directly to the lead), fix before disclosure.
- Track metrics in week 7: open bugs by severity, fixed per day.
