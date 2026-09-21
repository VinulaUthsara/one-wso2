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

// Ported from SupportPortalLite's src/data/utils/types.ts, trimmed to the
// shapes the projects domain uses — scoped locally, see the note in
// components/DefaultTable.tsx. Loosely typed to match the mock/real backend
// response, which carries a few fields (accountName, accountNumber,
// totalQueryHours, projectType) beyond the source's own declared
// ProjectDetails interface — same looseness the source app has via its
// DataStruct index signature.
export interface ProjectDetails {
  number: string;
  sysId: string;
  name: string;
  key: string;
  startDate: string;
  endDate: string;
  remainingQueryHours: string;
  closureState: string;
  accountNumber?: string;
  accountName?: string;
  totalQueryHours?: string;
  projectType?: string;
  [key: string]: unknown;
}

export interface Contact {
  contactName: string;
  email: string;
  state: string;
  [key: string]: unknown;
}

export interface CaseDetails {
  number: string;
  caseId: string;
  caseType: string;
  shortDescription: string;
  priority: string;
  state: string;
  [key: string]: unknown;
}
