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

// Ported from SupportPortalLite's src/components/CustomerHealthToggle.tsx.
// The source mirrored the `page` prop into local state via a useEffect —
// dropped here since `value` is entirely derived from `page` with no other
// divergence, and one-wso2's React Compiler lint rejects that pattern
// (react-hooks/set-state-in-effect) as an unnecessary render cascade.
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

export type AccountScopeState = "my-accounts" | "all-accounts";

interface SplCustomerHealthToggleProps {
  onSwitchClick: (state: AccountScopeState) => void;
  page: AccountScopeState;
}

export default function SplCustomerHealthToggle({ onSwitchClick, page }: SplCustomerHealthToggleProps) {
  const value = page === "all-accounts" ? 0 : 1;

  return (
    <div style={{ border: "1px solid #ff7300", borderRadius: 25, height: "49.5px", width: "fit-content" }}>
      <Tabs
        sx={{
          justifyContent: "flex-start",
          "& button": { borderRadius: 10, boxShadow: "insert", zIndex: 1 },
          "& button.Mui-selected": { color: "#fff" },
        }}
        value={value}
        slotProps={{ indicator: { sx: { backgroundColor: "#ff7300", height: "100%", borderRadius: 10 } } }}
      >
        <Tab onClick={() => onSwitchClick("all-accounts")} label="All Accounts" />
        <Tab onClick={() => onSwitchClick("my-accounts")} label="My Accounts" />
      </Tabs>
    </div>
  );
}
