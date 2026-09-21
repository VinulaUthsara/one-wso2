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

// Ported from the source app's data/utils/types.ts — case-domain slice only.
export interface DataStruct {
  [key: string]: unknown;
}

export interface CaseDetails extends DataStruct {
  caseId: string;
  caseType: string;
  number: string;
  openedAt: string;
  openedBy: string;
  priority: string;
  shortDescription: string;
  state: string;
  description: string;
  assignedTo: string;
  accountNumber: string;
  accountName: string;
  projectNumber: string;
  projectKey: string;
  productName: string;
  lastWSO2CommentTime: string;
  lastCustomerCommentTime: string;
  projectDeploymentName: string;
  projectDeploymentType: string;
}

export interface CaseDetailsWithCount extends DataStruct {
  count: number;
  cases: CaseDetails[];
}

export interface CaseCommentDetails extends DataStruct {
  createdOn: string;
  caseType: string;
  type: "comments" | "work_notes";
  value: string;
  createdBy: string;
}

// Source reused caseCommentDetails for the attachments-info response too,
// which is a different shape — given its own type here instead.
export interface AttachmentDetails extends DataStruct {
  sysId: string;
  fileName: string;
  createdOn: string;
  createdBy: string;
  updatedOn: string;
  updatedBy: string;
  contentType: string;
  state: string;
}

export interface ProjectSummary extends DataStruct {
  number: string;
  name: string;
}

export interface AccountSummary extends DataStruct {
  number: string;
  name: string;
}

export type SearchResult = CaseDetailsWithCount | ProjectSummary[] | AccountSummary[];

export const CASE_CLOSED_STATE = "Closed";
