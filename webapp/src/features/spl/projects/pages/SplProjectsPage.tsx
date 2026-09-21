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

// Ported from SupportPortalLite's src/pages/project/Projects.tsx. The
// source's shared ToggleSwitch component only ever showed a single disabled
// "All Projects" tab for this page (its other branches serve the accounts
// screens, a different domain's port) — inlined here rather than porting
// the whole shared component, to keep this domain's files self-contained
// (see docs/ported-apps/spl.md).
import { Tab, Tabs } from "@mui/material";
import SplShell from "@features/spl/components/SplShell";
import ProjectsTable from "@features/spl/projects/components/ProjectsTable";

export default function SplProjectsPage() {
  return (
    <SplShell>
      <Tabs
        value={0}
        sx={{ mb: 2, justifyContent: "flex-start", "& button": { borderRadius: 10, zIndex: 1 } }}
        slotProps={{ indicator: { sx: { backgroundColor: "#ff7300", height: "100%", borderRadius: 10 } } }}
      >
        <Tab label="All Projects" disabled />
      </Tabs>
      <ProjectsTable />
    </SplShell>
  );
}
