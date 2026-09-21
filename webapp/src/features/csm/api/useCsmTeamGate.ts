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

// The CSM entry point is shared by two audiences: Customer Success sees the
// native CSM Portal (features/csm/cases, gated by useCsmGate); Sales /
// Solutions Architecture sees the ported SupportPortalLite screens
// (features/spl, gated by useSplPermissions for the finer-grained stuff).
//
// Neither backend can tell the two apart. SupportPortalLite's own authJWT/
// userinfo modules parse the caller's Asgardeo `groups` claim internally
// (for its own allow-list checks) but never return it from any endpoint, and
// the CSM Portal's Cases API has no role model at all. So this gate reads
// the id_token's `groups` claim directly — the same technique
// useSubscriptionGate already uses for the subscription service's admin
// screens — against two independently configured name lists.
//
// This is presentation only, same caveat as useAsgardeoGroups: it decides
// which of the two UIs to show, not what either one lets you do. Every
// backend behind them re-derives its own authorization from the JWT.

import { hasAnyGroup, useAsgardeoGroups } from "@hooks/useAsgardeoGroups";
import { csTeamGroups, salesTeamGroups } from "@config/apiConfig";

export type CsPortalTeam = "customerSuccess" | "salesOrSa" | "none";

export interface CsmTeamGate {
  /** Which of the two ported UIs to show. "none" until resolved. */
  team: CsPortalTeam;
  /** True while the id_token's groups claim is still being decoded. */
  isResolving: boolean;
  /** The decode itself failed — distinct from "resolved to no team". */
  isError: boolean;
  errorMessage?: string;
  retry: () => void;
}

export function useCsmTeamGate(enabled = true): CsmTeamGate {
  const identity = useAsgardeoGroups();

  if (!enabled) {
    return { team: "none", isResolving: false, isError: false, retry: identity.retry };
  }

  if (!identity.ready) {
    return { team: "none", isResolving: true, isError: false, retry: identity.retry };
  }

  if (identity.error) {
    return {
      team: "none",
      isResolving: false,
      isError: true,
      errorMessage: identity.error,
      retry: identity.retry,
    };
  }

  // Customer Success wins on overlap — an arbitrary but necessary tie-break
  // for someone configured into both lists, since the two UIs are mutually
  // exclusive at any one route.
  const isCs = hasAnyGroup(identity.groups, csTeamGroups());
  const isSalesOrSa = hasAnyGroup(identity.groups, salesTeamGroups());
  const team: CsPortalTeam = isCs ? "customerSuccess" : isSalesOrSa ? "salesOrSa" : "none";

  return { team, isResolving: false, isError: false, retry: identity.retry };
}
