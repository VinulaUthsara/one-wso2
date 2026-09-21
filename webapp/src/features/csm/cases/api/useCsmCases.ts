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
import { authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockSearchCases, type CsmCaseSearchFilters } from "./csmCasesMockData";
import type { CsmCaseDetail } from "./csmCaseTypes";

export type { CsmCaseSearchFilters };

export const CSM_CASES_QUERY_KEY = ["csm", "cases"];

/** POST /cases/search — the Cases list/filter query. */
export function useCsmCases(filters: CsmCaseSearchFilters, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isCsmBackendConfigured();

  return useQuery<{ cases: CsmCaseDetail[]; total: number }>({
    queryKey: [...CSM_CASES_QUERY_KEY, "search", filters, configured],
    enabled,
    queryFn: async () => {
      if (!configured) return mockSearchCases(filters);
      const accessToken = await getAccessToken();
      return (
        (await authedPost<{ cases: CsmCaseDetail[]; total: number }>(
          csmServiceUrls.casesSearch,
          accessToken,
          filters,
        )) ?? { cases: [], total: 0 }
      );
    },
    staleTime: 30 * 1000,
    retry: httpRetry,
  });
}
