# SupportPortalLite — functional specification

**Status:** written from the source implementation rather than from any prior document. This is
the reference for verifying the port and for writing test cases against it.

**Source of truth for behaviour:** `digiops-cs/apps/support-portal-lite/webapp` — the source
CRA/plain-MUI webapp — for the UI shape and call patterns, and its own local-dev mock server
(`webapp/mock-server/server.js` + `data.js`) for the backend contract, since
`apps/support-portal-lite/backend` (Ballerina) enforces almost no server-side rules of its own
beyond a handful of group-list checks — see §3.

**In One WSO2:** not a perspective of its own. It is the Sales/Solutions Architecture half of the
**shared `csm` entry point** — see `useCsmTeamGate` and the block comment at the top of the CSM
route section in `App.tsx`. Customer Success sees the CSM Portal (`docs/ported-apps/csm-cases.md`);
Sales/Solutions Architecture sees the screens documented here.

---

## 1. Why this is a shared entry point, not its own perspective

The request that drove this port was: one entry point (today's "CSM" waffle tile), two audiences.
Neither backend can tell the audiences apart — SupportPortalLite's own `authJWT`/`userinfo`
Ballerina modules parse the caller's Asgardeo `groups` claim internally (for the group-list checks
in §3) but never return it from any endpoint, and the CSM Portal's Cases API has no role model at
all. So the split is made **client-side**, from the caller's own id_token `groups` claim
(`useAsgardeoGroups`, the same technique the subscription service's admin gate already uses)
against two independently configured name lists — `ONE_WSO2_CS_TEAM_GROUPS` and
`ONE_WSO2_SALES_TEAM_GROUPS` (`csTeamGroups`/`salesTeamGroups` in `apiConfig.ts`). See
`useCsmTeamGate` (`features/csm/api/useCsmTeamGate.ts`) for the full gate.

This is presentation only, same caveat as every Asgardeo-groups-based gate in this app: it decides
which of the two UIs to show, not what either one lets a caller do. Every backend behind them
re-derives its own authorization from the JWT.

## 2. Routing

Every SupportPortalLite screen is a flat route under `/csm/*`, reusing the source app's own leaf
names from its `AppRoutes.tsx` (minus its `/support` prefix) verbatim — **except** `cases`, renamed
to `support-cases` to avoid colliding with the CSM Portal's own `/csm/cases`. Nothing else collides
because CSM has no equivalent for any of the other domains.

| Route | Screen | Source route |
|---|---|---|
| `/csm` (index) | Dispatches by team — see `CsmOrSplLanding` | `/support` (redirects to `cases`) |
| `/csm/support-cases` | Case list | `/support/cases` |
| `/csm/support-cases/:caseId` | Case detail | `/support/cases/:caseId` |
| `/csm/all-accounts`, `/csm/my-accounts` | Accounts list (same component, filtered by path) | `/support/all-accounts`, `/support/my-accounts` |
| `/csm/accounts/:accountId` | Account detail | `/support/accounts/:accountId` |
| `/csm/accounts/:accountId/projects/:projectId`, `/csm/projects/:projectId` | Project detail (both source routes land here) | same |
| `/csm/projects` | Projects list | `/support/projects` |
| `/csm/projects/:projectId/sla-report/:sysId` | SLA report | same |
| `/csm/projects/:projectId/cs-report/:sysId` | CS report (PDF-exportable) | same |
| `/csm/projects/:projectId/timelogs-report` | Timelogs report | same |
| `/csm/team-schedule`, `/csm/team-schedule/:sysId` | Team schedule | `/support/team-schedule/:sysId?` |
| `/csm/user-scan` | User scan | same |
| `/csm/customer-health` | Customer health dashboard | same |
| `/csm/customer-health/account/:accountId` | Customer health detail | same |
| `/csm/usage-metrics` | Usage metrics dashboard | same |

Because `CsmShell` and `SplShell` each independently lock out the wrong audience (see §4), a
Customer Success caller who types a SupportPortalLite URL — or vice versa — gets a "wrong
audience, here's how to get to your own screens" state rather than leaking content. Only the bare
`/csm` index genuinely needs to dispatch, since nothing path-specific exists for it to gate against
yet.

The rail (`SideRail.tsx`) picks between `CSM_SECTIONS` and `SPL_SECTIONS`
(`constants/perspectives.ts`) at render time based on the same gate, the same special-case shape it
already uses for Marketing Ops and People Ops. `SPL_SECTIONS` mirrors the source app's own
top-level nav (`SideNavBar.tsx`: Cases, Accounts, Projects, User Scan, Customer Health, Usage
Metrics) with one addition — Team Schedule, which wasn't a rail item there (reached only via
in-page links, given its optional `:sysId` param) but gets a stop of its own here since one-wso2's
rail is the only navigation surface.

