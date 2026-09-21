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
import { authedPatch } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockPatchCase } from "./csmCasesMockData";
import type { CaseState, CsmCaseDetail, WorkState } from "./csmCaseTypes";
import { CSM_CASES_QUERY_KEY } from "./useCsmCases";
import { csmCaseQueryKey } from "./useCsmCase";

export interface PatchCsmCaseInput {
  caseId: string;
  /**
   * Never send "reopened" here — it is not a real PATCH target, only a
   * convention `nextStates` uses to mean "offer Create related case" (see
   * isEligibleForRelatedCase in csmCaseTypes.ts). The case-detail page's
   * next-state buttons must route a "reopened" option to the create-case
   * form instead of calling this mutation.
   */
  state?: Exclude<CaseState, "reopened">;
  workState?: WorkState;
}

/**
 * PATCH /cases/{id} for state/workState transitions only (v1 scope — this
 * endpoint also accepts assigneeEmail/watchList/acknowledge/autocloseHoldUntil
 * upstream, none of which this slice's UI surfaces yet).
 */
export function usePatchCsmCase() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async ({ caseId, ...patch }: PatchCsmCaseInput) => {
      if (!configured) return mockPatchCase(caseId, patch);
      const accessToken = await getAccessToken();
      const updated = await authedPatch<CsmCaseDetail>(csmServiceUrls.case(caseId), accessToken, patch);
      if (!updated) throw new Error("Case update did not return the updated case.");
      return updated;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: csmCaseQueryKey(variables.caseId) });
      void queryClient.invalidateQueries({ queryKey: CSM_CASES_QUERY_KEY });
    },
  });
}
