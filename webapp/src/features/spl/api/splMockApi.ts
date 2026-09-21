// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// In-browser stand-in for SupportPortalLite's own local-dev mock server
// (apps/support-portal-lite/webapp/mock-server/server.js), used by
// useSplApi.ts when isSplBackendConfigured() is false — same role
// csmCasesMockData.ts plays for the CSM port. Ported route-for-route from
// that Express file so the two never drift in meaning, just in transport:
// each Express `(req, res) => ...` handler becomes a plain function
// returning `{status, data}`, matched against `${method} ${path}` instead of
// being registered with the Express router.
/* eslint-disable @typescript-eslint/no-explicit-any -- mirrors the loosely-typed source fixture */

import * as D from "./splMockData";

export class SplMockError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const notFound = (message = "Not found"): never => {
  throw new SplMockError(404, message);
};
const badRequest = (message = "Bad request"): never => {
  throw new SplMockError(400, message);
};

function paginate<T>(arr: T[], query: URLSearchParams): T[] {
  const offset = parseInt(query.get("offset") ?? "", 10) || 0;
  const limit = parseInt(query.get("limit") ?? "", 10) || 10;
  return arr.slice(offset, offset + limit);
}

interface MockCtx {
  params: Record<string, string>;
  query: URLSearchParams;
  body: any;
}
type MockHandler = (ctx: MockCtx) => any;

function buildProjectDetail(project: any) {
  const profile = D.projectRiskProfile[project.sysId] || {};
  const cases = D.cases.filter((c) => c.projectNumber === project.number);
  return {
    sysId: project.sysId,
    name: project.name,
    hasRecentCases: !!profile.hasRecentCases,
    detailedRecentCases: profile.hasRecentCases
      ? [{ priority: "High", count: cases.length, cases: cases.map((c) => ({ sysId: `sysid-${c.number}`, number: c.number })) }]
      : [],
    totalRecentCases: profile.hasRecentCases ? cases.length : 0,
    hasAbandonedCases: !!profile.hasAbandonedCases,
    detailedAbandonedCases: profile.hasAbandonedCases ? [{ sysId: "sysid-mig-1", number: "MIG0001" }] : [],
    isUsingEolProduct: !!profile.isUsingEolProduct,
    softwareModel: profile.isUsingEolProduct
      ? [{ name: "WSO2 Identity Server 5.10", eolDate: "2024-01-01", deployments: [{ sysId: "dep-1", name: project.name + " - Prod" }] }]
      : [],
    deployments: [{ sysId: "dep-1", name: project.name + " - Prod" }],
    hasMigrationDelays: !!profile.hasMigrationDelays,
    detailedMigrationDelays: profile.hasMigrationDelays ? [{ sysId: "sysid-mig-2", number: "MIG0002" }] : [],
    hasEscalatedCases: !!profile.hasEscalatedCases,
    detailedEscalatedCases: profile.hasEscalatedCases ? [{ sysId: "sysid-esc-1", number: "ESC0001" }] : [],
    goLiveStatus: profile.goLive || { status: "Live", isRisk: false },
  };
}