## 3. Authorization

Two independent layers, ported from two independent places in the source app:

- **Audience** (§1): `useCsmTeamGate`, client-side, Asgardeo groups vs. `ONE_WSO2_CS_TEAM_GROUPS`
  / `ONE_WSO2_SALES_TEAM_GROUPS`. Decides whether a caller sees these screens at all.
- **Fine-grained permissions** (`useSplPermissions`, `features/spl/api/useSplPermissions.tsx`):
  ported 1:1 from the source app's own `Authorize.tsx` `PermissionContext` — four independent
  booleans (add work notes, add escalations, download attachments, view usage metrics), each a
  group-membership check against its own configured list (`ONE_WSO2_SPL_ADD_WORKNOTE_GROUPS` and
  three siblings in `apiConfig.ts`). Decides what a Sales/SA caller may **do** once they're in.

Both layers are UI guidance only, same as every group-based gate in this app: SupportPortalLite's
Ballerina backend enforces its own copies of the fine-grained checks server-side (`operations.bal`),
but has **no route-level RBAC beyond that** — any authenticated, globally-allowed caller may read
every account/project/case/customer-health endpoint. A forged token buys a screen whose write
actions still 403, not access to data a real caller couldn't already read.

## 4. Shells and mock data

`SplShell` (`features/spl/components/SplShell.tsx`) is the Sales/SA counterpart to `CsmShell`,
plain `@mui/material` throughout rather than `@wso2/oxygen-ui` — see §5 on why. Same state ladder:
resolving → error-with-retry → locked (wrong audience) → children, wrapped in
`SplPermissionProvider` so every descendant can read `useSplPermissions()`, with a non-blocking
"sample data" banner when `ONE_WSO2_SPL_BACKEND_URL` isn't configured.

`ONE_WSO2_SPL_BACKEND_URL` is **not set** as of this port — built against the mock contract below,
no real backend stood up. `features/spl/api/useSplApi.ts` reimplements the source app's own
`useGetApi`/`usePostApi`/`useParallelPostApi` (`src/data/hooks/api.ts`) with the **exact same
signatures**, so every ported page's call sites (`getApiData(url)`, `.data`, `.loading`,
`.error.message`) carry over unchanged — only the plumbing underneath differs (one-wso2's own
`useAccessToken` + `fetch` + `Authorization: Bearer` instead of the Asgardeo SDK's `httpRequest` +
manual `x-jwt-assertion`; see the file's own header comment for why). `useSplHttpRequest` is the
equivalent low-level escape hatch for the handful of source components
(`ReviewStatusCell`, `ActionItemsSection`) that call `useAuthContext()`'s `httpRequest` directly
rather than going through those three hooks.

When `isSplBackendConfigured()` is false, every call routes through `mockSplRequest`
(`features/spl/api/splMockApi.ts`), a route-for-route TypeScript port of the source app's own
Express mock server (`mock-server/server.js` + `data.js`) — same endpoints, same in-memory fixture,
same stateful mutations (create a risk, close it, add an action item — all work end-to-end), just
matched against `${method} ${path}` instead of registered with Express. Once
`ONE_WSO2_SPL_BACKEND_URL` is set, remove `splMockApi.ts`/`splMockData.ts` and the
`isSplBackendConfigured() ? real : mock` branch inside `performRequest` (`useSplApi.ts`) — nothing
else needs to change.

## 5. Deliberate differences from the source

- **Visual fidelity, not design-system consistency.** Per the port decision, ported screens keep
  the source app's plain-MUI look rather than being rebuilt in `@wso2/oxygen-ui` (the CSM Portal's
  design system). This means the SupportPortalLite screens look visually distinct from the rest of
  One WSO2 — a deliberate tradeoff, not an oversight.
- **No separate auth/session chrome.** The source app's own `AuthProvider`,
  `AuthenticatedComponent`, `Authorize.tsx`'s allow-list redirect, and `BaseLayout`'s
  `Header`/`NavBar`/`Footer` are all dropped — one-wso2 already owns sign-in and the
  rail/header chrome globally. Every page component underneath is otherwise unchanged, since the
  source app's only nested route (`BaseLayout`'s `<Outlet/>`) made this a clean swap.
- **Team Schedule promoted to a rail item** — see §2.
- **`cases` renamed to `support-cases`** in the URL — see §2.
- Dropped entirely: the stray `@angular/router` dependency (unused in the source app) and the
  local-dev-only `mock-server`/`mocks` scaffolding (used only as a reference while writing
  `splMockApi.ts`/`splMockData.ts`, not carried into this app).
