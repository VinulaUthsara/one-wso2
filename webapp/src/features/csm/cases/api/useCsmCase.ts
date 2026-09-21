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

import { useQuery } from "@tanstack/react-query";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockGetCase } from "./csmCasesMockData";
import type { CsmCaseDetail } from "./csmCaseTypes";
import { CSM_CASES_QUERY_KEY } from "./useCsmCases";

export function csmCaseQueryKey(caseId: string) {
  return [...CSM_CASES_QUERY_KEY, caseId];
}

/** GET /cases/{id} — full case detail, including the server-computed `nextStates`. */
export function useCsmCase(caseId: string, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isCsmBackendConfigured();

  return useQuery<CsmCaseDetail | undefined>({
    queryKey: [...csmCaseQueryKey(caseId), configured],
    enabled: enabled && Boolean(caseId),
    queryFn: async () => {
      if (!configured) return mockGetCase(caseId);
      const accessToken = await getAccessToken();
      return authedGet<CsmCaseDetail>(csmServiceUrls.case(caseId), accessToken);
    },
    staleTime: 15 * 1000,
    retry: httpRetry,
  });
}
