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
import { authedPost } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockListComments, mockPostComment } from "./csmCasesMockData";
import type { CsmCaseComment } from "./csmCaseTypes";
import { csmCaseQueryKey } from "./useCsmCase";

export function csmCaseCommentsQueryKey(caseId: string) {
  return ["csm", "cases", caseId, "comments"];
}

/** POST /cases/{id}/comments/search — this feature always asks for the whole thread (no paging yet), so the body is fixed. */
export function useCsmCaseComments(caseId: string, enabled = true) {
  const getAccessToken = useAccessToken();
  const configured = isCsmBackendConfigured();

  return useQuery<CsmCaseComment[]>({
    queryKey: [...csmCaseCommentsQueryKey(caseId), configured],
    enabled: enabled && Boolean(caseId),
    queryFn: async () => {
      if (!configured) return mockListComments(caseId);
      const accessToken = await getAccessToken();
      const result = await authedPost<{ comments: CsmCaseComment[] }>(
        csmServiceUrls.caseCommentsSearch(caseId),
        accessToken,
        {},
      );
      return result?.comments ?? [];
    },
    staleTime: 15 * 1000,
    retry: httpRetry,
  });
}

export interface PostCsmCaseCommentInput {
  caseId: string;
  type?: "work_note" | "comment";
  content: string;
}

/** POST /cases/{id}/comments. See csmCasesMockData.mockPostComment for the gate this reproduces as a UI affordance. */
export function usePostCsmCaseComment() {
  const getAccessToken = useAccessToken();
  const queryClient = useQueryClient();
  const configured = isCsmBackendConfigured();

  return useMutation({
    mutationFn: async ({ caseId, ...body }: PostCsmCaseCommentInput) => {
      if (!configured) return mockPostComment(caseId, body);
      const accessToken = await getAccessToken();
      const created = await authedPost<CsmCaseComment>(csmServiceUrls.caseComments(caseId), accessToken, body);
      if (!created) throw new Error("Comment creation did not return the created comment.");
      return created;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: csmCaseCommentsQueryKey(variables.caseId) });
      void queryClient.invalidateQueries({ queryKey: csmCaseQueryKey(variables.caseId) });
    },
  });
}
