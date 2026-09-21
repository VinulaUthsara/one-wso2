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
import { useAsgardeo } from "@asgardeo/react";
import { authedGet } from "@api/http";
import { httpRetry } from "@api/errors";
import { useAccessToken } from "@hooks/useAccessToken";
import { foldIdentityError, useAsgardeoSub } from "@hooks/useAsgardeoSub";
import { isCsmBackendConfigured, csmServiceUrls } from "@config/apiConfig";
import { mockGetMe } from "./csmCasesMockData";
import type { CsmMe } from "./csmCaseTypes";

export { isCsmBackendConfigured };

// GET /users/me — the CSM Portal's own identity call. Every other hook in
// this feature that needs "is this me" (the comment-ownership gate, the
// de-escalation gate) derives from it, so it's fetched once and shared —
// React Query dedupes concurrent callers on the key below.
//
// It also IS the perspective's access gate (see useCsmGate): the Cases API
// has no role-based access control today, so there is no role field to
// check — a successful response is the whole answer.
//
// Keyed per-user (`userSub`) so switching accounts in the same tab can't
// serve the previous user's identity from cache. staleTime matches every
// other identity query in this app (marketing-ops /api/me, due-diligence
// /user-info, ...).
export function useCsmMe(enabled = true) {
  const { isSignedIn } = useAsgardeo();
  const getAccessToken = useAccessToken();
  const { state: subState, retry: retryIdentity } = useAsgardeoSub();
  const userSub = subState.status === "ready" ? subState.sub : undefined;
  const configured = isCsmBackendConfigured();

  const query = useQuery<CsmMe>({
    queryKey: ["csm-me", configured ? userSub : "mock", configured],
    // Real mode needs a resolved identity, same as every sibling gate. Mock
    // mode (no backend configured — see csmCasesMockData.ts) deliberately
    // does NOT wait on isSignedIn/userSub: under ONE_WSO2_DEV_BYPASS_AUTH,
    // AuthGuard renders the app without ever completing a real Asgardeo
    // sign-in, so isSignedIn/userSub never resolve — gating the mock on them
    // would leave this perspective spinning on "Checking access…" forever in
    // exactly the dev setup the mock exists to support.
    enabled: enabled && (configured ? isSignedIn && Boolean(userSub) : true),
    queryFn: async () => {
      // No backend configured yet (v1) — the mock fixture stands in; see
      // csmCasesMockData.ts's file-level comment for why and when to remove
      // this branch.
      if (!configured) return mockGetMe();
      const accessToken = await getAccessToken();
      return authedGet<CsmMe>(csmServiceUrls.me, accessToken);
    },
    staleTime: 5 * 60 * 1000,
    retry: httpRetry,
  });

  return foldIdentityError(query, subState, retryIdentity);
}
