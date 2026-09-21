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

// TEMPORARY dev-only fixture, standing in for the real CSM Portal backend
// while ONE_WSO2_CSM_BACKEND_URL is unset (see isCsmBackendConfigured — this
// is v1, built UI-first with no backend stood up yet). Every hook in this
// feature branches on that flag: configured → real authed* calls against
// csmServiceUrls; unconfigured → the in-memory store below.
//
// REMOVE THIS FILE (and the branches that call into it) once a real backend
// URL is configured — nothing else needs to change, since the branch lives
// entirely inside the hooks, not the pages.
//
// Mutations here actually mutate the module-level arrays, so a create →
// appears in the list → open → comment → see it loop works end-to-end for
// manual testing today, the same as it would against a live backend.

import type {
  CaseAuditEntry,
  CaseEscalationHistory,
  CaseEscalationRecord,
  CaseTag,
  CsmCaseComment,
  CsmCaseDetail,
  CsmMe,
} from "./csmCaseTypes";
import { caseNextStates, commentGateReason, isEligibleForRelatedCase, isSameCsmUser } from "./csmCaseTypes";

// The fixed "signed-in CS engineer" identity for this mock — matches the
// assignedEngineer on CS-1002 below, so opening that case demonstrates the
// comment/de-escalation gates UNLOCKED, and every other case demonstrates
// them LOCKED (a different assignee/no current escalation).
export const MOCK_ME: CsmMe = { id: "user-100", name: "Dinali Perera", email: "dinalip@wso2.com" };

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

