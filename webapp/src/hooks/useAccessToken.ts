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

import { useCallback } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { devBypassAuth } from "@config/authConfig";

// Collapses the two-line "fetch the access_token, then guard against an
// empty one" boilerplate every authed query/mutation repeats before calling
// authedGet/authedPost/authedPatch/authedDelete. Deliberately still sources
// the token from the Asgardeo hook (not @api/authBridge's registered
// accessor) — see the comment on authedGet in @api/http for why the
// primary fetch must stay hook-sourced rather than bridge-sourced.
//
// Dev-only exception: under ONE_WSO2_DEV_BYPASS_AUTH there is no real
// Asgardeo session, so getAccessToken() has nothing to return and every
// authed call would throw "No access_token available" before ever reaching
// the network — the same problem useAsgardeoGroups had, for the hook nearly
// every ported perspective's real-data fetching goes through. Returns a
// placeholder instead; whatever backend receives it either ignores it (a
// local dev proxy standing in for a gateway) or 401s it, same as any other
// invalid token would — this never grants real access, it just lets the
// request attempt happen instead of failing synchronously in the browser.
// Folds away in production builds exactly like devBypassAuth itself.
export function useAccessToken(): () => Promise<string> {
  const { getAccessToken } = useAsgardeo();
  return useCallback(async () => {
    if (devBypassAuth) return "dev-bypass-no-real-token";
    const token = await getAccessToken();
    if (!token) throw new Error("No access_token available from Asgardeo");
    return token;
  }, [getAccessToken]);
}
