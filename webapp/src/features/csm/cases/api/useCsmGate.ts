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

import { describeError } from "@api/errors";
import { useCsmMe } from "./useCsmMe";

export interface CsmGate {
  // May the CSM perspective be used at all. Unlike every sibling gate in this
  // app (Due Diligence, Marketing Ops, ...), there is no role to check here —
  // the Cases API has no role-based access control today (confirmed from the
  // handler code, including an explicit "RBAC MUST NOT be invented here"
  // comment), so "GET /users/me succeeded" IS the whole authorization
  // decision. Don't add a role check later without a real backend field to
  // back it — that would be inventing a permission model the API doesn't have.
  isAuthorized: boolean;
  // True while /users/me is in flight. Callers should hold off on an
  // "unauthorized" state until this clears, or every load flashes a denial.
  isResolving: boolean;
  // /users/me itself failed (network, gateway, identity lookup) —
  // distinguishable from `isAuthorized === false` for the usual reason: a
  // failed request is worth retrying, a denial is not.
  isError: boolean;
  errorMessage?: string;
  retry: () => void;
}

export function useCsmGate(enabled = true): CsmGate {
  const me = useCsmMe(enabled);
  return {
    isAuthorized: Boolean(me.data),
    isResolving: me.isPending,
    isError: me.isError,
    errorMessage: me.isError ? describeError(me.error) : undefined,
    retry: () => void me.refetch(),
  };
}
