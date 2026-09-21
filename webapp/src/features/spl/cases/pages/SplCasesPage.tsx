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

// Ported from the source app's pages/case/Cases.tsx — an overview of six
// case-state counts that drills into a per-state table. Six separate
// useGetApi calls with static-URL state (rather than one call re-fetched on
// filter change) is the source's own pattern, kept as-is: it's what avoids a
// pagination change on one state's table re-triggering every other state's
// count card.
import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import SplShell from "@features/spl/components/SplShell";
import Search from "../components/Search";
import CaseStateCard from "../components/CaseStateCard";
import CaseStateView from "../components/CaseStateView";
import type { CaseDetailsWithCount } from "../api/splCaseTypes";

const STATES = ["Open", "Work In Progress", "Awaiting Info", "Solution Proposed", "Waiting on WSO2", "Reopened"];
const COLORS = ["#0052cc", "#008000", "pink", "brown", "#F25C36", "#8993a4"];

function useCaseStateQuery(state: string) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { data, loading, error, getApiData } = useGetApi<CaseDetailsWithCount>({
    url: `${splBackendUrl}/cases?stateFilter=${encodeURIComponent(state)}&offset=0&limit=10`,
    headers: { accept: "application/json" },
  });

  useEffect(() => {
    getApiData(
      `${splBackendUrl}/cases?stateFilter=${encodeURIComponent(state)}&offset=${page * rowsPerPage}&limit=${rowsPerPage}`,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage]);

  return { data, loading, error, page, setPage, rowsPerPage, setRowsPerPage };
}

function CasesContent() {
  const [caseState, setCaseState] = useState("");
  const [showTable, setShowTable] = useState(true);
  const theme = useTheme();

  // Called unconditionally, one per fixed state — see file header comment.
  const q0 = useCaseStateQuery(STATES[0]);
  const q1 = useCaseStateQuery(STATES[1]);
  const q2 = useCaseStateQuery(STATES[2]);
  const q3 = useCaseStateQuery(STATES[3]);
  const q4 = useCaseStateQuery(STATES[4]);
  const q5 = useCaseStateQuery(STATES[5]);
  const queries = [q0, q1, q2, q3, q4, q5];

  return (
    <>
      <Box sx={{ mt: 3 }}>
        <Search searchOption="case" setShowTable={setShowTable} />
      </Box>
      {caseState === "" && showTable && (
        <Grid container spacing={3} sx={{ p: 2, mt: 4 }}>
          <Grid size={{ xs: 12 }} sx={{ display: "flex", justifyContent: "center" }}>
            <Paper
              sx={{
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey[900] : "#ECECEC",
                maxWidth: 1050,
              }}
            >
              <Grid container p={3}>
                <Grid size={{ xs: 12 }}>
                  <Typography align="left" gutterBottom variant="h4">
                    Overall Case Summary
                  </Typography>
                </Grid>
                {STATES.map((state, i) => (
                  <Grid key={state} size={{ xs: 4 }} p={2} sx={{ display: "flex", justifyContent: "center" }}>
                    <CaseStateCard
                      data={queries[i].data}
                      loading={queries[i].loading}
                      error={queries[i].error}
                      state={state}
                      setCaseState={setCaseState}
                      color={COLORS[i]}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}
      {STATES.map((state, i) =>
        caseState === state && showTable && queries[i].data ? (
          <CaseStateView
            key={state}
            data={queries[i].data as CaseDetailsWithCount}
            loading={queries[i].loading}
            error={queries[i].error}
            state={state}
            setCaseState={setCaseState}
            page={queries[i].page}
            setPage={queries[i].setPage}
            rowsPerPage={queries[i].rowsPerPage}
            setRowsPerPage={queries[i].setRowsPerPage}
          />
        ) : null,
      )}
    </>
  );
}

export default function SplCasesPage() {
  return (
    <SplShell>
      <CasesContent />
    </SplShell>
  );
}