let cases: CsmCaseDetail[] = [
  {
    id: "case-1001",
    caseNumber: "CS-1001",
    subject: "API gateway returning intermittent 502s under load",
    customer: "Acme Bank",
    accountId: "acc-acme",
    projectId: "proj-acme-apim",
    projectName: "Acme API Platform",
    product: "WSO2 API Manager",
    severity: "critical",
    state: "work_in_progress",
    caseType: "case",
    issueType: "Performance",
    workState: "ongoing",
    assignee: "Dinali Perera",
    assigneeName: "Dinali Perera",
    assigneeEmail: "dinalip@wso2.com",
    assignedEngineer: { id: "user-100", name: "Dinali Perera", email: "dinalip@wso2.com" },
    assigneeIsMe: true,
    createdBy: "Nadeesha Silva",
    createdByEmail: "nadeesha@acmebank.com",
    slaClockType: "response",
    minutesToBreach: 42,
    hasSla: false,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
    escalationLevel: "1",
    description:
      "Customer reports intermittent 502s from the gateway during peak traffic (~14:00-15:00 daily). Suspect connection pool exhaustion on the backend cluster.",
    assignmentGroup: "APIM L2",
    customerContext: {
      accountName: "Acme Bank",
      tier: "Platinum",
      region: "APAC",
      primaryContact: "Nadeesha Silva",
      primaryContactEmail: "nadeesha@acmebank.com",
      accountManager: "Ruwan Fernando",
      technicalOwner: "Dinali Perera",
      openCases: 2,
      creTeam: "CRE-APAC-1",
      sreTeam: "SRE-Platform",
    },
    productContext: {
      product: "WSO2 API Manager",
      version: "4.3.0",
      updateLevel: "U3",
      deployment: "Acme Prod Cluster",
      deploymentCategory: "Production",
      environment: "Production",
      region: "ap-south-1",
    },
    tags: [{ id: uid("tag"), label: "gateway", color: "primary" }, { id: uid("tag"), label: "performance", color: "warning" }],
    audit: [
      { id: uid("audit"), kind: "created", createdAt: daysAgo(2), actorName: "Nadeesha Silva", summary: "Case created" },
      {
        id: uid("audit"),
        kind: "state_change",
        createdAt: daysAgo(2),
        actorName: "Dinali Perera",
        summary: "State changed from open to work_in_progress",
        changes: [{ field: "state", from: "open", to: "work_in_progress" }],
      },
      { id: uid("audit"), kind: "escalated", createdAt: daysAgo(1), actorName: "Dinali Perera", summary: "Escalated to level 1" },
    ],
    isWatching: true,
  },
  {
    id: "case-1002",
    caseNumber: "CS-1002",
    subject: "Request: increase rate-limit tier for partner integration",
    customer: "Northwind Retail",
    accountId: "acc-northwind",
    projectId: "proj-northwind",
    projectName: "Northwind Commerce",
    product: "WSO2 API Manager",
    severity: "medium",
    state: "awaiting_info",
    caseType: "case",
    issueType: "Configuration",
    assignee: "Kasun Jayasuriya",
    assigneeName: "Kasun Jayasuriya",
    assigneeEmail: "kasunj@wso2.com",
    assignedEngineer: { id: "user-200", name: "Kasun Jayasuriya", email: "kasunj@wso2.com" },
    assigneeIsMe: false,
    createdBy: "Priya Menon",
    createdByEmail: "priya@northwind.example",
    slaClockType: "resolution",
    minutesToBreach: 1180,
    hasSla: false,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(3),
    escalationLevel: null,
    description: "Customer wants their partner integration key moved to the Gold rate-limit tier ahead of a Q3 campaign.",
    assignmentGroup: "APIM L1",
    customerContext: {
      accountName: "Northwind Retail",
      tier: "Gold",
      region: "EMEA",
      primaryContact: "Priya Menon",
      primaryContactEmail: "priya@northwind.example",
      accountManager: "Sarah Cole",
      openCases: 1,
    },
    productContext: { product: "WSO2 API Manager", version: "4.2.0", deployment: "Northwind Prod", environment: "Production" },
    tags: [{ id: uid("tag"), label: "rate-limit", color: "info" }],
    audit: [
      { id: uid("audit"), kind: "created", createdAt: daysAgo(5), actorName: "Priya Menon", summary: "Case created" },
      { id: uid("audit"), kind: "assignee_change", createdAt: daysAgo(4), actorName: "System", summary: "Assigned to Kasun Jayasuriya" },
    ],
    isWatching: false,
  },
  {
    id: "case-1003",
    caseNumber: "CS-1003",
    subject: "Upgrade guidance for Identity Server 6.1 → 7.0",
    customer: "Meridian Health",
    accountId: "acc-meridian",
    projectId: "proj-meridian-is",
    projectName: "Meridian Identity",
    product: "WSO2 Identity Server",
    severity: "low",
    state: "open",
    caseType: "case",
    issueType: "How-to",
    assignee: "Unassigned",
    createdBy: "Aisha Khan",
    createdByEmail: "aisha@meridianhealth.example",
    slaClockType: "response",
    minutesToBreach: 2600,
    hasSla: false,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
    escalationLevel: null,
    description: "Customer is planning an IS 6.1 to 7.0 upgrade and wants a reviewed migration plan before scheduling downtime.",
    tags: [],
    audit: [{ id: uid("audit"), kind: "created", createdAt: daysAgo(1), actorName: "Aisha Khan", summary: "Case created" }],
    isWatching: false,
  },
  {
    id: "case-1004",
    caseNumber: "CS-1004",
    subject: "[Announcement] Scheduled maintenance window — Choreo control plane",
    customer: "All customers",
    product: "Choreo",
    severity: "unset",
    state: "work_in_progress",
    caseType: "announcement",
    createdBy: "WSO2 CS Team",
    slaClockType: "none",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
    escalationLevel: null,
    description: "Choreo control plane maintenance scheduled for this weekend — no expected customer impact.",
    tags: [{ id: uid("tag"), label: "maintenance", color: "default" }],
    audit: [{ id: uid("audit"), kind: "created", createdAt: daysAgo(3), actorName: "WSO2 CS Team", summary: "Announcement published" }],
    isWatching: false,
  },
  {
    id: "case-1005",
    caseNumber: "CS-1005",
    subject: "Data export job failing with OOM on large tenant",
    customer: "Falcon Logistics",
    accountId: "acc-falcon",
    projectId: "proj-falcon",
    product: "WSO2 Micro Integrator",
    severity: "high",
    state: "closed",
    caseType: "case",
    issueType: "Defect",
    assignee: "Dinali Perera",
    assigneeName: "Dinali Perera",
    assigneeEmail: "dinalip@wso2.com",
    assignedEngineer: { id: "user-100", name: "Dinali Perera", email: "dinalip@wso2.com" },
    assigneeIsMe: true,
    createdBy: "Tom Reyes",
    createdByEmail: "tom@falconlogistics.example",
    slaClockType: "resolution",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(10),
    closedOn: daysAgo(10),
    escalationLevel: "0",
    description: "Nightly export job OOM'd on the largest tenant's dataset. Root cause: unbounded in-memory buffering.",
    resolution: {
      resolutionCode: "fixed",
      cause: "Unbounded in-memory buffering during CSV serialization.",
      notes: "Patched to stream rows instead of buffering. Verified on a full-size dataset in staging.",
    },
    tags: [{ id: uid("tag"), label: "defect", color: "error" }],
    audit: [
      { id: uid("audit"), kind: "created", createdAt: daysAgo(20), actorName: "Tom Reyes", summary: "Case created" },
      {
        id: uid("audit"),
        kind: "state_change",
        createdAt: daysAgo(10),
        actorName: "Dinali Perera",
        summary: "State changed from solution_proposed to closed",
        changes: [{ field: "state", from: "solution_proposed", to: "closed" }],
      },
    ],
    isWatching: false,
  },
  {
    id: "case-1006",
    caseNumber: "CS-1006",
    subject: "Old billing dispute — resolved months ago",
    customer: "Acme Bank",
    accountId: "acc-acme",
    product: "WSO2 API Manager",
    severity: "low",
    state: "closed",
    caseType: "case",
    issueType: "Billing",
    createdBy: "Nadeesha Silva",
    slaClockType: "none",
    createdAt: daysAgo(200),
    updatedAt: daysAgo(190),
    closedOn: daysAgo(190),
    escalationLevel: null,
    description: "Disputed invoice line item, resolved by finance in a prior quarter.",
    tags: [],
    audit: [{ id: uid("audit"), kind: "created", createdAt: daysAgo(200), actorName: "Nadeesha Silva", summary: "Case created" }],
    isWatching: false,
  },
];

