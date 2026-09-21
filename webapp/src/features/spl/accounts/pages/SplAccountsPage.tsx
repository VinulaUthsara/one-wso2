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

// Ported from the source app's pages/account/Accounts.tsx. Routed at both
// csm/all-accounts and csm/my-accounts (see docs/ported-apps/spl.md) — which
// one is active is read from the path itself, same as the source did for
// its own /support/all-accounts vs /support/my-accounts.
import { useState } from "react";
import { useLocation } from "react-router";
import SplShell from "@features/spl/components/SplShell";
import type { ToggleSwitchState } from "../api/splAccountTypes";
import ToggleSwitch from "../components/ToggleSwitch";
import ListAccounts from "../components/ListAccounts";
import ListMyAccounts from "../components/ListMyAccounts";

function AccountsContent() {
  const [toggleSwitchState, setToggleSwitchState] = useState<ToggleSwitchState>("active-accounts");
  const location = useLocation();

  // Pure function of the URL — no state/effect needed, unlike the source's
  // own useState+useEffect pair (defaults to "my accounts" the same way the
  // source did whenever the leaf segment is neither my-accounts nor
  // all-accounts, e.g. mid-navigation).
  const leaf = location.pathname.slice(1).split("/")[1];
  const isMyAccounts = leaf !== "all-accounts";

  const active = toggleSwitchState === "active-accounts";

  return (
    <>
      <ToggleSwitch page={toggleSwitchState} onSwitchClick={setToggleSwitchState} />
      {isMyAccounts ? <ListMyAccounts active={active} /> : <ListAccounts active={active} />}
    </>
  );
}

export default function SplAccountsPage() {
  return (
    <SplShell>
      <AccountsContent />
    </SplShell>
  );
}
