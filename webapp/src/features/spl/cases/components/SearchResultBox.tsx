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

// Ported from the source app's components/SearchResultBox.tsx. Rebuilt on
// plain MUI (Card/Stack) instead of the source's Bootstrap div/class markup
// (`container`/`row`/`card`) — this app has no Bootstrap stylesheet loaded,
// and loading one globally would reset typography/table/button styles for
// every other perspective in one-wso2, not just these ported screens. Same
// visual intent (a stack of clickable result cards), different building
// blocks.
import { Card, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { useNavigate } from "react-router";
import { LinearLoadingPanel, NoResultsPanel } from "./StatePanels";
import type { CaseDetails, CaseDetailsWithCount, AccountSummary, ProjectSummary } from "../api/splCaseTypes";

type SearchOptions = "account" | "myAccount" | "case" | "project";

export function SearchResultBox({
  searchDataResponse,
  type,
}: {
  searchDataResponse: CaseDetailsWithCount | AccountSummary[] | ProjectSummary[] | undefined;
  type: SearchOptions;
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  // Same warm-orange hover identity in both modes — see CaseStateCard.
  const hoverBg = alpha("#ff7300", theme.palette.mode === "dark" ? 0.24 : 0.35);

  const navigateTo = (id: string) => {
    if (type === "case") navigate(`/csm/support-cases/${id}`);
    else if (type === "account" || type === "myAccount") navigate(`/csm/accounts/${id}`);
    else if (type === "project") navigate(`/csm/projects/${id}`);
  };

  if (typeof searchDataResponse === "undefined") return <LinearLoadingPanel />;

  const items =
    type === "case" ? (searchDataResponse as CaseDetailsWithCount).cases : (searchDataResponse as AccountSummary[] | ProjectSummary[]);

  if (!items || items.length === 0) return <NoResultsPanel />;

  return (
    <Stack spacing={1.5} sx={{ mt: 2, maxWidth: 640, mx: "auto" }}>
      {type === "case"
        ? (items as CaseDetails[]).map((item, index) => (
            <Card
              key={index}
              variant="outlined"
              sx={{ p: 2, cursor: "pointer", "&:hover": { backgroundColor: hoverBg } }}
              onClick={() => navigateTo(item.number)}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {item.caseId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.number}
              </Typography>
            </Card>
          ))
        : (items as (AccountSummary | ProjectSummary)[]).map((item, index) => (
            <Card
              key={index}
              variant="outlined"
              sx={{ p: 2, cursor: "pointer", "&:hover": { backgroundColor: hoverBg } }}
              onClick={() => navigateTo(item.number)}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                {item.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.number}
              </Typography>
            </Card>
          ))}
    </Stack>
  );
}