const commentsByCaseId = new Map<string, CsmCaseComment[]>([
  [
    "case-1001",
    [
      {
        id: uid("cmt"),
        caseId: "case-1001",
        authorName: "Nadeesha Silva",
        authorEmail: "nadeesha@acmebank.com",
        authorRole: "customer",
        bodyHtml: "<p>Seeing this again this afternoon, same time window. Attaching gateway logs shortly.</p>",
        createdAt: daysAgo(1),
      },
      {
        id: uid("cmt"),
        caseId: "case-1001",
        authorName: "Dinali Perera",
        authorEmail: "dinalip@wso2.com",
        authorRole: "wso2_engineer",
        bodyHtml: "<p>Thanks — checking the backend connection pool metrics for that window now.</p>",
        createdAt: daysAgo(1),
        internal: false,
      },
      {
        id: uid("cmt"),
        caseId: "case-1001",
        authorName: "Dinali Perera",
        authorEmail: "dinalip@wso2.com",
        authorRole: "wso2_engineer",
        bodyHtml: "<p>Backend pool maxed out at 14:03 — recommending a pool size increase, testing in staging.</p>",
        createdAt: daysAgo(0),
        internal: true,
        type: "work_note",
      },
    ],
  ],
]);

const escalationsByCaseId = new Map<string, CaseEscalationHistory>([
  [
    "case-1001",
    {
      escalations: [
        {
          id: uid("esc"),
          currentLevel: "1",
          previousLevel: "0",
          createdBy: "Dinali Perera",
          createdOn: daysAgo(1),
          reason: "Repeated customer-facing 502s, no fix deployed yet.",
        },
      ],
      currentNotifiedUsers: [{ id: "user-100", name: "Dinali Perera", email: "dinalip@wso2.com" }],
    },
  ],
]);

function withNextStates(c: CsmCaseDetail): CsmCaseDetail {
  const nextStates = [...caseNextStates(c.state)];
  if (isEligibleForRelatedCase(c)) nextStates.push("reopened");
  return { ...c, nextStates };
}

export async function mockGetMe(): Promise<CsmMe> {
  return delay(MOCK_ME);
}

export interface CsmCaseSearchFilters {
  state?: string;
  severity?: string;
  assignedToMe?: boolean;
  query?: string;
}

