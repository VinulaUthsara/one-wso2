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

// Ported from the source app's components/CaseStateCard.tsx.
import { Card, CardActionArea, CardContent, CircularProgress, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import type { GetApiResponseError } from "@features/spl/api/useSplApi";
import type { CaseDetailsWithCount } from "../api/splCaseTypes";

export default function CaseStateCard({
  state,
  color,
  data,
  loading,
  error,
  setCaseState,
}: {
  state: string;
  color: string;
  data: CaseDetailsWithCount | undefined;
  loading: boolean;
  error: GetApiResponseError | undefined;
  setCaseState: (state: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card
      sx={{
        width: 290,
        height: 175,
        cursor: "pointer",
        // Same warm-orange hover identity in both modes — a solid light
        // peach reads fine on a light card but washes out a dark one, so an
        // alpha overlay (which composites against whatever's underneath)
        // stands in for the literal hex the source app used.
        "&:hover": { backgroundColor: alpha("#ff7300", theme.palette.mode === "dark" ? 0.24 : 0.35) },
        display: "flex",
        alignContent: "center",
      }}
    >
      <CardActionArea onClick={() => setCaseState(state)} disabled={loading || !!error}>
        <CardContent
          sx={{ display: "flex", justifyContent: "center", flexDirection: !error && !loading ? "column" : undefined }}
        >
          {loading ? (
            <CircularProgress color="primary" />
          ) : error ? (
            <ErrorOutlineIcon fontSize="large" color="error" />
          ) : (
            data && (
              <>
                <Typography align="center" gutterBottom variant="h3" component="div" color={color}>
                  {data.count}
                </Typography>
                <Typography align="center" gutterBottom variant="h5" component="div">
                  {state}
                </Typography>
              </>
            )
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
