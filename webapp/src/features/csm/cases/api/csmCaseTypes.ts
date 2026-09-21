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

// Wire types + the case state machine for the CSM Portal's Cases domain
// (apps/csm-portal/backend/internal/handler/cases.go). Field lists are ported
// from the source webapp's own `types/csmCases.ts` (CsmCaseRow/CsmCaseDetail);
// fields this first slice has no tab for yet are still typed here (loosely,
// where their exact shape wasn't confirmed) so a later slice can add its tab
// without a type-file rewrite.

// ---- state machine ----------------------------------------------------------
//
// Mirrors the backend's own table exactly (state.go). `closed` is terminal.
// `reopened` is NOT a state any case is ever PATCHed into — see
// `caseNextStates` below for what it actually means.
export type CaseState =
  | "open"
  | "work_in_progress"
  | "waiting_on_wso2"
  | "awaiting_info"
  | "solution_proposed"
  | "closed"
  | "reopened";

export type WorkState = "ongoing" | "paused";

export const CASE_TRANSITIONS: Record<CaseState, CaseState[]> = {
  open: ["work_in_progress"],
  work_in_progress: ["waiting_on_wso2", "awaiting_info", "solution_proposed", "closed"],
  waiting_on_wso2: ["work_in_progress"],
  awaiting_info: ["waiting_on_wso2"],
  solution_proposed: ["closed", "waiting_on_wso2"],
  closed: [],
  reopened: ["work_in_progress"],
};

export const CASE_STATE_LABEL: Record<CaseState, string> = {
  open: "Open",
  work_in_progress: "Work in progress",
  waiting_on_wso2: "Waiting on WSO2",
  awaiting_info: "Awaiting info",
  solution_proposed: "Solution proposed",
  closed: "Closed",
  reopened: "Reopened",
};

/**
 * A case still eligible for the backend's "reopen" convention: closed within
 * the last 60 days, and of type "case" specifically (not an engagement,
 * service request, etc. — see caseTypeAnnouncement and its siblings).
 *
 * The backend injects `nextStates: ["reopened"]` for exactly this case, but
 * "reopened" is never a real PATCH target — the frontend's job is to offer
 * "Create related case" instead (a fresh case with `relatedCaseId` set),
 * never `PATCH state=reopened`. Building a literal reopen button here would
 * be a functional bug, not a simplification.
 */
export function isEligibleForRelatedCase(c: Pick<CsmCaseDetail, "state" | "caseType" | "closedOn" | "updatedAt">): boolean {
  if (c.state !== "closed") return false;
  if (c.caseType && c.caseType !== "case") return false;
  const closedOn = c.closedOn ?? c.updatedAt;
  if (!closedOn) return false;
  const days = (Date.now() - new Date(closedOn).getTime()) / (1000 * 60 * 60 * 24);
  return days <= 60;
}

/** The state-transition part of `nextStates` — excludes the "reopened" convention, which `isEligibleForRelatedCase` covers separately. */
export function caseNextStates(state: CaseState): CaseState[] {
  return CASE_TRANSITIONS[state];
}

// ---- tags ---------------------------------------------------------------

export type CaseTagColor = "default" | "primary" | "warning" | "info" | "success" | "error";

export interface CaseTag {
  id: string;
  label: string;
  color?: CaseTagColor;
}

// ---- comments -------------------------------------------------------------

export type CommentAuthorRole = "customer" | "wso2_engineer" | "system" | "chatbot";

export interface CsmCaseComment {
  id: string;
  caseId: string;
  authorName: string;
  authorEmail?: string;
  authorUser?: { id?: string; email?: string; name?: string };
  authorRole: CommentAuthorRole;
  bodyHtml: string;
  createdAt: string;
  /** Work note (internal-only) vs a public, customer-visible comment. */
  internal?: boolean;
  type?: "work_note" | "comment" | "announcement";
  /** Client-echoed description on create, pending the server round-trip. */
  synthetic?: boolean;
}

// ---- activity / audit ------------------------------------------------------

export type CaseAuditKind =
  | "state_change"
  | "assignee_change"
  | "severity_change"
  | "linked"
  | "escalated"
  | "watcher_added"
  | "comment_added"
  | "attachment_added"
  | "sla_breached"
  | "created"
  | "field_change";

export interface CaseAuditFieldChange {
  field: string;
  from?: string;
  to?: string;
}

export interface CaseAuditEntry {
  id: string;
  kind: CaseAuditKind;
  createdAt: string;
  actorName?: string;
  actorEmail?: string;
  summary: string;
  changes?: CaseAuditFieldChange[];
}

// ---- escalations ------------------------------------------------------------

export type EscalationAction = "ESCALATE" | "DEESCALATE";

export interface CaseEscalationRecord {
  id: string;
  currentLevel: string;
  previousLevel: string;
  createdBy: string;
  createdOn: string;
  reason?: string;
}

export interface CaseEscalationNotifiedUser {
  id?: string;
  name?: string;
  email?: string;
}

export interface CaseEscalationHistory {
  escalations: CaseEscalationRecord[];
  currentNotifiedUsers: CaseEscalationNotifiedUser[];
}

// ---- case rows / detail -----------------------------------------------------