export async function mockSearchCases(
  filters: CsmCaseSearchFilters,
): Promise<{ cases: CsmCaseDetail[]; total: number }> {
  let rows = cases.map(withNextStates);
  if (filters.state) rows = rows.filter((c) => c.state === filters.state);
  if (filters.severity) rows = rows.filter((c) => c.severity === filters.severity);
  if (filters.assignedToMe) rows = rows.filter((c) => c.assigneeIsMe);
  if (filters.query) {
    const q = filters.query.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.subject.toLowerCase().includes(q) ||
        c.customer.toLowerCase().includes(q) ||
        (c.caseNumber ?? "").toLowerCase().includes(q),
    );
  }
  rows = rows.sort((a, b) => (a.updatedAt ?? a.createdAt) < (b.updatedAt ?? b.createdAt) ? 1 : -1);
  return delay({ cases: rows, total: rows.length });
}

export async function mockGetCase(id: string): Promise<CsmCaseDetail | undefined> {
  const found = cases.find((c) => c.id === id);
  return delay(found ? withNextStates(found) : undefined);
}

export async function mockCreateCase(payload: {
  subject: string;
  description?: string;
  severity: string;
  issueType?: string;
  product?: string;
  relatedCaseId?: string;
}): Promise<CsmCaseDetail> {
  const nextNum = 1000 + cases.length + 1;
  const created: CsmCaseDetail = {
    id: uid("case"),
    caseNumber: `CS-${nextNum}`,
    subject: payload.subject,
    description: payload.description,
    customer: "Acme Bank",
    product: payload.product,
    severity: payload.severity,
    state: "open",
    caseType: "case",
    issueType: payload.issueType,
    createdBy: MOCK_ME.name,
    createdByEmail: MOCK_ME.email,
    slaClockType: "response",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    escalationLevel: null,
    tags: [],
    audit: [
      {
        id: uid("audit"),
        kind: "created",
        createdAt: new Date().toISOString(),
        actorName: MOCK_ME.name,
        summary: payload.relatedCaseId ? `Case created (related to ${payload.relatedCaseId})` : "Case created",
      },
    ],
    isWatching: true,
    relatedCase: payload.relatedCaseId
      ? { id: payload.relatedCaseId, caseNumber: cases.find((c) => c.id === payload.relatedCaseId)?.caseNumber }
      : undefined,
  };
  cases = [created, ...cases];
  return delay(withNextStates(created));
}

export async function mockPatchCase(
  id: string,
  patch: { state?: CsmCaseDetail["state"]; workState?: CsmCaseDetail["workState"] },
): Promise<CsmCaseDetail> {
  const idx = cases.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Case not found.");
  const current = cases[idx];

  if (patch.state && !caseNextStates(current.state).includes(patch.state)) {
    throw new Error(`Cannot move a case from "${current.state}" to "${patch.state}".`);
  }
  if (patch.workState && current.state !== "work_in_progress") {
    throw new Error("workState may only be set while the case is work_in_progress.");
  }

  const updated: CsmCaseDetail = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    closedOn: patch.state === "closed" ? new Date().toISOString() : current.closedOn,
    audit: [
      ...current.audit,
      {
        id: uid("audit"),
        kind: "state_change",
        createdAt: new Date().toISOString(),
        actorName: MOCK_ME.name,
        summary: patch.state
          ? `State changed from ${current.state} to ${patch.state}`
          : `Work state changed to ${patch.workState}`,
        changes: patch.state ? [{ field: "state", from: current.state, to: patch.state }] : undefined,
      },
    ],
  };
  cases = [...cases.slice(0, idx), updated, ...cases.slice(idx + 1)];
  return delay(withNextStates(updated));
}

export async function mockListComments(caseId: string): Promise<CsmCaseComment[]> {
  return delay([...(commentsByCaseId.get(caseId) ?? [])]);
}

/**
 * Mirrors the backend's comment gate (cases.go CreateCaseComment) closely
 * enough for UI testing: non-work_note comments need
 * state===work_in_progress && workState==="ongoing" AND the caller be the
 * assignedEngineer; announcement-type cases skip both, only blocking when
 * closed; work_note is exempt from the ownership/ongoing gate but still
 * blocked on a closed case. This is a UI affordance only — the real backend
 * is the actual authority once one is configured.
 */
