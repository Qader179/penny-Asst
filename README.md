# Change Request Review UI (Angular 15)

Completed frontend take-home for a procurement **Change Request (CR)** reviewer workflow. Approvers can find a CR, inspect the proposed agreement changes, review history, and approve or reject — with actions gated by status and user policies.

There is no real backend. Components talk to the mock `CrApiService` (`src/api/cr-api.service.ts`).

**Related docs:** [CANDIDATE_BRIEF.md](./CANDIDATE_BRIEF.md) · [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) · [TESTING_OVERVIEW.md](./TESTING_OVERVIEW.md)

## What this app does

- **List** — org-scoped CRs with loading / loaded / empty / error states, status filter (including a distinct “no matches” view), signed monetary deltas, and keyboard-accessible row selection.
- **Detail** — before/after line-item **diff** (added / removed / changed / unchanged), API totals and signed delta, and a **chronological timeline** (sorted copy of audit; original array is not mutated).
- **Actions** — permission-aware Approve / Reject on `PENDING_APPROVAL` CRs; reject requires a non-whitespace reason; in-flight disablement, list sync after actions, and post-failure reconcile against the mock API.
- **UX** — explicit view-states (no blank panels), success/error feedback, stale-selection protection, safe mid-flight navigation, and a responsive two-column layout that stacks on narrower viewports.

## Stack

- Angular 15 (standalone components, reactive forms)
- TypeScript 4.9.5
- Jest + `jest-preset-angular` (TestBed / jsdom)
- Plain HTML/CSS (no UI kit)

## Setup & commands

Requires Node 18 (`nvm use` → 18.20.3). Keep `.npmrc` (`legacy-peer-deps`).

```bash
npm ci
npm start              # http://localhost:4200
npm test               # 47 Jest tests, 6 suites
npm run typecheck
npm run lint
npm run build          # production build
npm run format         # Prettier on src/**/*.ts
```

## Demo user switcher

`npm start` opens a demo shell with an **Acting as** control in the header:

| Key | Role |
|---|---|
| `approver` | org-alpha, read + approve |
| `viewer` | org-alpha, read-only |
| `otherOrg` | org-beta, read + approve |

Use it to demonstrate permission-aware actions and org-scoped data. Switching users clears the current selection and remounts both panes.

## Policy strings & statuses

Users carry policies shaped **`cr_{action}_{scope}`**:

| action | meaning | | scope | meaning |
|---|---|---|---|---|
| `r` | read | | `u` | user — own CRs |
| `a` | approve | | `w` | workspace |
| `x` | apply | | `o` | org |

Example: `cr_a_o` may approve org CRs; `cr_r_o` alone is read-only. The UI only enables actions the current user is permitted to perform (see notes for scope assumptions when models lack owner/workspace fields).

Statuses: `DRAFT → SUBMITTED → PENDING_APPROVAL → APPROVED → APPLIED`, with `REJECTED` / `CANCELLED` terminal. Approve/Reject apply to `PENDING_APPROVAL`.

## Tests

**47 passing tests** across 6 suites (unit helpers + Angular component/DOM). Full inventory: [TESTING_OVERVIEW.md](./TESTING_OVERVIEW.md).

## Source layout

```
src/
  app/                 # demo shell (selection, user switch, list↔detail sync)
  components/
    cr-list/           # list + filter + selection
    cr-detail/         # diff, timeline, approve/reject
    diff.util.ts       # baseline vs proposed line-item diff
  common/              # view-state, permissions, money formatting
  api/                 # fixtures + mock CrApiService
  session/             # current demo user
  models/              # CR domain types
```
