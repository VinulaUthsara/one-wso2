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
import { mockListActivities } from "./csmCasesMockData";
import type { CaseAuditEntry } from "./csmCaseTypes";

/** POST /cases/{id}/activities/search — the case's audit trail, merged with comments into the Activities tab. */
export function useCsmCaseActivities(caseId: string, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isCsmBackendConfigured();

  return useQuery<CaseAuditEntry[]>({
    queryKey: ["csm", "cases", caseId, "activities", configured],
    enabled: enabled && Boolean(caseId),
    queryFn: async () => {
      if (!configured) return mockListActivities(caseId);
      const accessToken = await getAccessToken();
      const result = await authedPost<{ activities: CaseAuditEntry[] }>(
        csmServiceUrls.caseActivitiesSearch(caseId),
        accessToken,
        {},
      );
      return result?.activities ?? [];
    },
    staleTime: 15 * 1000,
    retry: httpRetry,
  });
}
