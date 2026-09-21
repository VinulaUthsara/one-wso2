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

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@wso2/oxygen-ui";
import { PlusIcon } from "@wso2/oxygen-ui-icons-react";
import { Link as RouterLink, useNavigate } from "react-router";
import CsmShell from "@features/csm/components/CsmShell";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { CASE_STATE_LABEL, type CaseState } from "../api/csmCaseTypes";
import { useCsmCases, type CsmCaseSearchFilters } from "../api/useCsmCases";

const STATE_OPTIONS: CaseState[] = [
  "open",
  "work_in_progress",
  "waiting_on_wso2",
  "awaiting_info",
  "solution_proposed",
  "closed",
];
const SEVERITY_OPTIONS = ["critical", "high", "medium", "low"];

function severityColor(severity: string): "error" | "warning" | "info" | "default" {
  switch (severity) {
    case "critical":
      return "error";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "default";
  }
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CsmCaseListPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<string>("");
  const [severity, setSeverity] = useState<string>("");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [query, setQuery] = useState("");

  const filters = useMemo<CsmCaseSearchFilters>(
    () => ({
      state: state || undefined,
      severity: severity || undefined,
      assignedToMe: assignedToMe || undefined,
      query: query.trim() || undefined,
    }),
    [state, severity, assignedToMe, query],
  );

  const casesQuery = useCsmCases(filters);

  return (
    <CsmShell
      title="Operations"
      subtitle="Service requests, change requests, incidents, and problems across customers."
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.25, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search subject, customer, case number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: 240 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select displayEmpty value={state} onChange={(e) => setState(e.target.value)}>
            <MenuItem value="">All states</MenuItem>
            {STATE_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {CASE_STATE_LABEL[s]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select displayEmpty value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <MenuItem value="">All severities</MenuItem>
            {SEVERITY_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s[0].toUpperCase() + s.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControlLabel
          control={<Switch checked={assignedToMe} onChange={(e) => setAssignedToMe(e.target.checked)} size="small" />}
          label="Assigned to me"
        />
        <Button
          component={RouterLink}
          to="/csm/cases/new"
          variant="contained"
          startIcon={<PlusIcon size={15} />}
          sx={{ ml: "auto", textTransform: "none", fontWeight: 600 }}
        >
          New case
        </Button>
      </Box>

      {casesQuery.isPending ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={22} />
        </Box>
      ) : casesQuery.isError ? (
        <ErrorNotice onRetry={() => void casesQuery.refetch()} error={casesQuery.error}>
          Couldn't load cases.
        </ErrorNotice>
      ) : casesQuery.data && casesQuery.data.cases.length > 0 ? (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    fontSize: 11,
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  },
                }}
              >
                <TableCell>Case</TableCell>
                <TableCell>Product</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Escalation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {casesQuery.data.cases.map((c) => (
                <TableRow key={c.id} hover onClick={() => navigate(`/csm/cases/${c.id}`)} sx={{ cursor: "pointer" }}>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: 12.5 }}>{c.caseNumber ?? c.id}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12 }}>
                      {c.subject}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.product ?? "—"}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.issueType ?? c.caseType ?? "—"}</TableCell>
                  <TableCell>
                    {c.severity && c.severity !== "unset" ? (
                      <Chip label={c.severity} size="small" color={severityColor(c.severity)} variant="outlined" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.assignee ?? "Unassigned"}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{c.customer}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{CASE_STATE_LABEL[c.state]}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>{formatDate(c.createdAt)}</TableCell>
                  <TableCell sx={{ fontSize: 12.5 }}>
                    {c.escalationLevel ? (
                      <Chip label={`L${c.escalationLevel}`} size="small" color="warning" variant="outlined" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          No cases match these filters.
        </Typography>
      )}
    </CsmShell>
  );
}