export interface CsmCaseRow {
  id: string;
  caseNumber?: string;
  wso2CaseId?: string;
  subject: string;
  customer: string;
  accountId?: string;
  projectId?: string;
  projectName?: string;
  product?: string;
  /** Known values seen in the source app: critical/high/medium/low; kept as a
   * plain string since the full enum wasn't confirmed against the backend. */
  severity: string;
  state: CaseState;
  caseType?: string;
  issueType?: string;
  /** Compared case-insensitively wherever it gates behavior (see RequestCaseUpdate). */
  engagementType?: string;
  workState?: WorkState;
  assignee?: string;
  assigneeIsMe?: boolean;
  createdBy?: string;
  slaClockType?: string;
  minutesToBreach?: number;
  /** No SLA data is live yet anywhere in this port — render "—" rather than trusting this. */
  hasSla?: boolean;
  createdAt: string;
  updatedAt?: string;
  /** Raw string "0"–"5"; null/absent = unescalated or unavailable. */
  escalationLevel?: string | null;
}

export interface CsmCustomerContext {
  accountName?: string;
  tier?: string;
  region?: string;
  primaryContact?: string;
  primaryContactEmail?: string;
  accountManager?: string;
  technicalOwner?: string;
  openCases?: number;
  creTeam?: string;
  sreTeam?: string;
}

export interface CsmProductContext {
  product?: string;
  version?: string;
  updateLevel?: string;
  deployment?: string;
  deploymentId?: string;
  deployedProductId?: string;
  deploymentCategory?: string;
  environment?: string;
  region?: string;
}

export interface CsmCaseDetail extends CsmCaseRow {
  description?: string;
  assignmentGroup?: string;
  acknowledgedBy?: { name?: string; email?: string };
  workaroundProvidedOn?: string;
  workaroundProvidedBy?: string;
  /** Origin conversation, when this case came from the Novera AI chat (Customer Portal side). */
  conversationId?: string;
  /** Server-computed valid next states, PLUS the "reopened" convention — see isEligibleForRelatedCase. */
  nextStates?: CaseState[];
  relatedCase?: { id: string; caseNumber?: string };
  parentCase?: { id: string; caseNumber?: string; type?: string };
  closedOn?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  /** The platform user record backing `assignee`/`assigneeName` — this, not
   * those display fields, is what the comment-ownership gate compares
   * against the caller's own id (see isSameCsmUser). */
  assignedEngineer?: { id?: string; name?: string; email?: string };
  createdByEmail?: string;
  customerContext?: CsmCustomerContext;
  productContext?: CsmProductContext;
  tags: CaseTag[];
  audit: CaseAuditEntry[];
  isWatching?: boolean;
  resolution?: { resolutionCode?: string; cause?: string; notes?: string };

  // Not yet surfaced by this slice's UI — typed loosely so a later slice
  // (Attachments/Call requests/SLA/Time tracking/Linked items/Watchers) can
  // add its tab without touching this file's shape again.
  linkedServiceRequests?: unknown[];
  linkedChangeRequests?: unknown[];
  catalog?: unknown;
  catalogItem?: unknown;
  requestVariables?: { name: string; value: string }[];
  autoclosureStep?: unknown;
  autoclosureStateTime?: string;
  bestCaseFixEta?: string;
  mostLikelyFixEta?: string;
  worstCaseFixEta?: string;
  watchers?: unknown[];
  linkedItems?: unknown[];
  timeLogs?: unknown[];
  attachments?: unknown[];
  autocloseHoldUntil?: string;
}

// ---- caller identity (GET /users/me) ---------------------------------------

/**
 * The caller's own platform user record. Never compare a case's
 * assignedEngineer/notified-user id against a raw JWT claim — always resolve
 * "is this me" through this, id-match first, email as a fallback (mirrors the
 * backend's own resolveCurrentUserID / callerIsNotifiedOnCurrentEscalation).
 */
export interface CsmMe {
  id: string;
  email?: string;
  name?: string;
}

/**
 * Whether a comment of this kind may be posted right now, and why not if it
 * can't — mirrors the backend's own CreateCaseComment guard (cases.go):
 * work_note is exempt from the ongoing/ownership gate but still blocked on a
 * closed case; announcement-type cases only block when closed; every other
 * case needs state===work_in_progress && workState==="ongoing" AND the
 * caller be the assignedEngineer. Shared by the mock backend (as a real
 * validation) and the detail page (as a UI affordance — disable the composer
 * and say why) so the two can't drift apart.
 */
export function commentGateReason(
  c: Pick<CsmCaseDetail, "state" | "workState" | "caseType" | "assignedEngineer">,
  me: CsmMe | undefined,
  type: "work_note" | "comment" | undefined,
): string | null {
  if (type === "work_note") {
    return c.state === "closed" ? "Work notes can't be added to a closed case." : null;
  }
  if (c.caseType === "announcement") {
    return c.state === "closed" ? "Comments can't be added to a closed case." : null;
  }
  if (c.state !== "work_in_progress" || c.workState !== "ongoing") {
    return "Comments are only allowed while the case is work in progress and ongoing.";
  }
  if (!isSameCsmUser(me, c.assignedEngineer)) {
    return "Only the case's assigned engineer may comment while it's in progress.";
  }
  return null;
}

export function isSameCsmUser(
  me: CsmMe | undefined,
  other: { id?: string | null; email?: string | null } | undefined | null,
): boolean {
  if (!me || !other) return false;
  if (me.id && other.id && me.id === other.id) return true;
  if ((!me.id || !other.id) && me.email && other.email) {
    return me.email.toLowerCase() === other.email.toLowerCase();
  }
  return false;
}
