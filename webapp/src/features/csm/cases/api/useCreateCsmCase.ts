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

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockCreateCase } from "./csmCasesMockData";
import type { CsmCaseDetail } from "./csmCaseTypes";
import { CSM_CASES_QUERY_KEY } from "./useCsmCases";

export interface CreateCsmCaseInput {
  subject: string;
  description?: string;
  severity: string;
  issueType?: string;
  product?: string;
  /** Set when this case originates from "Create related case" on a recently-closed case — see isEligibleForRelatedCase. */
  relatedCaseId?: string;
}

/** POST /cases. The backend strips any client-supplied `createdBy`; this never sends one. */
export function useCreateCsmCase() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async (input: CreateCsmCaseInput) => {
      if (!configured) return mockCreateCase(input);
      const accessToken = await getAccessToken();
      const created = await authedPost<CsmCaseDetail>(csmServiceUrls.cases, accessToken, input);
      if (!created) throw new Error("Case creation did not return the created case.");
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CSM_CASES_QUERY_KEY });
    },
  });
}
