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

// Adapted from the source app's src/components/Search.tsx +
// SearchResultBox.tsx, narrowed to the two search types Accounts actually
// uses ("account", "myAccount") — the source component was generic across
// account/case/project search, but each domain in this port keeps its own
// local copy (see AccountsDataTable's header comment) rather than sharing
// one, so this only carries what Accounts needs. Rebuilt on plain MUI
// (TextField + a result list) instead of the source's Bootstrap-classed
// markup, which this app doesn't carry as a dependency — same search
// behavior (type >= 4 characters, debounce-free, name + number cards,
// click-to-navigate), different chrome.
import { useEffect, useState } from "react";
import { Box, CircularProgress, List, ListItemButton, ListItemText, Paper, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router";
import { useGetApi } from "@features/spl/api/useSplApi";
import { splBackendUrl } from "@config/apiConfig";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import type { AccountDetails } from "../api/splAccountTypes";

export default function AccountSearch({
  searchOption,
  setShowTable,
}: {
  searchOption: "account" | "myAccount";
  setShowTable?: (value: boolean) => void;
}) {
  const navigate = useNavigate();
  const user = useAsgardeoUser();
  const [inputValue, setInputValue] = useState("");

  const apiUrl =
    searchOption === "myAccount"
      ? `${splBackendUrl}/accounts?email=${encodeURIComponent(user.email ?? "")}&phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`
      : `${splBackendUrl}/accounts?phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`;

  const { data, loading, getApiData } = useGetApi<AccountDetails[]>({
    url: apiUrl,
    headers: { accept: "application/json" },
  });

  useEffect(() => {
    setShowTable?.(inputValue.length === 0);
    if (inputValue.length >= 4) getApiData(apiUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiUrl is derived from inputValue itself
  }, [inputValue]);

  return (
    <Box sx={{ maxWidth: 640, mx: "auto", mb: 2 }}>
      <TextField
        fullWidth
        placeholder="Search by Account Name"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        slotProps={{ input: { startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> } }}
      />
      {inputValue.length >= 4 && (
        <Paper variant="outlined" sx={{ mt: 1 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : !data || data.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
              No results found.
            </Typography>
          ) : (
            <List disablePadding>
              {data.map((item) => (
                <ListItemButton key={item.number} onClick={() => navigate(`/csm/accounts/${item.number}`)}>
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
