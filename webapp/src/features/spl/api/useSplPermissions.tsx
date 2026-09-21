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

// Port of SupportPortalLite's own src/components/Authorize.tsx
// PermissionContext — fine-grained, WITHIN-app permissions (who may add a
// work note, add an escalation, download an attachment, view usage
// metrics), independent of useCsmTeamGate above: that decides WHETHER a
// caller sees the ported SupportPortalLite screens at all; this decides what
// they may DO once there. Not every Sales/SA viewer holds every one of
// these — the source app's own group-list config is exactly as granular.
//
// Source used basicUserInfo.groups from Asgardeo's getBasicUserInfo(); this
// uses the same id_token groups claim via useAsgardeoGroups (the technique
// useCsmTeamGate and the subscription service's admin gate already use), so
// no extra round trip and no dependency on @asgardeo/auth-react.

import { createContext, useContext, type ReactNode } from "react";
import { hasAnyGroup, useAsgardeoGroups } from "@hooks/useAsgardeoGroups";
import {
  splAddEscalationGroups,
  splAddWorknoteGroups,
  splDownloadAttachmentGroups,
  splUsageMetricsGroups,
} from "@config/apiConfig";

export interface SplPermissions {
  isUserAllowedtoAddWorkNotes: boolean;
  isUserAllowedtoAddEscalations: boolean;
  isUserAllowedtoDownloadAttachments: boolean;
  isUserAllowedToViewUsageMetrics: boolean;
  /** True until the id_token's groups claim has been decoded at least once. */
  ready: boolean;
}

const DEFAULT_PERMISSIONS: SplPermissions = {
  isUserAllowedtoAddWorkNotes: false,
  isUserAllowedtoAddEscalations: false,
  isUserAllowedtoDownloadAttachments: false,
  isUserAllowedToViewUsageMetrics: false,
  ready: false,
};

const SplPermissionContext = createContext<SplPermissions>(DEFAULT_PERMISSIONS);

export function SplPermissionProvider({ children }: { children: ReactNode }) {
  const identity = useAsgardeoGroups();

  const value: SplPermissions = {
    isUserAllowedtoAddWorkNotes: hasAnyGroup(identity.groups, splAddWorknoteGroups()),
    isUserAllowedtoAddEscalations: hasAnyGroup(identity.groups, splAddEscalationGroups()),
    isUserAllowedtoDownloadAttachments: hasAnyGroup(identity.groups, splDownloadAttachmentGroups()),
    isUserAllowedToViewUsageMetrics: hasAnyGroup(identity.groups, splUsageMetricsGroups()),
    ready: identity.ready,
  };

  return <SplPermissionContext.Provider value={value}>{children}</SplPermissionContext.Provider>;
}

export function useSplPermissions(): SplPermissions {
  return useContext(SplPermissionContext);
}
