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

import { Box, Card, Typography } from "@wso2/oxygen-ui";
import { ChevronRightIcon, TicketIcon } from "@wso2/oxygen-ui-icons-react";
import { Link as RouterLink } from "react-router";
import CsmShell from "@features/csm/components/CsmShell";

// The CSM perspective's landing page. One tile today (Cases) — written as a
// small grid rather than a single hardcoded card so the next domain
// (Incidents, Change Requests, ...) is a second entry, not a redesign.
const DOMAINS = [
  {
    key: "cases",
    label: "Cases",
    description: "Search, triage and work customer support cases.",
    icon: TicketIcon,
    path: "/csm/cases",
  },
];

export default function CsmOverviewPage() {
  return (
    <CsmShell title="CSM Portal" subtitle="Customer support case management for the CS team.">
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fill, minmax(220px, 1fr))" },
          gap: 1.5,
        }}
      >
        {DOMAINS.map((d) => (
          <Card
            key={d.key}
            component={RouterLink}
            to={d.path}
            variant="outlined"
            sx={{
              p: 2.25,
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 1,
              transition: "border-color 120ms ease",
              "&:hover": { borderColor: "primary.main" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <d.icon size={18} />
              <Typography sx={{ fontWeight: 600, fontSize: 14.5 }}>{d.label}</Typography>
              <ChevronRightIcon size={14} style={{ marginLeft: "auto" }} />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {d.description}
            </Typography>
          </Card>
        ))}
      </Box>
    </CsmShell>
  );
}
