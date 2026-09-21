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

// Ported from the source app's components/Search.tsx, rebuilt on plain MUI
// (TextField) instead of Bootstrap markup — see SearchResultBox.tsx's
// comment for why. `state.email` (Asgardeo SDK) -> useAsgardeoUser().email.
import { useEffect, useState, type ChangeEvent } from "react";
import { InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAsgardeoUser } from "@hooks/useAsgardeoUser";
import { useAccessToken } from "@hooks/useAccessToken";
import { splBackendUrl, isSplBackendConfigured } from "@config/apiConfig";
import { mockSplRequest } from "@features/spl/api/splMockApi";
import { SearchResultBox } from "./SearchResultBox";
import type { CaseDetailsWithCount, AccountSummary, ProjectSummary } from "../api/splCaseTypes";

type SearchOptions = "account" | "myAccount" | "case" | "project";
type SearchResult = CaseDetailsWithCount | AccountSummary[] | ProjectSummary[];

export default function Search({
  searchOption,
  setShowTable,
}: {
  searchOption: SearchOptions;
  setShowTable?: (value: boolean) => void;
}) {
  const { email } = useAsgardeoUser();
  const getAccessToken = useAccessToken();
  const [inputValue, setInputValue] = useState("");
  const [data, setData] = useState<SearchResult>();

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    if (setShowTable) setShowTable(value.length < 4);
  };

  useEffect(() => {
    if (inputValue.length < 4) return;
    let endpoint = "";
    if (searchOption === "account") endpoint = `/accounts?phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`;
    else if (searchOption === "myAccount")
      endpoint = `/accounts?email=${encodeURIComponent(email ?? "")}&phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`;
    else if (searchOption === "case") endpoint = `/cases?phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`;
    else if (searchOption === "project") endpoint = `/projects?phrase=${encodeURIComponent(inputValue)}&offset=0&limit=10`;

    const url = `${splBackendUrl}${endpoint}`;
    let cancelled = false;

    (async () => {
      try {
        let result: SearchResult;
        if (!isSplBackendConfigured()) {
          result = mockSplRequest("GET", url) as SearchResult;
        } else {
          const token = await getAccessToken();
          const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          result = (await response.json()) as SearchResult;
        }
        if (!cancelled) setData(result);
      } catch {
        // Search is best-effort — a failed lookup just leaves the result list empty.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inputValue, searchOption, email, getAccessToken]);

  return (
    <div>
      <TextField
        fullWidth
        variant="outlined"
        placeholder={
          searchOption === "case"
            ? "Search by Case Number"
            : searchOption === "account" || searchOption === "myAccount"
              ? "Search by Account Name"
              : "Search by Project Name"
        }
        value={inputValue}
        onChange={onInputChange}
        sx={{ maxWidth: 640, mx: "auto", display: "block", "& .MuiOutlinedInput-root": { borderRadius: 8 } }}
        slotProps={{ input: { endAdornment: <InputAdornment position="end"><SearchIcon /></InputAdornment> } }}
      />
      {inputValue.length >= 4 && <SearchResultBox searchDataResponse={data} type={searchOption} />}
    </div>
  );
}
