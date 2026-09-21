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

// In-memory fixture for the ported SupportPortalLite screens, used while
// ONE_WSO2_SPL_BACKEND_URL is unset (see isSplBackendConfigured — this
// mirrors csmCasesMockData.ts's role for the CSM port). Ported 1:1 from the
// source app's own local-dev fixture
// (apps/support-portal-lite/webapp/mock-server/data.js) — that file is the
// most direct reference for realistic shapes since it was written against
// this exact backend's contract, not invented for this port.
/* eslint-disable @typescript-eslint/no-explicit-any -- mirrors the loosely-typed source fixture; splMockApi.ts is the only consumer */

let nextId = 1000;
const genId = () => nextId++;
export const nowIso = () => new Date().toISOString().replace("T", " ").substring(0, 19);

export const accounts: any[] = [
  {
    number: "ACCT1001", name: "Acme Corp", region: "APAC", country: "Sri Lanka", city: "Colombo",
    arr: "120000", accountManager: "Alice Perera", technicalOwner: "Bob Silva",
    customerSuccessManager: "mock.user@wso2.com", rating: "Active", driveLocation: "",
  },
  {
    number: "ACCT1002", name: "Globex Inc", region: "EMEA", country: "Germany", city: "Berlin",
    arr: "85000", accountManager: "Chris Mueller", technicalOwner: "Dana Weiss",
    customerSuccessManager: "other.user@wso2.com", rating: "Active", driveLocation: "",
  },
  {
    number: "ACCT1003", name: "Initech", region: "AMER", country: "USA", city: "Austin",
    arr: "45000", accountManager: "Erin Cole", technicalOwner: "Frank Diaz",
    customerSuccessManager: "mock.user@wso2.com", rating: "At Risk", driveLocation: "",
  },
];

export const projects: any[] = [
  {
    number: "CSPRJ2001", sysId: "sysid-2001", name: "Acme - API Manager Subscription", key: "ACMEAPIM",
    startDate: "2024-01-10 00:00:00", endDate: "2026-01-10 00:00:00", remainingQueryHours: "40h 0m",
    closureState: "Open", accountNumber: "ACCT1001", projectType: "Cloud Support",
  },
  {
    number: "CSPRJ2002", sysId: "sysid-2002", name: "Acme - Identity Server Subscription", key: "ACMEIS",
    startDate: "2024-03-01 00:00:00", endDate: "2026-03-01 00:00:00", remainingQueryHours: "15h 0m",
    closureState: "Open", accountNumber: "ACCT1001", projectType: "Support",
  },
  {
    number: "CSPRJ2003", sysId: "sysid-2003", name: "Globex - Cloud Support", key: "GLBXCLD",
    startDate: "2023-11-01 00:00:00", endDate: "2025-11-01 00:00:00", remainingQueryHours: "5h 0m",
    closureState: "Open", accountNumber: "ACCT1002", projectType: "Cloud Support",
  },
  {
    number: "CSPRJ2004", sysId: "sysid-2004", name: "Initech - Evaluation Subscription", key: "INITEVAL",
    startDate: "2025-06-01 00:00:00", endDate: "2025-12-01 00:00:00", remainingQueryHours: "0h 0m",
    closureState: "Closed", accountNumber: "ACCT1003", projectType: "Cloud Evaluation Support",
  },
];

export const contacts: Record<string, any[]> = {
  CSPRJ2001: [
    { contactName: "Nadia Fernando", email: "nadia@acme.example", state: "active" },
    { contactName: "Omar Batty", email: "omar@acme.example", state: "active" },
  ],
  CSPRJ2002: [{ contactName: "Nadia Fernando", email: "nadia@acme.example", state: "active" }],
  CSPRJ2003: [{ contactName: "Petra Klein", email: "petra@globex.example", state: "active" }],
  CSPRJ2004: [{ contactName: "Sam Waters", email: "sam@initech.example", state: "inactive" }],
};

export const escalations: Record<string, any[]> = {
  ACCT1001: [{ id: "ESC1", severity: "High", state: "Open", escalatedOn: "2025-08-01 09:00:00" }],
  ACCT1002: [],
  ACCT1003: [
    { id: "ESC2", severity: "Critical", state: "Closed", escalatedOn: "2025-05-14 12:30:00" },
    { id: "ESC3", severity: "Medium", state: "Open", escalatedOn: "2025-09-01 08:15:00" },
  ],
};

export const CASE_STATES = [
  "Open", "Work In Progress", "Awaiting Info", "Solution Proposed", "Waiting on WSO2", "Reopened", "Closed",
];

export function projectFor(number: string) {
  return projects.find((p) => p.number === number);
}
export function accountFor(number: string) {
  return accounts.find((a) => a.number === number);
}

