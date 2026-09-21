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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authedGet, authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockEscalate, mockGetEscalations } from "./csmCasesMockData";
import type { CaseEscalationHistory, CaseEscalationRecord, EscalationAction } from "./csmCaseTypes";
import { csmCaseQueryKey } from "./useCsmCase";

function csmCaseEscalationsQueryKey(caseId: string) {
  return ["csm", "cases", caseId, "escalations"];
}

/** GET /cases/{id}/escalations — history plus who's notified on the current level (needed for the de-escalate gate). */
export function useCsmCaseEscalations(caseId: string, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isCsmBackendConfigured();

  return useQuery<CaseEscalationHistory>({
    queryKey: [...csmCaseEscalationsQueryKey(caseId), configured],
    enabled: enabled && Boolean(caseId),
    queryFn: async () => {
      if (!configured) return mockGetEscalations(caseId);
      const accessToken = await getAccessToken();
      return authedGet<CaseEscalationHistory>(csmServiceUrls.caseEscalations(caseId), accessToken);
    },
    staleTime: 15 * 1000,
    retry: httpRetry,
  });
}

export interface EscalateCsmCaseInput {
  caseId: string;
  action?: EscalationAction;
  reason?: string;
}

/** POST /cases/{id}/escalations. `reason` is required unless action is DEESCALATE. */
export function useEscalateCsmCase() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async ({ caseId, ...body }: EscalateCsmCaseInput) => {
      if (!configured) return mockEscalate(caseId, body);
      const accessToken = await getAccessToken();
      const created = await authedPost<CaseEscalationRecord>(csmServiceUrls.caseEscalations(caseId), accessToken, body);
      if (!created) throw new Error("Escalation did not return the created record.");
      return created;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: csmCaseEscalationsQueryKey(variables.caseId) });
      void queryClient.invalidateQueries({ queryKey: csmCaseQueryKey(variables.caseId) });
    },
  });
}
