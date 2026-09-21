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

// Adapted from SupportPortalLite's src/components/Search.tsx +
// SearchResultBox.tsx, trimmed to the "project" search type this domain
// needs (the source component handled account/case/project in one file) and
// scoped locally — see the note in ./DefaultTable.tsx. Rebuilt on plain MUI
// (TextField + a floating results List) rather than the source's bootstrap-
// class markup and magnifying-glass SVG asset, which aren't available here.
import { useEffect, useState } from "react";
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  InputAdornment,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router";
import { splBackendUrl } from "@config/apiConfig";
import { useGetApi } from "@features/spl/api/useSplApi";
import type { ProjectDetails } from "../projectTypes";

export default function ProjectSearch({ setShowTable }: { setShowTable: (value: boolean) => void }) {
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();
  const { data: results, getApiData } = useGetApi<ProjectDetails[]>({
    url: `${splBackendUrl}/projects?phrase=&offset=0&limit=10`,
  });

  useEffect(() => {
    if (inputValue.length >= 4) {
      void getApiData(
        `${splBackendUrl}/projects?phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getApiData is stable (see useSplApi's useCallback); only inputValue should re-trigger a search
  }, [inputValue]);

  const handleChange = (value: string) => {
    setInputValue(value);
    if (value.length >= 4) setShowTable(false);
    else if (value.length === 0) setShowTable(true);
  };

  return (
    <Box sx={{ position: "relative", maxWidth: 480, mb: 2 }}>
      <TextField
        fullWidth
        placeholder="Search by Project Name"
        value={inputValue}
        onChange={(e) => handleChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      {inputValue.length >= 4 && (
        <Paper sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10, mt: 0.5 }}>
          {results === undefined ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Searching…
              </Typography>
            </Box>
          ) : results.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                No results found.
              </Typography>
            </Box>
          ) : (
            <List dense>
              {results.map((item) => (
                <ListItemButton key={item.number} onClick={() => navigate(`/csm/projects/${item.number}`)}>
                  <ListItemText primary={item.name} secondary={item.number} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      )}
    </Box>
  );
}