export const cases: any[] = [];
(function seedCases() {
  const seeds = [
    { project: "CSPRJ2001", type: "Incident", state: "Open", priority: "High", desc: "Gateway returns 502 intermittently under load" },
    { project: "CSPRJ2001", type: "Query", state: "Work In Progress", priority: "Medium", desc: "How to configure rate limiting per API" },
    { project: "CSPRJ2001", type: "Engagement", state: "Waiting on WSO2", priority: "Low", desc: "Quarterly architecture review" },
    { project: "CSPRJ2002", type: "Incident", state: "Awaiting Info", priority: "Critical", desc: "SSO login failing for federated users" },
    { project: "CSPRJ2002", type: "Query", state: "Closed", priority: "Low", desc: "Clarify password policy configuration" },
    { project: "CSPRJ2003", type: "Incident", state: "Solution Proposed", priority: "High", desc: "Cloud instance unreachable after upgrade" },
    { project: "CSPRJ2003", type: "Query", state: "Reopened", priority: "Medium", desc: "Billing discrepancy on last invoice" },
    { project: "CSPRJ2004", type: "Query", state: "Open", priority: "Medium", desc: "Evaluation extension request" },
  ];
  seeds.forEach((s, idx) => {
    const proj = projectFor(s.project);
    const acc = accountFor(proj.accountNumber);
    const number = `CS${9000000 + idx}`;
    cases.push({
      caseId: `TEST-${100 + idx}`,
      caseType: s.type,
      number,
      openedAt: "2025-0" + (1 + (idx % 9)) + "-10 10:00:00",
      openedBy: "customer@" + acc.name.toLowerCase().replace(/[^a-z]/g, "") + ".example",
      priority: s.priority,
      shortDescription: s.desc,
      state: s.state,
      description: s.desc + ". Reported via the customer portal.",
      assignedTo: "support.engineer@wso2.com",
      accountNumber: acc.number,
      accountName: acc.name,
      projectNumber: proj.number,
      projectKey: proj.key,
      productName: proj.key.includes("APIM") ? "WSO2 API Manager" : proj.key.includes("IS") ? "WSO2 Identity Server" : "WSO2 Product",
      lastWSO2CommentTime: "2025-09-01 09:00:00",
      lastCustomerCommentTime: "2025-08-30 15:00:00",
      projectDeploymentName: proj.name + " - Prod",
      projectDeploymentType: "Production",
    });
  });
})();

export const attachmentsByCase: Record<string, any[]> = {};
cases.forEach((c, idx) => {
  attachmentsByCase[c.number] =
    idx % 3 === 0
      ? []
      : [
          {
            sysId: `att-${c.number}-1`, fileName: "server.log", createdOn: "2025-08-30 12:00:00", createdBy: c.openedBy,
            updatedOn: "2025-08-30 12:00:00", updatedBy: c.openedBy, contentType: "text/plain", state: "available",
          },
          {
            sysId: `att-${c.number}-2`, fileName: "screenshot.png", createdOn: "2025-08-30 12:05:00", createdBy: c.openedBy,
            updatedOn: "2025-08-30 12:05:00", updatedBy: c.openedBy, contentType: "image/png", state: "available",
          },
        ];
});

export const commentsByCase: Record<string, any[]> = {};
cases.forEach((c) => {
  commentsByCase[c.number] = [
    { createdOn: "2025-08-30 15:00:00", caseType: c.caseType, type: "comments", value: `<p>Hi team, ${c.shortDescription}. Please advise.</p>`, createdBy: c.openedBy },
    { createdOn: "2025-09-01 09:00:00", caseType: c.caseType, type: "work_notes", value: "<p>Investigating with engineering. Will update shortly.</p>", createdBy: "support.engineer@wso2.com" },
  ];
});

// --- Customer Health (risk tracking) state ---

export const projectRiskProfile: Record<string, any> = {
  "sysid-2001": { hasRecentCases: true, hasAbandonedCases: false, isUsingEolProduct: false, hasMigrationDelays: false, hasEscalatedCases: true, goLive: { status: "Live", isRisk: false } },
  "sysid-2002": { hasRecentCases: false, hasAbandonedCases: false, isUsingEolProduct: true, hasMigrationDelays: false, hasEscalatedCases: false, goLive: { status: "Live", isRisk: false } },
  "sysid-2003": { hasRecentCases: true, hasAbandonedCases: true, isUsingEolProduct: false, hasMigrationDelays: true, hasEscalatedCases: false, goLive: { status: "Delayed", isRisk: true } },
  "sysid-2004": { hasRecentCases: false, hasAbandonedCases: false, isUsingEolProduct: false, hasMigrationDelays: false, hasEscalatedCases: false, goLive: { status: "Not started", isRisk: true } },
};

export const healthStatusByProject = new Map<string, any>(); // projectSysId -> HealthStatusRecord
export const risks: any[] = [];
export const actionItems: any[] = [];
export const actionItemComments: any[] = [];

export function getHealthStatus(projectSysId: string, accountSysId: string) {
  if (!healthStatusByProject.has(projectSysId)) {
    healthStatusByProject.set(projectSysId, {
      id: genId(), projectSysId, accountSysId, status: "to_be_reviewed", reviewedByEmail: null, reviewedOn: null,
    });
  }
  return healthStatusByProject.get(projectSysId);
}

export function openRiskFor(projectSysId: string) {
  return risks.find((r) => r.projectSysId === projectSysId && r.status === "open" && r.openedComment !== "Marked as healthy") || null;
}

export function actionItemsForRisk(riskId: number) {
  return actionItems.filter((i) => i.riskId === riskId);
}

export { genId };
