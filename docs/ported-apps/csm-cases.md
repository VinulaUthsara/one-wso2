# CSM Portal — Cases (v1) — functional specification

**Status:** written from the source implementation rather than from any prior document. This is
the reference for verifying the port and for writing test cases against it.

**Source of truth for behaviour:** `wso2-open-operations/cs-tools/apps/csm-portal` — the Go
backend's `internal/handler/cases.go` (+ `case_update_requests.go`, `cmd/server/main.go`) for the
server rules, and the source webapp's `features/csm-cases` / `features/case-tabs` /
`types/csmCases.ts` for the UI shape. Where the two disagreed, the server is authoritative.

**In One WSO2:** a new top-level perspective, `csm`, internal-CSM-only.

| Route | Screen | Who |
|---|---|---|
| `/csm` | Overview | any CSM Portal user |
| `/csm/cases` | Case list/search | any CSM Portal user |
| `/csm/cases/new` | Create case | any CSM Portal user |
| `/csm/cases/:caseId` | Case detail (Activities/Details tabs) | any CSM Portal user |

Backend reached via `ONE_WSO2_CSM_BACKEND_URL`; the existing service is reused unchanged. **Not
yet pointed at a real backend as of this slice** — see §6.

---

## 1. Purpose and scope

The CSM Portal is WSO2's internal customer-support tooling: CS engineers work customer cases
(create, triage, comment, escalate, close) alongside several other domains (Incidents, Change
Requests, Security Center, Dashboards, ...) not yet ported. This is the **Cases** domain only, and
within it, the **core case lifecycle**: search/list, case detail (header + Activities + Details),
create, state/workState transitions, tags, escalations.

Deliberately **not** in this slice — each is its own future addition to `features/csm/cases/` (or
a sibling domain folder):

- Attachments, including the SFTPGo direct-upload token/share/confirm flow (conditionally
  registered server-side).
- Call requests (schedule/reschedule/reject/conclude).
- SLA tab, Time tracking, Linked items (related service/change requests), Watchers.
- "Request customer update" (template-based comment, `case_update_requests.go`).
- GitHub issue linking.
- Case feedback dashboard (`/cases/feedback/*`).
- The `autocloseHoldUntil` PATCH field and its async work-note side effect.
- Every other CSM Portal domain (Incidents, Problems, Outages, Change Requests, Accounts/Projects,
  Security Center, Product Updates, Dashboards, Users/Teams/Catalogs).
- The Customer Portal, entirely — it needs external-customer access, which this internal-employee
  webapp cannot provide, so it can't be ported into this app at all.

---

## 2. Screens

### 2.1 Overview (`/csm`)

One tile today, linking to Cases — written to grow into a small grid as more domains land, not a
redesign.

### 2.2 Case list (`/csm/cases`)

Filter bar (state, severity, assigned-to-me, free text) + a table (Case/Product/Type/
Severity/Assignee/Customer/State/Created/Escalation). Row click → detail. "New case" button.

### 2.3 Case detail (`/csm/cases/:caseId`)

Header: state/severity/workState/escalation chips, customer + assignee. Next-state action
buttons driven directly by the case's server-computed `nextStates` (see §3). Tags (add/remove
inline). Escalation panel (escalate with a required reason; de-escalate, shown only when the
caller is a currently-notified recipient). Two tabs:

- **Activities** — comments and the audit trail merged into one chronological feed, plus the
  comment composer (comment vs work note), gated per §4.
- **Details** — description, case/customer/product context fields, resolution (when closed).

### 2.4 Create case (`/csm/cases/new`)

Subject (required), description, severity, issue type, product. When arrived at via "Create
related case" (see §3), shows an info banner naming the related case and sends `relatedCaseId` on
create.

---

## 3. State machine

States: `open, work_in_progress, waiting_on_wso2, awaiting_info, solution_proposed, closed,
reopened` — see `CASE_TRANSITIONS` in `webapp/src/features/csm/cases/api/csmCaseTypes.ts`, which
mirrors the backend's `state.go` table exactly. `closed` is terminal.

`workState` (`ongoing`/`paused`) only applies while `state === work_in_progress`; the detail
page's Pause/Resume button is the only way to change it in this slice.

**`reopened` is not a real transition.** For a case closed within the last 60 days AND of type
`case` (not `announcement`/engagement/etc.), the backend injects `nextStates: ["reopened"]` — but
the correct handling is "Create related case" (a fresh case carrying `relatedCaseId`), never
`PATCH state=reopened`. `isEligibleForRelatedCase` reproduces the eligibility check for the mock
backend; the case-detail page renders that option as "Create related case" and routes it to the
create form rather than issuing a state PATCH. **Do not build a literal reopen action** — it would
be a functional bug, not a simplification.

---

## 4. Comment authorization (client-side affordance only)

The backend's `CreateCaseComment` guard (reproduced by `commentGateReason` in `csmCaseTypes.ts`,
shared between the mock backend and the composer's disabled state):

