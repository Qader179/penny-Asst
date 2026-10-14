# Testing Overview

47 Jest tests across 6 suites (`npm test`). Pure **unit** tests exercise helpers without Angular. **Component/DOM** tests use TestBed, assert rendered markup, and flush mock API timers.

```bash
npm test
# related: npm run typecheck | npm run lint | npm run build
```

## 1. `diff.spec.ts` — 6 (unit)

| Test | Verifies |
|---|---|
| detects a removed sku | Baseline-only SKU → `removed` |
| detects an added sku | Proposed-only SKU → `added` |
| detects a quantity-only change as changed | Qty edit → `changed` |
| detects a unit-price-only change as changed | Price-only edit → `changed` |
| detects a description-only change as changed | Description edit → `changed` |
| leaves an identical line item unchanged | Identical lines → `unchanged` |

## 2. `permissions.spec.ts` — 2 (unit)

| Test | Verifies |
|---|---|
| treats any approve-scope policy as sufficient | Approver vs viewer policies |
| allows action only when status is PENDING_APPROVAL and the user may approve | Status + policy gate |

## 3. `money.util.spec.ts` — 3 (unit)

| Test | Verifies |
|---|---|
| formats money with currency and thousands separators | `USD 8,500.00` style |
| prefixes a plus sign for positive signed amounts only | `+` for positive; zero/neg unchanged |
| computes rounded line totals | `quantity × unitPrice` to cents |

## 4. `cr-list.component.spec.ts` — 10 (DOM)

| Test | Verifies |
|---|---|
| renders a row per change request in the user org | Org-scoped rows |
| shows the empty state when the org has no change requests | Empty vs table |
| shows the loading state before the API resolves | Loading UI |
| shows the error state and recovers after Retry | Error + retry |
| narrows visibleRows and the table by status, then restores all for ALL | Status filter |
| shows a no-matches message distinct from the empty API state | Filtered empty |
| emits select with the CR id when a row is clicked | Row click |
| emits select when the row ID button is activated | Keyboard ID button |
| marks the selected row and formats deltas like the detail view | Selection + signed delta |
| applies a remote detail update without clearing the status filter | List sync / filter |

## 5. `cr-detail.component.spec.ts` — 24 (DOM / unit)

| Test | Verifies |
|---|---|
| loads and renders the change request title | Initial load |
| disables Approve for a read-only viewer on a pending CR | Viewer gate |
| keeps Approve rendered but disabled and hides Reject for a read-only viewer | Visibility choice |
| enables Approve for an approver on a pending CR | Approver can act |
| disables Approve and hides Reject when the CR is not pending approval | Status gate |
| renders changed and unchanged diff rows with before/after details for CR-1 | Diff DOM |
| shows description-only changes in the diff panel for CR-2 | Description diff |
| renders footer totals and a signed delta from the API values | Totals/delta |
| renders the timeline oldest-first without mutating the API audit array | Sort copy |
| shows empty messages when there are no line items or timeline entries | Empty panels |
| renders added and removed sides with an em dash for the missing line item | Added/removed |
| rejects empty and whitespace-only values | `requiredTrimmed` |
| blocks Reject until a non-whitespace reason is entered | Reject validation |
| approves a pending CR and updates status, timeline, and success feedback | Approve success |
| rejects a pending CR with the trimmed reason and shows it on the timeline | Reject success |
| disables actions and ignores duplicate clicks while Approve is in flight | Double-submit |
| reconciles after a failed Approve when the mock already persisted the transition | failNext reconcile |
| blocks retries when reconcile also fails after an action error | actionsBlocked |
| emits changed after a successful Approve so the list can synchronize | `changed` emit |
| emits changed after a successful post-failure reconcile | Reconcile emit |
| reloads when the id input changes | Selection reload |
| ignores a stale slower response after a newer selection | `loadSeq` |
| emits list sync for a mid-flight Approve without overwriting the new selection | Mid-flight sync |
| emits list sync for a mid-flight reconcile without touching the new selection UI | Mid-flight reconcile |

## 6. `app.component.spec.ts` — 2 (DOM)

| Test | Verifies |
|---|---|
| clears the selected CR when switching users so another org cannot see stale detail | Org switch |
| forwards detail changed events to the list for status synchronization | Shell list sync |

**Total: 6 + 2 + 3 + 10 + 24 + 2 = 47.**
