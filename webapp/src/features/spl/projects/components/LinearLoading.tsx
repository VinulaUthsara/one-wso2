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

// Ported from SupportPortalLite's src/components/LinearLoading.tsx, scoped
// locally to the projects domain — see the note in ./DefaultTable.tsx.
import { Box, LinearProgress, Typography } from "@mui/material";

export default function LinearLoading() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Box sx={{ marginTop: "20px", width: "25%", height: "50px" }}>
        <LinearProgress
          sx={{
            width: "100%",
            backgroundColor: "#ff7300",
            "& .MuiLinearProgress-bar": { backgroundColor: "#ffd1bf" },
          }}
        />
      </Box>
      <Box sx={{ marginTop: "-20px" }}>
        <Typography variant="body1" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    </Box>
  );
}