- `work_note`: blocked only when the case is `closed`. Exempt from the ownership/ongoing gate.
- `caseType === "announcement"`: blocked only when `closed`.
- Every other case: requires `state === work_in_progress && workState === "ongoing"` **and** the
  caller be the case's `assignedEngineer` — resolved via `GET /users/me`, **never** a raw JWT
  claim (see `isSameCsmUser`).

De-escalation follows the same "resolve identity via `/users/me`, never a claim" rule: only
someone in the escalation history's `currentNotifiedUsers` may de-escalate.

**This is UI guidance, not security.** The Cases API has **no role-based access control at any
route** — confirmed directly from the handler code, including an explicit comment that RBAC must
not be invented at this layer. `useCsmGate` reflects that: there is no role to check, so
"`GET /users/me` succeeded" is the entire access decision for the perspective. Do not add a role
check to any case action ahead of the backend actually having one — that would diverge from
source behaviour, not fix a gap.

---

## 5. Authorization (perspective-level)

`useCsmGate` gates the whole perspective on `GET /users/me` succeeding — no role vocabulary,
unlike every other ported perspective's gate (Due Diligence, Marketing Ops, Subscriptions). This
is a direct consequence of §4: there is nothing more specific for the backend to grant.

---

## 6. Mock data layer (temporary — remove once a backend is configured)

`ONE_WSO2_CSM_BACKEND_URL` is **not set** as of this slice — built UI-first against the contract
above, with no backend stood up. Every hook in `features/csm/cases/api/` branches on
`isCsmBackendConfigured()`: configured → the real `authed*` calls against `csmServiceUrls`;
unconfigured → `csmCasesMockData.ts`, an in-memory fixture (a handful of sample cases across
states/severities, with comments/activities/tags/escalation history) that mutations actually
mutate, so create → list → open → comment → escalate all work end-to-end for manual testing.

`CsmShell` reflects this deliberately: unlike every sibling shell (`MarketingOpsShell`,
`DueDiligenceShell`), it does **not** block on "backend not configured" — it shows a small
non-blocking "Showing sample data" banner instead and renders the screen normally. Blocking here
would defeat the point of the mock layer. Once `ONE_WSO2_CSM_BACKEND_URL` is set, remove
`csmCasesMockData.ts` and the `configured ? mock… : real…` branch in each hook — nothing else
needs to change.

---

## 7. Deliberate differences from the source

| # | Source behaviour | Here | Why |
|---|---|---|---|
| 1 | Both `webapp` and `microapp` frontends (desktop SPA vs mobile-shell-embedded) | One set of screens, built fresh in One WSO2's own Oxygen UI conventions | `microapp` targets a native mobile shell (`HashRouter` + a device bridge) that has no equivalent host here; `webapp` is the port target per the earlier research pass. |
| 2 | `nextStates` includes "reopened" as a literal option | Rendered as "Create related case", routes to the create form | See §3 — treating it as a real transition would be a bug, not fidelity. |
| 3 | No RBAC on any case route | Same — no role gating added anywhere | See §4/§5 — inventing a permission model the backend doesn't have would diverge from source behaviour. |
| 4 | `autocloseHoldUntil` PATCH fires an async work-note side effect | Not implemented (field not in v1's PATCH surface) | Deferred with attachments/call-requests/etc. — see §1. |

---

## 8. Test checklist

- [ ] Waffle shows "CSM" and opens `/csm` with an Overview tile for Cases.
- [ ] `/csm/cases` lists the sample cases; state/severity/assigned-to-me/text filters narrow the list.
- [ ] Opening a case shows the right header chips, and only the valid next-state buttons per its `state`.
- [ ] The closed-and-recent sample case (CS-1005) offers "Create related case", not a "Reopen" action; clicking it prefills the create form with the related case named.
- [ ] The old closed sample case (CS-1006, closed >60 days ago) offers no reopen/related-case option.
- [ ] Opening CS-1001 (assigned to the mock "me") with the composer set to "Comment": composer is enabled while `work_in_progress`/`ongoing`; posting appends it to the Activities feed immediately.
- [ ] Opening CS-1002 (assigned to someone else, `awaiting_info`): the composer is disabled with a reason shown; switching to "Work note" is still blocked only if the case is closed (it isn't here, so work notes ARE allowed).
- [ ] The announcement-type case (CS-1004) allows comments while open regardless of workState, per the type carve-out.
- [ ] Adding/removing a tag updates the header immediately.
- [ ] Escalating CS-1002 requires a reason; de-escalating is only offered when the caller is a notified recipient of the current escalation.
- [ ] Creating a new case adds it to the top of the list and opens its detail page.
- [ ] The "Showing sample data" banner appears on every CSM screen while `ONE_WSO2_CSM_BACKEND_URL` is unset, and disappears once it's set to a real (even placeholder) URL — confirming hooks actually branch on it rather than being hardcoded to the mock.
