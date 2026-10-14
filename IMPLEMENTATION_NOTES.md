# Implementation Notes

## 1. What I changed

**Task 1:** Fixed line-item change detection so quantity, unit-price, and description edits classify as `changed` (`diff.util.ts`). Gated Approve/Reject on `PENDING_APPROVAL` plus an approve-scope policy (`canActOnPendingCr`).

**Task 2:** Kept list loading / loaded / empty / error states. Implemented client-side status filtering via `visibleRows`, including a distinct “no matches” message when the API returned rows but the filter matches none.

**Task 3–4:** Built the detail diff (before/after, kinds, totals, signed delta), chronological timeline from a sorted copy of `audit`, permission-aware actions, reject-reason validation (`requiredTrimmed`), Approve/Reject against the mock API, in-flight disablement, and post-failure reconcile. Read-only users can view data; actions are not enabled.

**Beyond the minimal brief:** Selection races (`loadSeq`), list sync via `changed` → `applyRemoteUpdate`, mid-flight navigation safety, user-switch remount, and responsive CSS (including keyboard-accessible ID selection).

## 2. Component & state model

`AppComponent` owns `selectedId`, remounts panes on “Acting as” user changes, and forwards detail `changed` events into the list. `CrListComponent` and `CrDetailComponent` each expose an explicit `ViewState` (`idle` / `loading` / `loaded` / `empty` / `error`) so templates never rely on blank screens. Detail keeps action fields (`submitting`, `pendingKind`, `actionsBlocked`, success/error messages, `rejectControl`) separate from fetch state. Diff and timeline are derived getters; money formatting is shared through `money.util`.

## 3. Invariants I keep

| Invariant | How / where |
|---|---|
| Actions only when pending + approve policy | `canActOnPendingCr`; template disable / Reject `*ngIf` |
| Reject requires non-whitespace reason | `requiredTrimmed`; button disabled until valid |
| No double submit | `submitting` guard + disabled buttons |
| Stale loads cannot overwrite current CR | `loadSeq` + id checks in `load` / actions |
| List stays coherent after actions | Always emit `changed` for the acted-on CR; detail UI updates only if still current |
| Timeline does not mutate API audit | `[...audit].sort(...)` |
| Org switch drops stale detail | Clear `selectedId` and remount panes |

## 4. Testing strategy

47 Jest tests across 6 suites — see `TESTING_OVERVIEW.md`. Pure unit tests cover diff, permissions, and money. Component/DOM tests cover list states/filter, detail rendering, actions, failNext reconcile, and race cases (stale response, mid-flight navigation). Tests drive the mock with `failNext` or deferred Promises rather than real delays. Deliberately skipped: visual regression, E2E browser automation, and clean-clone CI in this note’s scope (run locally before final delivery).

## 5. Assumptions

- Models lack owner/workspace fields, so `u`/`w` scopes are not interpreted in the UI; any approve-scope policy is treated as sufficient. Org scoping remains the mock API’s job.
- There is no reject-specific policy; Reject uses the same gate as Approve.
- For viewers, Approve stays visible but disabled and Reject is hidden — preserves the original detail test contract while ensuring no enabled actions.
- Totals/delta come from API detail fields; the client does not recompute agreement totals.
- Mock `transition` writes before `settle`, so UI reconciles after `failNext`. That is this mock’s behavior, not a claimed production HTTP guarantee.

## 6. Where I used AI

Cursor AI assisted with implementation, tests, debugging, and UI polish. ChatGPT assisted with guidance, review structure, and documentation planning. I reviewed the resulting changes, kept or rejected suggestions, and manually ran verification (`npm test`, typecheck, lint, production build, and browser layout checks).

## 7. What I'd improve with more time

- Stronger production-shaped API (Observables/HttpClient) and real server-side authorization.
- Richer ownership/workspace policy once models support it.
- Optional E2E pass and a recorded walkthrough polish pass.
- Clean-clone `npm ci && npm test` confirmation as the final packaging step.

### Final verification (confirmed locally)

- 47/47 tests passing (6 suites).
- TypeScript typecheck, ESLint, and production build passed.
- Desktop/responsive layouts checked in the browser.
- Not claimed here: clean-clone install, or completion of the 5–8 minute walkthrough video.