// Ordered as in server.js. Segment-count + exact-static-segment matching
// (see matchRoute below) disambiguates every pair here without needing
// most-specific-first ordering.
const ROUTES: { method: string; pattern: string; handler: MockHandler }[] = [
  // Accounts
  {
    method: "GET", pattern: "/accounts", handler: ({ query }) => {
      let result = [...D.accounts];
      const email = query.get("email");
      const phrase = query.get("phrase");
      if (email) result = result.filter((a) => a.customerSuccessManager === email);
      if (phrase) result = result.filter((a) => a.name.toLowerCase().includes(phrase.toLowerCase()));
      return paginate(result, query);
    },
  },
  {
    method: "GET", pattern: "/accounts/:accountId", handler: ({ params }) => {
      const account = D.accountFor(params.accountId);
      if (!account) return notFound("Account not found");
      return account;
    },
  },
  {
    method: "GET", pattern: "/accounts/:accountId/projects", handler: ({ params, query }) =>
      paginate(D.projects.filter((p) => p.accountNumber === params.accountId), query),
  },
  {
    method: "GET", pattern: "/accounts/:accountId/escalations", handler: ({ params, query }) =>
      paginate(D.escalations[params.accountId] || [], query),
  },
  {
    method: "POST", pattern: "/accounts/:accountId/cases/:caseId/escalate", handler: ({ params }) => {
      const account = D.accountFor(params.accountId);
      const theCase = D.cases.find((c) => c.number === params.caseId);
      if (!account || !theCase) return notFound("Account or case not found");
      const entry = { id: `ESC${D.genId()}`, severity: "Medium", state: "Open", escalatedOn: D.nowIso() };
      D.escalations[account.number] = D.escalations[account.number] || [];
      D.escalations[account.number].unshift(entry);
      return entry;
    },
  },

  // Projects
  {
    method: "GET", pattern: "/projects", handler: ({ query }) => {
      let result = [...D.projects];
      const phrase = query.get("phrase");
      if (phrase) result = result.filter((p) => p.name.toLowerCase().includes(phrase.toLowerCase()));
      return paginate(result, query);
    },
  },
  {
    method: "GET", pattern: "/projects/:projectId", handler: ({ params }) => {
      const project = D.projectFor(params.projectId);
      if (!project) return notFound("Project not found");
      return project;
    },
  },
  {
    method: "GET", pattern: "/projects/:projectId/cases", handler: ({ params, query }) => {
      let list = D.cases.filter((c) => c.projectNumber === params.projectId);
      const stateFilters = query.get("stateFilters")?.split(",").filter(Boolean);
      const caseTypeFilters = query.get("caseTypeFilters")?.split(",").filter(Boolean);
      if (stateFilters?.length) list = list.filter((c) => stateFilters.includes(c.state));
      if (caseTypeFilters?.length) list = list.filter((c) => caseTypeFilters.includes(c.caseType));
      return paginate(list, query);
    },
  },
  {
    method: "GET", pattern: "/projects/:projectId/contacts", handler: ({ params, query }) =>
      paginate(D.contacts[params.projectId] || [], query),
  },

  // Cases
  {
    method: "GET", pattern: "/cases", handler: ({ query }) => {
      let result = [...D.cases];
      const phrase = query.get("phrase");
      const stateFilter = query.get("stateFilter");
      if (stateFilter) result = result.filter((c) => c.state === stateFilter);
      if (phrase) {
        const p = phrase.toLowerCase();
        result = result.filter((c) => c.number.toLowerCase().includes(p) || c.shortDescription.toLowerCase().includes(p));
      }
      return { count: result.length, cases: paginate(result, query) };
    },
  },
  {
    method: "GET", pattern: "/cases/:caseId", handler: ({ params }) => {
      const theCase = D.cases.find((c) => c.number === params.caseId);
      if (!theCase) return notFound("Case not found");
      return theCase;
    },
  },
  {
    method: "GET", pattern: "/cases/:caseId/attachments-info", handler: ({ params, query }) =>
      paginate(D.attachmentsByCase[params.caseId] || [], query),
  },
  {
    method: "GET", pattern: "/cases/:caseId/comments-and-worknotes", handler: ({ params, query }) => {
      const all = D.commentsByCase[params.caseId] || [];
      return { total: all.length, comments: paginate(all, query) };
    },
  },
  {
    method: "POST", pattern: "/cases/:caseId/worknote", handler: ({ params, body }) => {
      const worknote = body?.worknote;
      if (!worknote) return badRequest("worknote is required");
      const theCase = D.cases.find((c) => c.number === params.caseId);
      if (!theCase) return notFound("Case not found");
      const entry = { createdOn: D.nowIso(), caseType: theCase.caseType, type: "work_notes", value: worknote, createdBy: "mock.user@wso2.com" };
      D.commentsByCase[params.caseId] = D.commentsByCase[params.caseId] || [];
      D.commentsByCase[params.caseId].unshift(entry);
      return entry;
    },
  },
  {
    method: "GET", pattern: "/attachments/:attachmentId/download", handler: ({ params }) =>
      `Mock attachment content for ${params.attachmentId}\n(no real file is stored by the mock backend)`,
  },

  // User info / user scan
  { method: "GET", pattern: "/user-info", handler: () => ({ firstName: "Mock", lastName: "User", employeeThumbnail: "" }) },
  {
    method: "POST", pattern: "/scan-user", handler: ({ body }) => [
      {
        system: "Asgardeo",
        systemResult: [
          { state: true, label: `${body?.email ?? "user"} has an active account`, information: null },
          {
            state: false, label: "Not part of the required organization group",
            information: { issue: "Missing group membership", solution: "Add the user to the relevant Asgardeo group.", documentation: "https://wso2.com/asgardeo/docs/", invitationUrl: null },
          },
        ],
      },
    ],
  },

  // Reports (SLA / CS / Timelogs)
  {
    method: "GET", pattern: "/generate-sla-report", handler: ({ query }) => {
      const project = D.projects.find((p) => p.sysId === query.get("projectSysId")) || D.projects[0];
      return {
        projectName: project.name, projectKey: project.key,
        percentileDataList: [
          { key: "90th", caseType: "Incident", priority: "High", responseTime: "98%", workaroundTime: "95%", resolutionTime: "90%" },
        ],
        caseDataList: D.cases.filter((c) => c.projectNumber === project.number).map((c) => ({
          caseSysId: `sysid-${c.number}`, caseId: c.caseId, caseNumber: c.number, caseType: c.caseType,
          casepriority: c.priority, caseState: c.state, opened: c.openedAt, response: "2h 0m", responseSysId: "",
          workaround: "1d 0h", workaroundSysId: "", resolution: "2d 0h", resolutionSysId: "",
        })),
      };
    },
  },
  {
    method: "GET", pattern: "/report-details", handler: ({ query }) => {
      const project = D.projects.find((p) => p.sysId === query.get("projectSysId")) || D.projects[0];
      const account = D.accountFor(project.accountNumber);
      return {
        subscriptionDetails: {
          projectName: project.name, projectKey: project.key, projectType: project.projectType || "Cloud Support",
          accountName: account.name, startDate: project.startDate, endDate: project.endDate,
          supportTier: "Standard", subscription: project.key, totalQueryHours: "100h", consumedQueryHours: "60h",
        },
        casesRecords: D.cases.filter((c) => c.projectNumber === project.number).map((c) => ({
          caseSysId: `sysid-${c.number}`, caseNumber: c.number, engagementType: c.caseType, caseType: c.caseType,
          casePriority: c.priority, caseState: c.state, opened: c.openedAt, description: c.shortDescription,
          updated: c.lastWSO2CommentTime, deployment: c.projectDeploymentName, productName: c.productName,
        })),
        slaDetails: {
          slaRecords: [{ task: "Response", slaDefinition: "4 business hours", businessElapsedPercentage: "80%" }],
          slaPerformanceStats: {
            Workaround: { fraction: 0.9, percentage: "90%" },
            Resolution: { fraction: 0.85, percentage: "85%" },
            Response: { fraction: 0.98, percentage: "98%" },
          },
        },
        projectDeployments: [
          { name: project.name + " - Prod", products: [{ name: "WSO2 API Manager", version: "4.2.0", supportStatus: "Supported", eolDate: "2027-01-01", cores: "4", tps: "500", updateLevelInfo: 12 }] },
        ],
        quarterlyCounts: [{ yearAndQuarter: "2025-Q3", counts: { incidentCount: 2, queryCount: 3 } }],
        monthlyCounts: [{ yearAndMonth: "2025-08", counts: { incidentCount: 1, queryCount: 2 } }],
      };
    },
  },
  {
    method: "GET", pattern: "/generate-timelogs-breakdown-report", handler: ({ query }) => {
      const project = D.projects.find((p) => p.number === query.get("projectId")) || D.projects[0];
      return {
        projectName: project.name, projectKey: project.key, projectType: project.projectType || "Cloud Support",
        remainingQueryHours: project.remainingQueryHours, totalQueryHours: "100h 0m",
        cases: D.cases.filter((c) => c.projectNumber === project.number).map((c) => ({
          caseNumber: c.number, caseId: c.caseId, caseType: c.caseType, shortDescription: c.shortDescription,
          priority: c.priority, state: c.state, totalHours: "2h 0m", consumedQueryHours: "2h 0m",
          timeCards: [{ total: "2h 0m", createdOn: c.openedAt, createdBy: "support.engineer@wso2.com", isBillable: "true", state: "closed" }],
        })),
      };
    },
  },

  // ABT teams / products
  { method: "GET", pattern: "/abt-teams", handler: () => ["Team Alpha", "Team Bravo"] },
  { method: "GET", pattern: "/products", handler: () => ["WSO2 API Manager", "WSO2 Identity Server", "WSO2 Enterprise Integrator"] },
  {
    method: "GET", pattern: "/abt-team-members", handler: () => [
      { name: "Grace Hopper", email: "grace@wso2.com", role: "lead", employeeThumbnail: "" },
      { name: "Ken Iverson", email: "ken@wso2.com", role: "member", employeeThumbnail: "" },
    ],
  },
  {
    method: "GET", pattern: "/abt-team-schedule", handler: ({ query }) => ({
      list: [{ label: query.get("teamId") || "Team Alpha", members: [{ name: "Grace Hopper", roles: [{ name: "lead", label: "Lead" }], schedule: {} }] }],
      metadata: [{ teams: [{ label: "Team Alpha", id: "team-alpha", link: "" }], eventTypes: [{ name: "oncall", label: "On Call" }] }],
      snURL: "",
    }),
  },

  // Customer Health (risk tracking) — stateful
  {
    method: "POST", pattern: "/customer-health/summary", handler: ({ body }) => {
      const { email, phrase, offset = 0, limit = 20 } = body || {};
      let accountsList = [...D.accounts];
      if (email) accountsList = accountsList.filter((a) => a.customerSuccessManager === email);
      if (phrase) accountsList = accountsList.filter((a) => a.name.toLowerCase().includes(String(phrase).toLowerCase()));

      const summaries = accountsList.map((a) => {
        const accProjects = D.projects.filter((p) => p.accountNumber === a.number);
        const statuses = accProjects.map((p) => D.getHealthStatus(p.sysId, a.number).status);
        const overall = statuses.includes("at_risk") ? "at_risk" : (statuses.every((s) => s === "healthy") && statuses.length ? "healthy" : "to_be_reviewed");
        const profiles = accProjects.map((p) => D.projectRiskProfile[p.sysId] || {});
        return {
          accountSysId: a.number,
          accountName: a.name,
          hasNoGoLive: { status: profiles.some((p) => p.goLive?.isRisk) ? "Delayed" : "Live", isRisk: profiles.some((p) => p.goLive?.isRisk), state: a.rating },
          hasRecentCases: profiles.some((p) => p.hasRecentCases),
          hasEolProduct: profiles.some((p) => p.isUsingEolProduct),
          hasAbandonedMigrations: profiles.some((p) => p.hasAbandonedCases),
          hasMigrationDelays: profiles.some((p) => p.hasMigrationDelays),
          hasRecentEscalations: profiles.some((p) => p.hasEscalatedCases),
          noSupportCases6mo: !profiles.some((p) => p.hasRecentCases),
          healthStatus: overall,
        };
      });

      const page = summaries.slice(offset, offset + limit);
      return { data: page, totalCount: summaries.length };
    },
  },
  {
    method: "GET", pattern: "/customer-health/accounts/:accountId", handler: ({ params }) => {
      const account = D.accountFor(params.accountId);
      if (!account) return notFound("Account not found");
      const accProjects = D.projects.filter((p) => p.accountNumber === account.number);
      return { accountName: account.name, customerProjects: accProjects.map(buildProjectDetail) };
    },
  },
  {
    method: "GET", pattern: "/customer-health/accounts/:accountId/health-status", handler: ({ params }) => {
      const accProjects = D.projects.filter((p) => p.accountNumber === params.accountId);
      return accProjects.map((p) => {
        const healthStatus = D.getHealthStatus(p.sysId, params.accountId);
        const openRisk = D.openRiskFor(p.sysId);
        return {
          projectSysId: p.sysId,
          healthStatus,
          openRisk: openRisk ? { ...openRisk, actionItems: D.actionItemsForRisk(openRisk.id) } : null,
        };
      });
    },
  },
  {
    method: "POST", pattern: "/customer-health/accounts/:accountId/init-health-tracking", handler: ({ params, body }) => {
      const projectSysIds: string[] = body?.projectSysIds ?? [];
      projectSysIds.forEach((sysId) => D.getHealthStatus(sysId, params.accountId));
      return {};
    },
  },
  {
    method: "GET", pattern: "/customer-health/accounts/:accountId/action-items", handler: ({ params }) => {
      const accItems = D.actionItems.filter((i) => i.accountSysId === params.accountId);
      return accItems.map((i) => ({ ...i, commentCount: D.actionItemComments.filter((c) => c.actionItemId === i.id).length }));
    },
  },
  {
    method: "GET", pattern: "/customer-health/projects/:projectSysId/risk-history", handler: ({ params }) =>
      D.risks.filter((r) => r.projectSysId === params.projectSysId).map((r) => ({ ...r, actionItems: D.actionItemsForRisk(r.id) })),
  },
  {
    method: "POST", pattern: "/customer-health/projects/:projectSysId/risk", handler: ({ params, body }) => {
      const { accountSysId, comment } = body || {};
      if (!comment) return badRequest("comment is required");
      const risk = {
        id: D.genId(), projectSysId: params.projectSysId, accountSysId, status: "open",
        openedComment: comment, openedByEmail: "mock.user@wso2.com", openedOn: D.nowIso(),
        closedComment: null, closedByEmail: null, closedOn: null,
      };
      D.risks.push(risk);
      const hs = D.getHealthStatus(params.projectSysId, accountSysId);
      hs.status = "at_risk";
      return { ...risk, actionItems: [] };
    },
  },
  {
    method: "POST", pattern: "/customer-health/projects/:projectSysId/mark-healthy", handler: ({ params, body }) => {
      const { accountSysId, comment } = body || {};
      if (!comment) return badRequest("comment is required");
      const record = {
        id: D.genId(), projectSysId: params.projectSysId, accountSysId, status: "closed",
        openedComment: "Marked as healthy", openedByEmail: "mock.user@wso2.com", openedOn: D.nowIso(),
        closedComment: comment, closedByEmail: "mock.user@wso2.com", closedOn: D.nowIso(),
      };
      D.risks.push(record);
      const hs = D.getHealthStatus(params.projectSysId, accountSysId);
      hs.status = "healthy";
      hs.reviewedByEmail = "mock.user@wso2.com";
      hs.reviewedOn = D.nowIso();
      return { ...record, actionItems: [] };
    },
  },
  {
    method: "PUT", pattern: "/customer-health/risks/:riskId/close", handler: ({ params, body }) => {
      const riskId = parseInt(params.riskId, 10);
      const risk = D.risks.find((r) => r.id === riskId);
      if (!risk) return notFound("Risk not found");
      const openItems = D.actionItemsForRisk(riskId).filter((i: any) => i.status === "open" || i.status === "in_progress");
      if (openItems.length > 0) throw new SplMockError(409, "Risk has open action items");
      risk.status = "closed";
      risk.closedComment = body?.comment ?? null;
      risk.closedByEmail = "mock.user@wso2.com";
      risk.closedOn = D.nowIso();
      const hs = D.getHealthStatus(risk.projectSysId, risk.accountSysId);
      hs.status = "to_be_reviewed";
      return { ...risk, actionItems: D.actionItemsForRisk(riskId) };
    },
  },
  {
    method: "POST", pattern: "/customer-health/risks/:riskId/action-items", handler: ({ params, body }) => {
      const riskId = parseInt(params.riskId, 10);
      const { title, description, priority, assignedToEmail, dueDate, projectSysId, accountSysId } = body || {};
      if (!title || !priority) return badRequest("title and priority are required");
      const item = {
        id: D.genId(), riskId, projectSysId, accountSysId, title, description: description || null,
        priority, status: "open", assignedToEmail: assignedToEmail || null, dueDate: dueDate || null,
        resolutionComment: null, resolvedByEmail: null, resolvedOn: null,
        createdByEmail: "mock.user@wso2.com", createdOn: D.nowIso(), updatedOn: D.nowIso(), commentCount: 0,
      };
      D.actionItems.push(item);
      return item;
    },
  },
  {
    method: "PUT", pattern: "/customer-health/action-items/:itemId/status", handler: ({ params, body }) => {
      const itemId = parseInt(params.itemId, 10);
      const item = D.actionItems.find((i) => i.id === itemId);
      if (!item) return notFound("Action item not found");
      const { status, resolutionComment } = body || {};
      item.status = status;
      item.updatedOn = D.nowIso();
      if (status === "resolved" || status === "cancelled") {
        item.resolutionComment = resolutionComment || null;
        item.resolvedByEmail = "mock.user@wso2.com";
        item.resolvedOn = D.nowIso();
      }
      return item;
    },
  },
  {
    method: "GET", pattern: "/customer-health/action-items/:itemId/comments", handler: ({ params }) => {
      const itemId = parseInt(params.itemId, 10);
      return D.actionItemComments.filter((c) => c.actionItemId === itemId);
    },
  },
  {
    method: "POST", pattern: "/customer-health/action-items/:itemId/comments", handler: ({ params, body }) => {
      const itemId = parseInt(params.itemId, 10);
      const comment = body?.comment;
      if (!comment) return badRequest("comment is required");
      const entry = { id: D.genId(), actionItemId: itemId, comment, createdByEmail: "mock.user@wso2.com", createdOn: D.nowIso() };
      D.actionItemComments.push(entry);
      return entry;
    },
  },

  // Usage Metrics — stubbed as empty-but-correctly-shaped responses, same as
  // the source mock: this area of the real backend is large (ServiceNow
  // instance/deployment/usage data) and not worth fabricating realistic
  // numbers for.
  {
    method: "POST", pattern: "/usage-metrics/projects/search", handler: () => ({
      projects: D.projects.map((p) => ({ id: p.sysId, name: p.name, key: p.key })), totalRecords: D.projects.length, offset: 0, limit: 20,
    }),
  },
  { method: "POST", pattern: "/usage-metrics/deployments/search", handler: () => ({ deployments: [] }) },
  { method: "POST", pattern: "/usage-metrics/instances/search", handler: () => ({ instances: [], offset: 0, limit: 0, totalRecords: 0 }) },
  { method: "POST", pattern: "/usage-metrics/deployed-products/search", handler: () => ({ deployedProducts: [], totalRecords: 0, offset: 0, limit: 0 }) },
  {
    method: "POST", pattern: "/usage-metrics/deployed-products/:id/metrics/search", handler: ({ params }) => ({
      deployedProduct: { id: params.id, name: "" },
      summary: { dateRange: { start: "", end: "" }, totalInstances: 0, minCores: null, maxCores: null, avgCores: null },
      chartData: [],
    }),
  },
  {
    method: "POST", pattern: "/usage-metrics/deployed-products/:id/metrics/usage-counts/search", handler: ({ params }) => ({
      deployedProduct: { id: params.id, name: "" },
      summary: { dateRange: { start: "", end: "" }, countTypes: {} },
      chartData: [],
    }),
  },
];

function matchRoute(
  method: string,
  pathname: string,
): { handler: MockHandler; params: Record<string, string> } | null {
  for (const route of ROUTES) {
    if (route.method !== method) continue;
    const patternParts = route.pattern.split("/").filter(Boolean);
    const pathParts = pathname.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < patternParts.length; i++) {
      const pp = patternParts[i];
      if (pp.startsWith(":")) {
        params[pp.slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (pp !== pathParts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { handler: route.handler, params };
  }
  return null;
}

/**
 * Routes a request to the in-memory fixture the same way SupportPortalLite's
 * own local-dev Express mock would. `url` may be root-relative
 * (`/accounts?email=...`, what every ported page builds when
 * isSplBackendConfigured() is false — see useSplApi.ts) or absolute; only the
 * path and query are read.
 */
export function mockSplRequest(method: string, url: string, body?: unknown): unknown {
  const parsed = new URL(url, "http://mock.local");
  const match = matchRoute(method.toUpperCase(), parsed.pathname);
  if (!match) {
    throw new SplMockError(404, `No mock handler for ${method} ${parsed.pathname}`);
  }
  return match.handler({ params: match.params, query: parsed.searchParams, body });
}
