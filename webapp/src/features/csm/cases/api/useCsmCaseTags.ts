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
import { authedDelete, authedPost } from "@api/http";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockAddTag, mockRemoveTag } from "./csmCasesMockData";
import type { CaseTag } from "./csmCaseTypes";
import { csmCaseQueryKey } from "./useCsmCase";

// Tags are already part of CsmCaseDetail.tags — no separate list query, just
// mutations that invalidate the case query on success.

export function useAddCsmCaseTag() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async ({ caseId, label }: { caseId: string; label: string }) => {
      if (!configured) return mockAddTag(caseId, label);
      const accessToken = await getAccessToken();
      const created = await authedPost<CaseTag>(csmServiceUrls.caseTags(caseId), accessToken, { label });
      if (!created) throw new Error("Tag creation did not return the created tag.");
      return created;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: csmCaseQueryKey(variables.caseId) });
    },
  });
}

export function useRemoveCsmCaseTag() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async ({ caseId, tagId }: { caseId: string; tagId: string }) => {
      if (!configured) return mockRemoveTag(caseId, tagId);
      const accessToken = await getAccessToken();
      await authedDelete(csmServiceUrls.caseTag(caseId, tagId), accessToken);
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: csmCaseQueryKey(variables.caseId) });
    },
  });
}
