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

// Ported from SupportPortalLite's src/components/ABTTeamFilterSelect.tsx.
import { useEffect } from "react";
import { FormControl, Select, MenuItem, ListItemText, CircularProgress, type SelectChangeEvent } from "@mui/material";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";

interface SplAbtTeamFilterSelectProps {
  selectedTeam: string | null;
  onTeamChange: (team: string | null) => void;
}

export default function SplAbtTeamFilterSelect({ selectedTeam, onTeamChange }: SplAbtTeamFilterSelectProps) {
  const { data: teams, loading, getApiData } = useGetApi<string[]>({ url: `${splBackendUrl}/abt-teams` });

  useEffect(() => {
    getApiData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (event: SelectChangeEvent<string>) => {
    onTeamChange(event.target.value || null);
  };

  return (
    <FormControl sx={{ m: 1, width: 220 }} size="small">
      <Select
        value={selectedTeam || ""}
        onChange={handleChange}
        displayEmpty
        disabled={loading}
        renderValue={(selected) => (loading ? "Loading..." : selected || "All Teams")}
      >
        <MenuItem value="">
          <ListItemText primary="All Teams" />
        </MenuItem>
        {loading && (
          <MenuItem disabled>
            <CircularProgress size={14} sx={{ mr: 1 }} /> Loading...
          </MenuItem>
        )}
        {(teams ?? []).map((t) => (
          <MenuItem key={t} value={t}>
            <ListItemText primary={t} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