export async function mockPostComment(
  caseId: string,
  body: { type?: "work_note" | "comment"; content: string },
): Promise<CsmCaseComment> {
  const c = cases.find((x) => x.id === caseId);
  if (!c) throw new Error("Case not found.");

  const blocked = commentGateReason(c, MOCK_ME, body.type);
  if (blocked) throw new Error(blocked);

  const comment: CsmCaseComment = {
    id: uid("cmt"),
    caseId,
    authorName: MOCK_ME.name ?? "Me",
    authorEmail: MOCK_ME.email,
    authorRole: "wso2_engineer",
    bodyHtml: `<p>${body.content}</p>`,
    createdAt: new Date().toISOString(),
    internal: body.type === "work_note",
    type: body.type ?? "comment",
  };
  commentsByCaseId.set(caseId, [...(commentsByCaseId.get(caseId) ?? []), comment]);

  const idx = cases.findIndex((x) => x.id === caseId);
  cases[idx] = {
    ...c,
    audit: [
      ...c.audit,
      {
        id: uid("audit"),
        kind: "comment_added",
        createdAt: comment.createdAt,
        actorName: comment.authorName,
        summary: body.type === "work_note" ? "Work note added" : "Comment added",
      },
    ],
  };

  return delay(comment);
}

export async function mockListActivities(caseId: string): Promise<CaseAuditEntry[]> {
  const c = cases.find((x) => x.id === caseId);
  return delay(c ? [...c.audit] : []);
}

export async function mockAddTag(caseId: string, label: string): Promise<CaseTag> {
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) throw new Error("Case not found.");
  const tag: CaseTag = { id: uid("tag"), label, color: "default" };
  cases[idx] = { ...cases[idx], tags: [...cases[idx].tags, tag] };
  return delay(tag);
}

export async function mockRemoveTag(caseId: string, tagId: string): Promise<void> {
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) throw new Error("Case not found.");
  cases[idx] = { ...cases[idx], tags: cases[idx].tags.filter((t) => t.id !== tagId) };
  return delay(undefined);
}

export async function mockGetEscalations(caseId: string): Promise<CaseEscalationHistory> {
  return delay(escalationsByCaseId.get(caseId) ?? { escalations: [], currentNotifiedUsers: [] });
}

export async function mockEscalate(
  caseId: string,
  body: { action?: "ESCALATE" | "DEESCALATE"; reason?: string },
): Promise<CaseEscalationRecord> {
  const idx = cases.findIndex((c) => c.id === caseId);
  if (idx === -1) throw new Error("Case not found.");
  const c = cases[idx];
  const action = body.action ?? "ESCALATE";

  if (action !== "DEESCALATE" && !body.reason?.trim()) {
    throw new Error("A reason is required to escalate.");
  }
  const history = escalationsByCaseId.get(caseId) ?? { escalations: [], currentNotifiedUsers: [] };
  if (action === "DEESCALATE" && !history.currentNotifiedUsers.some((u) => isSameCsmUser(MOCK_ME, u))) {
    throw new Error("Only someone notified on the current escalation may de-escalate it.");
  }

  const previousLevel = c.escalationLevel ?? "0";
  const currentLevel =
    action === "ESCALATE" ? String(Math.min(5, Number(previousLevel) + 1)) : String(Math.max(0, Number(previousLevel) - 1));

  const record: CaseEscalationRecord = {
    id: uid("esc"),
    currentLevel,
    previousLevel,
    createdBy: MOCK_ME.name ?? "Me",
    createdOn: new Date().toISOString(),
    reason: body.reason,
  };

  escalationsByCaseId.set(caseId, {
    escalations: [record, ...history.escalations],
    currentNotifiedUsers: action === "ESCALATE" ? [{ id: MOCK_ME.id, name: MOCK_ME.name, email: MOCK_ME.email }] : [],
  });

  cases[idx] = {
    ...c,
    escalationLevel: currentLevel === "0" ? null : currentLevel,
    audit: [
      ...c.audit,
      {
        id: uid("audit"),
        kind: "escalated",
        createdAt: record.createdOn,
        actorName: record.createdBy,
        summary: action === "ESCALATE" ? `Escalated to level ${currentLevel}` : `De-escalated to level ${currentLevel}`,
      },
    ],
  };

  return delay(record);
}
